/**
 * daobox-api — vocab-pwa 激活码后端
 *
 * 端点：
 *   POST /api/activate          验证激活码并绑定设备（App 解锁页调用）
 *   GET  /c/:claimToken         隐藏取码页（付款后用户打开，显示激活码 + 一键复制）
 *   POST /admin/seed            管理员：批量生成激活码
 *   GET  /admin/list            管理员：查看所有激活码和绑定情况
 *   POST /admin/unbind          管理员：手动解绑设备（用户换机超限时用）
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_DEVICES_PER_CODE = 3;

// 输错限速：连续 5 次错误 → 冷却 10 分钟；再次触发 → 冷却翻倍
const FAIL_LIMIT = 5;
const COOLDOWN_BASE_SECONDS = 10 * 60;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function genSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function genToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeCode(raw) {
  // 只留数字，兼容用户手滑加了空格或横线
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}

// ---------- 限速 ----------

async function checkBlocked(db, key) {
  const row = await db
    .prepare('SELECT blocked_until FROM attempts WHERE key = ?')
    .bind(key)
    .first();
  if (row && row.blocked_until > Date.now()) {
    const waitSeconds = Math.ceil((row.blocked_until - Date.now()) / 1000);
    return { blocked: true, waitSeconds };
  }
  return { blocked: false };
}

async function recordFail(db, key) {
  const now = Date.now();
  const row = await db
    .prepare('SELECT fails, blocked_until, level FROM attempts WHERE key = ?')
    .bind(key)
    .first();

  if (!row) {
    await db
      .prepare('INSERT INTO attempts (key, fails, blocked_until, level) VALUES (?, 1, 0, 0)')
      .bind(key)
      .run();
    return;
  }

  // 若冷却已过期，先重置 fails 再累计
  const fails = (row.blocked_until > 0 && row.blocked_until < now) ? 1 : row.fails + 1;
  const level = (row.blocked_until > 0 && row.blocked_until < now) ? row.level : row.level;

  if (fails >= FAIL_LIMIT) {
    const newLevel = level + 1;
    const cooldownMs = COOLDOWN_BASE_SECONDS * 1000 * Math.pow(2, newLevel - 1);
    await db
      .prepare('UPDATE attempts SET fails = 0, blocked_until = ?, level = ? WHERE key = ?')
      .bind(now + cooldownMs, newLevel, key)
      .run();
  } else {
    await db
      .prepare('UPDATE attempts SET fails = ?, level = ? WHERE key = ?')
      .bind(fails, level, key)
      .run();
  }
}

async function clearFails(db, key) {
  await db.prepare('DELETE FROM attempts WHERE key = ?').bind(key).run();
}

// ---------- 取码页 ----------

function codePageHtml(code) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>你的激活码</title>
<style>
  body { font-family: -apple-system, "PingFang SC", sans-serif; background: #f7f6f2;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #fff; border-radius: 16px; padding: 40px 32px; text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 360px; width: 90%; }
  h1 { font-size: 18px; color: #333; margin: 0 0 8px; }
  .sub { font-size: 13px; color: #999; margin: 0 0 24px; }
  .code { font-size: 40px; letter-spacing: 8px; font-weight: 700; color: #1a1a1a;
          font-variant-numeric: tabular-nums; margin-bottom: 24px; user-select: all; }
  button { background: #2f6fed; color: #fff; border: none; border-radius: 10px;
           padding: 12px 32px; font-size: 16px; cursor: pointer; }
  button:active { opacity: 0.8; }
  .tip { font-size: 12px; color: #c0392b; margin-top: 20px; line-height: 1.6; }
</style>
</head>
<body>
<div class="card">
  <h1>支付成功 🎉</h1>
  <p class="sub">这是你的专属激活码</p>
  <div class="code" id="code">${code}</div>
  <button onclick="copyCode()">一键复制</button>
  <p class="tip">请务必截图保存本页！<br>激活码是你的购买凭证，<br>清除数据 / 更换设备后，重新输入此码即可再次解锁，无需重复购买。</p>
</div>
<script>
function copyCode() {
  const code = document.getElementById('code').textContent.trim();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => alert('已复制：' + code));
  } else {
    const ta = document.createElement('textarea');
    ta.value = code; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    alert('已复制：' + code);
  }
}
</script>
</body>
</html>`;
}

// ---------- 路由 ----------

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ---- 隐藏取码页 ----
    if (request.method === 'GET' && path.startsWith('/c/')) {
      const token = path.slice(3);
      const row = await env.DB
        .prepare('SELECT code FROM codes WHERE claim_token = ?')
        .bind(token)
        .first();
      if (!row) {
        return new Response('链接无效或已过期', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      return new Response(codePageHtml(row.code), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // ---- 激活验证 ----
    if (request.method === 'POST' && path === '/api/activate') {
      const body = await request.json().catch(() => ({}));
      const code = normalizeCode(body.code);
      const deviceId = String(body.deviceId || '').slice(0, 128);

      if (!code || !deviceId) {
        return json({ ok: false, error: '参数不完整' }, 400);
      }

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const limitKey = `${ip}:${deviceId}`;

      const gate = await checkBlocked(env.DB, limitKey);
      if (gate.blocked) {
        return json({
          ok: false,
          error: `尝试次数过多，请 ${Math.ceil(gate.waitSeconds / 60)} 分钟后再试`,
          blocked: true,
          waitSeconds: gate.waitSeconds,
        }, 429);
      }

      const codeRow = await env.DB
        .prepare('SELECT code, status FROM codes WHERE code = ?')
        .bind(code)
        .first();

      if (!codeRow) {
        await recordFail(env.DB, limitKey);
        return json({ ok: false, error: '激活码不存在，请核对后重试' }, 404);
      }

      const bound = await env.DB
        .prepare('SELECT device_id FROM bindings WHERE code = ?')
        .bind(code)
        .all();

      const deviceIds = (bound.results || []).map((r) => r.device_id);

      // 已绑定本设备 → 直接通过（清数据/换档案重新激活的场景）
      if (deviceIds.includes(deviceId)) {
        await clearFails(env.DB, limitKey);
        return json({ ok: true, plan: 'all', message: '已解锁' });
      }

      if (deviceIds.length >= MAX_DEVICES_PER_CODE) {
        return json({
          ok: false,
          error: `该激活码已绑定 ${MAX_DEVICES_PER_CODE} 台设备，请联系管理员解绑`,
          limitReached: true,
        }, 403);
      }

      // 绑定新设备
      await env.DB
        .prepare('INSERT INTO bindings (code, device_id, bound_at) VALUES (?, ?, ?)')
        .bind(code, deviceId, Date.now())
        .run();
      await env.DB
        .prepare("UPDATE codes SET status = 'used', claimed_at = ? WHERE code = ? AND status = 'unused'")
        .bind(Date.now(), code)
        .run();
      await clearFails(env.DB, limitKey);

      return json({ ok: true, plan: 'all', message: '已解锁' });
    }

    // ---- 管理接口 ----
    if (path.startsWith('/admin/')) {
      const key = url.searchParams.get('key') || request.headers.get('X-Admin-Key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
        return json({ ok: false, error: '无权限' }, 401);
      }

      // 批量生成激活码
      if (request.method === 'POST' && path === '/admin/seed') {
        const count = Math.min(parseInt(url.searchParams.get('count') || '100', 10), 2000);
        const stmts = [];
        const results = [];

        for (let i = 0; i < count; i++) {
          let code;
          // 生成不重复的码
          for (let tries = 0; tries < 20; tries++) {
            code = genSixDigitCode();
            const exists = await env.DB
              .prepare('SELECT 1 FROM codes WHERE code = ?')
              .bind(code)
              .first();
            if (!exists) break;
          }
          const token = genToken();
          stmts.push(
            env.DB
              .prepare('INSERT INTO codes (code, claim_token, status, created_at) VALUES (?, ?, ?, ?)')
              .bind(code, token, 'unused', Date.now())
          );
          results.push({ code, link: `${url.origin}/c/${token}` });
        }

        await env.DB.batch(stmts);
        return json({ ok: true, generated: results.length, codes: results });
      }

      // 查看所有码
      if (request.method === 'GET' && path === '/admin/list') {
        const codes = await env.DB
          .prepare(`
            SELECT c.code, c.status, c.created_at, c.claimed_at, c.claim_token,
                   GROUP_CONCAT(b.device_id) AS devices
            FROM codes c
            LEFT JOIN bindings b ON b.code = c.code
            GROUP BY c.code
            ORDER BY c.created_at DESC
          `)
          .all();
        return json({ ok: true, codes: codes.results });
      }

      // 手动解绑
      if (request.method === 'POST' && path === '/admin/unbind') {
        const body = await request.json().catch(() => ({}));
        const code = normalizeCode(body.code);
        const deviceId = String(body.deviceId || '');
        if (!code || !deviceId) return json({ ok: false, error: '参数不完整' }, 400);
        await env.DB
          .prepare('DELETE FROM bindings WHERE code = ? AND device_id = ?')
          .bind(code, deviceId)
          .run();
        return json({ ok: true, message: '已解绑' });
      }
    }

    return json({ ok: false, error: 'Not found' }, 404);
  },
};
