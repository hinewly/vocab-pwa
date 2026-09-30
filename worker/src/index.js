/**
 * daobox-api — vocab-pwa 激活码 + 付款登记后端
 *
 * 用户侧端点：
 *   POST /api/activate            验证激活码并绑定设备（App 解锁页调用）
 *   POST /api/order               付款登记 { contact } → 返回取码页地址
 *   GET  /api/order/status?token= 取码页轮询订单状态
 *   GET  /o/:token                取码页（确认前显示"确认中"，确认后显示激活码）
 *   GET  /c/:claimToken           直接取码页（预生成码的隐藏链接）
 *
 * 管理侧端点（?key=ADMIN_KEY）：
 *   GET  /admin                   管理台页面（手机可用）
 *   POST /admin/seed              批量生成激活码
 *   GET  /admin/list              查看所有激活码和绑定
 *   GET  /admin/orders            查看订单
 *   POST /admin/confirm           确认订单 { orderId } → 自动分配激活码
 *   POST /admin/unbind            手动解绑设备 { code, deviceId }
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const MAX_DEVICES_PER_CODE = 3;
const FAIL_LIMIT = 5;
const COOLDOWN_BASE_SECONDS = 10 * 60;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function genSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function genToken(bytes = 12) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeCode(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}

function normalizeContact(raw) {
  const s = String(raw || '').trim().slice(0, 64);
  return s.length >= 4 ? s : null;
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

  const resetCycle = row.blocked_until > 0 && row.blocked_until < now;
  const fails = resetCycle ? 1 : row.fails + 1;

  if (fails >= FAIL_LIMIT) {
    const newLevel = resetCycle ? row.level + 1 : row.level + 1;
    const cooldownMs = COOLDOWN_BASE_SECONDS * 1000 * Math.pow(2, newLevel - 1);
    await db
      .prepare('UPDATE attempts SET fails = 0, blocked_until = ?, level = ? WHERE key = ?')
      .bind(now + cooldownMs, newLevel, key)
      .run();
  } else {
    await db
      .prepare('UPDATE attempts SET fails = ?, level = ? WHERE key = ?')
      .bind(fails, row.level, key)
      .run();
  }
}

async function clearFails(db, key) {
  await db.prepare('DELETE FROM attempts WHERE key = ?').bind(key).run();
}

// ---------- 页面模板 ----------

function codePageHtml(code, title = '支付成功 🎉') {
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
  <h1>${title}</h1>
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

function orderPageHtml(token) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>取码中心</title>
<style>
  body { font-family: -apple-system, "PingFang SC", sans-serif; background: #f7f6f2;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #fff; border-radius: 16px; padding: 40px 32px; text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 360px; width: 90%; }
  h1 { font-size: 18px; color: #333; margin: 0 0 8px; }
  .sub { font-size: 13px; color: #999; margin: 0 0 16px; line-height: 1.7; }
  .mail { font-size: 13px; color: #888; margin-top: 20px; line-height: 1.8; }
  .mail a { color: #2f6fed; }
  .spin { display: inline-block; width: 28px; height: 28px; border: 3px solid #eee;
          border-top-color: #2f6fed; border-radius: 50%; animation: r 0.8s linear infinite; }
  @keyframes r { to { transform: rotate(360deg); } }
  .code { font-size: 40px; letter-spacing: 8px; font-weight: 700; color: #1a1a1a;
          font-variant-numeric: tabular-nums; margin: 16px 0 24px; user-select: all; }
  button { background: #2f6fed; color: #fff; border: none; border-radius: 10px;
           padding: 12px 32px; font-size: 16px; cursor: pointer; }
  .tip { font-size: 12px; color: #c0392b; margin-top: 20px; line-height: 1.6; }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="card">
  <div id="waiting">
    <h1>⏳ 支付确认中…</h1>
    <p class="sub">管理员确认收款后，本页会自动显示你的专属激活码。<br>确认可能需要几个小时，你可以先离开，<br>过一段时间回到本页查看即可（本页长期有效）。<br><b>请先收藏 / 截图保存本页！</b></p>
    <p class="mail">超过 24 小时仍未显示激活码？<br>请发邮件至 <a href="mailto:hinewly@163.com">hinewly@163.com</a> 联系我们。</p>
    <div class="spin"></div>
  </div>
  <div id="done" class="hidden">
    <h1>支付确认成功 🎉</h1>
    <p class="sub">这是你的专属激活码</p>
    <div class="code" id="code"></div>
    <button onclick="copyCode()">一键复制</button>
    <p class="tip">收到激活码后，请先收藏本页、截图保存！<br>激活码是你的购买凭证，永久有效。<br>清除数据 / 更换设备后，在 App 解锁页重新输入此码即可，无需重复购买。</p>
  </div>
</div>
<script>
const token = '${token}';
async function poll() {
  try {
    const r = await fetch('/api/order/status?token=' + token);
    const d = await r.json();
    if (d.status === 'paid' && d.code) {
      document.getElementById('waiting').classList.add('hidden');
      document.getElementById('done').classList.remove('hidden');
      document.getElementById('code').textContent = d.code;
      clearInterval(timer);
    }
  } catch (e) {}
}
const timer = setInterval(poll, 15000);
poll();
function copyCode() {
  const code = document.getElementById('code').textContent.trim();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => alert('已复制：' + code));
  }
}
</script>
</body>
</html>`;
}

function adminPageHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DaoBox 管理台</title>
<style>
  body { font-family: -apple-system, "PingFang SC", sans-serif; background: #f2f4f7; margin: 0; padding: 16px; }
  h1 { font-size: 20px; } h2 { font-size: 16px; margin: 24px 0 8px; }
  .card { background: #fff; border-radius: 12px; padding: 14px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .row { display: flex; align-items: center; gap: 8px; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; flex-wrap: wrap; }
  .row:last-child { border-bottom: none; }
  .muted { color: #999; font-size: 12px; }
  button { border: none; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
  .ok { background: #16a34a; color: #fff; }
  .blue { background: #2f6fed; color: #fff; }
  .ghost { background: #eef1f5; color: #555; }
  .ghost.on { background: #2f6fed; color: #fff; }
  textarea { width: 100%; height: 120px; font-size: 11px; margin-top: 8px; }
  .stat { font-size: 14px; color: #555; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { padding: 6px 4px; border-bottom: 1px solid #f0f0f0; text-align: left; }
  th { color: #888; font-weight: 500; font-size: 12px; }
  td.mono { font-variant-numeric: tabular-nums; letter-spacing: 1px; font-weight: 600; }
  tr.used td { color: #c0392b; }
  tr.used td.mono { text-decoration: line-through; }
  .tag { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 11px; }
  .tag.unused { background: #e7f5ec; color: #16a34a; }
  .tag.used { background: #fdecea; color: #c0392b; }
  .copy { background: #eef1f5; color: #2f6fed; padding: 4px 10px; font-size: 12px; border-radius: 6px; }
  .filter { display: flex; gap: 8px; margin-bottom: 10px; }
  .filter button { padding: 5px 14px; font-size: 13px; }
</style>
</head>
<body>
<h1>DaoBox 管理台</h1>
<h2>待确认订单</h2>
<div id="pending" class="card"><span class="muted">加载中…</span></div>
<h2>激活码统计</h2>
<div id="stats" class="card"><span class="muted">加载中…</span></div>
<h2>生成激活码</h2>
<div class="card">
  <button class="blue" onclick="seed()">＋ 生成 100 个新码</button>
  <textarea id="seedout" placeholder="生成后这里显示所有取码链接，长按全选复制保存" readonly></textarea>
</div>
<h2>激活码明细</h2>
<div class="card">
  <div class="filter">
    <button class="ghost" data-f="all" onclick="setFilter('all', this)">全部</button>
    <button class="ghost" data-f="unused" onclick="setFilter('unused', this)">未用</button>
    <button class="ghost" data-f="used" onclick="setFilter('used', this)">已用</button>
  </div>
  <div id="codetable"><span class="muted">加载中…</span></div>
  <p class="muted" style="margin-top:8px">点「复制链接」可复制该码的取码页链接（发给付款用户）。已用 = 红色划线。</p>
</div>
<script>
const KEY = new URLSearchParams(location.search).get('key');
const ORIGIN = location.origin;
let ALLCODES = [];
let FILTER = 'all';
const fmt = (t) => new Date(t).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s || '').replace(/[<>&"]/g, '');

async function load() {
  const [ord, codes] = await Promise.all([
    fetch('/admin/orders?key=' + KEY).then(r => r.json()),
    fetch('/admin/list?key=' + KEY).then(r => r.json()),
  ]);
  const orders = (ord.orders || []).slice().sort((a, b) => b.created_at - a.created_at);
  const pending = orders.filter(o => o.status === 'pending');
  const paid = orders.filter(o => o.status === 'paid');

  document.getElementById('pending').innerHTML = pending.length === 0
    ? '<span class="muted">暂无待确认订单 ✅</span>'
    : pending.map(o =>
        '<div class="row"><b>' + esc(o.contact) + '</b>' +
        '<span class="muted">' + fmt(o.created_at) + '</span>' +
        '<button class="ok" onclick="confirmOrder(\\'' + o.id + '\\')">确认收款</button></div>'
      ).join('') +
      (paid.length ? '<div class="muted" style="margin-top:10px">最近已确认：' +
        paid.slice(0, 5).map(o => esc(o.contact) + ' → ' + (o.code || '?')).join('，') + '</div>' : '');

  ALLCODES = (codes.codes || []);
  ALLCODES.sort((a, b) => (a.status === b.status) ? (b.created_at - a.created_at) : (a.status === 'used' ? -1 : 1));
  const used = ALLCODES.filter(c => c.status === 'used').length;
  document.getElementById('stats').innerHTML =
    '<span class="stat">共 ' + ALLCODES.length + ' 个码 · 已用 ' + used + ' · 剩余 ' + (ALLCODES.length - used) + '</span>' +
    '<div class="muted">已用码：' + ALLCODES.filter(c => c.status === 'used').map(c => c.code).join('，') + '</div>';
  renderTable();
}

function setFilter(f, btn) {
  FILTER = f;
  document.querySelectorAll('.filter button').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderTable();
}

function renderTable() {
  const list = ALLCODES.filter(c => FILTER === 'all' || c.status === FILTER);
  if (list.length === 0) {
    document.getElementById('codetable').innerHTML = '<span class="muted">该分类下暂无激活码</span>';
    return;
  }
  const rows = list.map((c, i) => {
    const devCount = c.devices ? c.devices.split(',').filter(Boolean).length : 0;
    const link = ORIGIN + '/c/' + c.claim_token;
    return '<tr class="' + c.status + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td class="mono">' + c.code + '</td>' +
      '<td><span class="tag ' + c.status + '">' + (c.status === 'used' ? '已用' : '未用') + '</span></td>' +
      '<td>' + devCount + '/3</td>' +
      '<td class="muted">' + fmt(c.created_at) + '</td>' +
      '<td><button class="copy" onclick="copyLink(\\'' + link + '\\')">复制链接</button></td>' +
      '</tr>';
  }).join('');
  document.getElementById('codetable').innerHTML =
    '<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>激活码</th><th>状态</th><th>设备</th><th>生成时间</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function copyLink(link) {
  const done = () => alert('取码链接已复制，可直接发给用户');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(done);
  } else {
    const ta = document.createElement('textarea');
    ta.value = link; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    done();
  }
}

async function confirmOrder(id) {
  if (!confirm('确认这笔款已收到？')) return;
  try {
    const r = await fetch('/admin/confirm?key=' + KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: id }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.ok) { alert('已确认，分配激活码：' + d.code); }
    else { alert('确认失败：' + (d.error || '未知错误')); }
  } catch (e) { alert('网络异常，请重试'); }
  load();
}

async function seed() {
  if (!confirm('生成 100 个新激活码？')) return;
  const r = await fetch('/admin/seed?key=' + KEY + '&count=100', { method: 'POST' });
  const d = await r.json();
  document.getElementById('seedout').value = (d.codes || []).map(c => c.code + '  ' + c.link).join('\\n');
  load();
}

load();
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

    // ---- 隐藏取码页（预生成码） ----
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

    // ---- 订单取码页 ----
    if (request.method === 'GET' && path.startsWith('/o/')) {
      const token = path.slice(3);
      const row = await env.DB
        .prepare('SELECT id FROM orders WHERE token = ?')
        .bind(token)
        .first();
      if (!row) {
        return new Response('链接无效或已过期', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
      return new Response(orderPageHtml(token), {
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

    // ---- 付款登记 ----
    if (request.method === 'POST' && path === '/api/order') {
      const body = await request.json().catch(() => ({}));
      const contact = normalizeContact(body.contact);
      if (!contact) {
        return json({ ok: false, error: '请填写有效的手机号或微信号' }, 400);
      }
      const id = genToken(6);
      const token = genToken(12);
      await env.DB
        .prepare('INSERT INTO orders (id, token, contact, status, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(id, token, contact, 'pending', Date.now())
        .run();
      return json({ ok: true, orderId: id, checkUrl: `${url.origin}/o/${token}` });
    }

    // ---- 订单状态轮询 ----
    if (request.method === 'GET' && path === '/api/order/status') {
      const token = url.searchParams.get('token') || '';
      const row = await env.DB
        .prepare('SELECT status, code FROM orders WHERE token = ?')
        .bind(token)
        .first();
      if (!row) return json({ ok: false, error: '订单不存在' }, 404);
      return json({ ok: true, status: row.status, code: row.status === 'paid' ? row.code : undefined });
    }

    // ---- 管理接口 ----
    if (path === '/admin' || path.startsWith('/admin/')) {
      const key = url.searchParams.get('key') || request.headers.get('X-Admin-Key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
        return json({ ok: false, error: '无权限' }, 401);
      }

      if (request.method === 'GET' && path === '/admin') {
        return new Response(adminPageHtml(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      if (request.method === 'POST' && path === '/admin/confirm') {
        const body = await request.json().catch(() => ({}));
        const orderId = String(body.orderId || '');
        const order = await env.DB
          .prepare("SELECT id, status FROM orders WHERE id = ? AND status = 'pending'")
          .bind(orderId)
          .first();
        if (!order) return json({ ok: false, error: '订单不存在或已确认' }, 404);

        const unused = await env.DB
          .prepare("SELECT code, claim_token FROM codes WHERE status = 'unused' LIMIT 1")
          .first();
        if (!unused) return json({ ok: false, error: '激活码已用完，请先生成新码' }, 500);

        const now = Date.now();
        await env.DB.batch([
          env.DB.prepare("UPDATE codes SET status = 'used', claimed_at = ? WHERE code = ?").bind(now, unused.code),
          env.DB.prepare("UPDATE orders SET status = 'paid', code = ?, paid_at = ? WHERE id = ?").bind(unused.code, now, orderId),
        ]);
        return json({ ok: true, code: unused.code, link: `${url.origin}/c/${unused.claim_token}` });
      }

      if (request.method === 'GET' && path === '/admin/orders') {
        const rows = await env.DB
          .prepare('SELECT id, contact, status, code, created_at, paid_at FROM orders ORDER BY created_at DESC LIMIT 200')
          .all();
        return json({ ok: true, orders: rows.results });
      }

      if (request.method === 'POST' && path === '/admin/seed') {
        const count = Math.min(parseInt(url.searchParams.get('count') || '100', 10), 2000);
        const stmts = [];
        const results = [];
        for (let i = 0; i < count; i++) {
          let code;
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
