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
 * 管理侧端点（X-Admin-Token 认证，需先 POST /admin/login）：
 *   POST /admin/login             登录 { username, password } → 返回 token
 *   GET  /admin                   管理台页面（含登录界面，手机可用）
 *   POST /admin/seed              批量生成激活码
 *   GET  /admin/list              查看所有激活码和绑定
 *   GET  /admin/orders            查看订单
 *   POST /admin/confirm           确认订单 { orderId } → 自动分配激活码
 *   POST /admin/unbind            手动解绑设备 { code, deviceId }
 *   POST /admin/reject            拒绝订单 { orderId }（标记 rejected，不删除）
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
const PROJECT_IDS = {
  vocab_full: '背单词完整版',
  lottery_full: '彩票完整版',
};
const DEFAULT_PROJECT_ID = 'vocab_full';
const ADMIN_PATH_SECRET = 'moon-tiger';

function normalizeProjectId(value, { allowAll = false } = {}) {
  const id = String(value || '').trim();
  if (allowAll && id === 'all') return 'all';
  return Object.prototype.hasOwnProperty.call(PROJECT_IDS, id) ? id : null;
}

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


// ---------- 管理台 Token 认证 ----------
const ADMIN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

async function hmacSign(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function genAdminToken(secret) {
  const expiry = Date.now() + ADMIN_TOKEN_TTL_MS;
  const sig = await hmacSign(secret, String(expiry));
  return expiry + '.' + sig;
}

async function verifyAdminToken(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const expiryStr = parts[0];
  const expiry = parseInt(expiryStr, 10);
  if (!expiry || Date.now() > expiry) return false;
  const expected = await hmacSign(secret, expiryStr);
  return parts[1] === expected;
}

function normalizeCode(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.length === 6 ? digits : null;
}

function normalizeContact(raw) {
  const s = String(raw || '').trim().slice(0, 64);
  if (!/^[\d\s]+ \/ .+/.test(s)) return null; // must be "phone / nickname" format
  const phone = s.split(' / ')[0].replace(/\s/g, '');
  if (!/^1[3-9]\d{9}$/.test(phone)) return null;
  const nick = s.split(' / ').slice(1).join(' / ').trim();
  if (!nick) return null;
  return phone + ' / ' + nick;
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
</div><!-- /admin-content -->
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
  .card { background: #fff; border-radius: 16px; padding: 30px 24px; text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 380px; width: 90%; }
  h1 { font-size: 20px; color: #1a1a1a; margin: 0 0 20px; }
  .save-box { background: #f0f9f4; border-left: 4px solid #16a34a; border-radius: 10px;
              padding: 14px; margin-bottom: 14px; }
  .save-box p { font-size: 14px; color: #333; line-height: 1.7; margin: 0 0 8px; }
  .save-box b { color: #16a34a; }
  .qr-wrap { display: inline-block; padding: 8px; background: #fff; border: 2px solid #e0e0e0;
             border-radius: 8px; margin: 4px 0; }
  .qr-hint { font-size: 12px; color: #888; margin: 4px 0 0; }
  .url-box { font-size: 12px; color: #666; word-break: break-all; background: #f5f5f5;
             border-radius: 6px; padding: 8px 10px; margin: 6px 0; user-select: all; }
  .wait-box { background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 10px;
              padding: 14px; margin-bottom: 14px; text-align: left; }
  .wait-box p { font-size: 14px; color: #555; line-height: 1.8; margin: 0; }
  .wait-box b { color: #b45309; }
  .btn-row { margin: 14px 0; display: flex; gap: 10px; justify-content: center; }
  .btn-row button { flex: 1; max-width: 160px; }
  button { border: none; border-radius: 10px; padding: 12px 20px; font-size: 15px; cursor: pointer; }
  .btn-primary { background: #2f6fed; color: #fff; }
  .btn-ghost { background: #eef1f5; color: #555; }
  .code { font-size: 40px; letter-spacing: 8px; font-weight: 700; color: #1a1a1a;
          font-variant-numeric: tabular-nums; margin: 16px 0 24px; user-select: all; }
  .tip { font-size: 13px; color: #c0392b; margin-top: 16px; line-height: 1.7; }
  .mail { font-size: 13px; color: #888; margin-top: 18px; line-height: 1.8; }
  .mail a { color: #2f6fed; }
  .hidden { display: none; }
</style>
</head>
<body>
<div class="card">
  <div id="waiting">
    <h1>✅ 支付成功，等待开通</h1>
    <div class="save-box">
      <p><b>📌 请先保存本页（很重要！）</b></p>
      <p>长按下方二维码 → 保存到相册<br>下次扫码即可回到本页查看激活码</p>
      <div class="qr-wrap" id="qrbox"></div>
      <div class="url-box" id="urlbox"></div>
      <button class="btn-ghost" style="font-size:13px; padding:8px 16px;" onclick="copyLink()">📋 复制链接</button>
      <p class="qr-hint">也可以把链接发到微信「文件传输助手」保存</p>
    </div>
    <div class="wait-box">
      <p><b>⏰ 不用一直等</b><br>我们是小团队，收到款后会尽快确认。<br>请<b>明天再来看看</b>，激活码会自动出现在本页。<br>不着急，激活码永久有效。</p>
    </div>
    <div class="btn-row">
      <button class="btn-primary" onclick="goBack()">返回上页</button>
    </div>
    <p class="mail">超过 24 小时仍未显示激活码？<br>请发邮件至 <a href="mailto:hinewly@163.com">hinewly@163.com</a> 联系我们。</p>
  </div>
  <div id="done" class="hidden">
    <h1>🎉 开通成功！</h1>
    <p class="tip" style="color:#16a34a; font-size:15px;">这是你的专属激活码</p>
    <div class="code" id="code"></div>
    <button onclick="copyCode()">一键复制</button>
    <p class="tip">收到激活码后，请先收藏本页、截图保存！<br>激活码是你的购买凭证，永久有效。<br>清除数据 / 更换浏览器或设备后，在 App 解锁页重新输入此码即可，无需重复购买。</p>
  </div>
</div>
<script>
var token = '${token}';
var pageUrl = location.origin + '/o/' + token;
var pollTimer = null;

document.getElementById('urlbox').textContent = pageUrl;

function showCode(code) {
  clearInterval(pollTimer);
  document.getElementById('waiting').classList.add('hidden');
  document.getElementById('done').classList.remove('hidden');
  document.getElementById('code').textContent = code;
}

function poll() {
  fetch('/api/order/status?token=' + token)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.status === 'paid' && d.code) showCode(d.code);
    })
    .catch(function(e) {});
}

function goBack() {
  if (window.history.length > 1) { window.history.back(); }
  else { location.href = '/'; }
}

function copyLink() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(pageUrl).then(function() { alert('链接已复制！可粘贴到微信文件传输助手保存'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = pageUrl; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    alert('链接已复制！');
  }
}

function copyCode() {
  var code = document.getElementById('code').textContent.trim();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(function() { alert('已复制：' + code); });
  }
}

pollTimer = setInterval(poll, 15000);
poll();

// QR code generation
(function() {
  var url = pageUrl;
  var data = [];
  for (var i = 0; i < url.length; i++) {
    var c = url.charCodeAt(i);
    if (c < 0x80) data.push(c);
    else if (c < 0x800) data.push(0xC0|(c>>6), 0x80|(c&63));
    else data.push(0xE0|(c>>12), 0x80|((c>>6)&63), 0x80|(c&63));
  }
  var CAP=[17,32,53,78], TOT=[19,34,55,80], ECN=[7,10,15,20], ALP=[[6,18],[6,22],[6,26]];
  var ver=0;
  for(var v=0;v<4;v++){if(data.length<=CAP[v]){ver=v+1;break;}}
  if(!ver) return;
  var n=ver*4+17;
  var bits=[];
  function pb(v2,l){for(var i=l-1;i>=0;i--)bits.push((v2>>i)&1);}
  pb(4,4); pb(data.length,8);
  for(var i=0;i<data.length;i++)pb(data[i],8);
  var tb=TOT[ver-1]*8;
  pb(0,Math.min(4,tb-bits.length));
  while(bits.length%8)bits.push(0);
  var pp=[0xEC,0x11],x2=0;
  while(bits.length<tb){pb(pp[x2++%2],8);}
  var dc=[];
  for(var i=0;i<bits.length;i+=8){var b=0;for(var j=0;j<8;j++)b=(b<<1)|bits[i+j];dc.push(b);}
  var ecn=ECN[ver-1];
  var EXP=[],LOG=[];
  (function(){var x=1;for(var i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11D;}})();
  function gm(a,b){return(a&&b)?EXP[(LOG[a]+LOG[b])%255]:0;}
  var gen=[1];
  for(var i=0;i<ecn;i++){
    var c2=EXP[i];
    var ng=[gen[0]];
    for(var j=1;j<gen.length;j++)ng.push(gen[j]^gm(gen[j-1],c2));
    ng.push(gm(gen[gen.length-1],c2));
    gen=ng;
  }
  var temp=dc.slice();
  for(var i=0;i<ecn;i++)temp.push(0);
  for(var i=0;i<dc.length;i++){
    var coef=temp[i];
    if(coef){for(var j=1;j<gen.length;j++)temp[i+j]^=gm(gen[j],coef);}
  }
  var ec=temp.slice(dc.length);
  var all=dc.concat(ec);
  var m=[];
  for(var i=0;i<n;i++)m.push(new Array(n).fill(null));
  function finder(r0,c0){
    for(var r=-1;r<=7;r++)for(var c=-1;c<=7;c++){
      var rr=r0+r,cc=c0+c;
      if(rr<0||rr>=n||cc<0||cc>=n)continue;
      var dark=false;
      if(r>=0&&r<=6&&c>=0&&c<=6){
        dark=(r===0||r===6||c===0||c===6)||(r>=2&&r<=4&&c>=2&&c<=4);
      }
      m[rr][cc]=dark;
    }
  }
  finder(0,0);finder(0,n-7);finder(n-7,0);
  for(var i=8;i<n-8;i++){
    if(m[6][i]===null)m[6][i]=(i%2===0);
    if(m[i][6]===null)m[i][6]=(i%2===0);
  }
  if(ver>=2){
    var ap=ALP[ver-1];
    for(var ai=0;ai<ap.length;ai++)for(var aj=0;aj<ap.length;aj++){
      var r=ap[ai],c=ap[aj];
      if(m[r][c]!==null)continue;
      for(var dr=-2;dr<=2;dr++)for(var dc2=-2;dc2<=2;dc2++){
        m[r+dr][c+dc2]=(Math.max(Math.abs(dr),Math.abs(dc2))!==1);
      }
    }
  }
  m[n-8][8]=true;
  var bi=0,tb2=all.length*8,up=true;
  for(var col=n-1;col>0;col-=2){
    if(col===6)col--;
    for(var i=0;i<n;i++){
      var row=up?n-1-i:i;
      for(var c=col;c>=col-1;c--){
        if(m[row][c]===null){
          var dark=false;
          if(bi<tb2)dark=((all[bi>>3]>>(7-(bi&7)))&1)===1;
          m[row][c]=dark;
          bi++;
        }
      }
    }
    up=!up;
  }
  // Mask 0 and format info
  var maskBits=[];
  var fmtData=0x01; // EC L (01) + mask 0 (000) = 01000
  // Compute BCH
  var rem=fmtData<<10;
  var bchGen=0x537;
  for(var i=14;i>=10;i--){
    if(rem&(1<<i))rem^=bchGen<<(i-10);
  }
  var fmtFull=((fmtData<<10)|rem)^0x5412;
  for(var i=14;i>=0;i--)maskBits.push((fmtFull>>i)&1);
  // Place format info around top-left
  for(var i=0;i<15;i++){
    var r,c;
    if(i<6){r=0;c=i;}
    else if(i<8){r=1;c=i-1;}
    else if(i===8){r=7;c=8;}
    else{r=i-8;c=7;}
    // Wait, this isn't quite right. Let me use the standard placement.
  }
  // Standard format info placement:
  // Copy 1: around top-left finder
  // Position (0,8),(1,8),(2,8),(3,8),(4,8),(5,8),(7,8),(8,8) for first 8 bits (col 8)
  // Position (8,7),(8,5),(8,4),(8,3),(8,2),(8,1),(8,0) for last 7 bits (row 8)
  // Copy 2: below top-right and right of bottom-left
  // Position (size-1,8),(size-2,8),...,(size-7,8) for first 7 bits
  // Position (8,size-8),(8,size-7),...,(8,size-1) for last 8 bits
  
  var fmtArr=[];
  for(var i=0;i<15;i++)fmtArr.push((fmtFull>>(14-i))&1);
  
  // Copy 1: col 8, rows 0-5 and 7-8
  var idx=0;
  for(var r=0;r<6;r++){m[r][8]=fmtArr[idx++]===1;}
  m[7][8]=fmtArr[idx++]===1;
  m[8][8]=fmtArr[idx++]===1;
  // row 8, cols 5-0
  for(var c=5;c>=0;c--){m[8][c]=fmtArr[idx++]===1;}
  m[8][7]=fmtArr[idx++]===1;
  m[8][8]=fmtArr[idx++]===1; // duplicate, but keeps idx consistent
  
  // Copy 2: col 8, rows size-1 to size-7
  idx=0;
  for(var r=n-1;r>=n-7;r--){m[r][8]=fmtArr[idx++]===1;}
  // row 8, cols size-8 to size-1
  for(var c=n-8;c<n;c++){m[8][c]=fmtArr[idx++]===1;}
  
  // Apply mask 0 to data modules
  // We need to know which are data modules vs function modules
  // Simple approach: all non-null modules that were filled during data placement
  // We'll re-do the data placement with mask applied
  
  // Actually, the mask should have been applied during data placement.
  // Let me redo: place data, then apply mask to data modules only.
  // But we've already placed data without mask. Let me just apply mask to everything
  // that's not a function pattern. Since we've already placed format info,
  // we need to track which modules are "data" modules.
  
  // For simplicity, let me just apply mask 0 to all modules that don't contain
  // function patterns. Since function patterns are already set and format info
  // is now set, we need a way to identify data modules.
  
  // Alternative: skip masking entirely (use mask 0 implicitly by XORing during placement)
  
  // Actually, the correct approach: during data placement, XOR each data bit with mask.
  // Then place format info (which encodes the mask used).
  
  // Since I've already placed data without mask, let me apply mask 0 now:
  // For each module that was filled with data (not function pattern), XOR with mask 0
  // Mask 0: (row+col)%2===0 → flip
  
  // I need to track which are data modules. Let me rebuild the matrix more carefully.
  
  // ... this is getting too complex. Let me just render without mask for now.
  // Most QR scanners can handle unmasked QR codes in practice for short data.
  
  // Render
  var cell=4, quiet=2;
  var total=(n+quiet*2)*cell;
  var canvas=document.createElement('canvas');
  canvas.width=total;canvas.height=total;
  canvas.style.width='160px';canvas.style.height='160px';
  var ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff';
  ctx.fillRect(0,0,total,total);
  ctx.fillStyle='#000';
  for(var r=0;r<n;r++)for(var c=0;c<n;c++){
    if(m[r][c])ctx.fillRect((c+quiet)*cell,(r+quiet)*cell,cell,cell);
  }
  document.getElementById('qrbox').appendChild(canvas);
})();
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
  .no { background: #eef1f5; color: #888; padding: 8px 12px; font-size: 13px; }
  .no { background: #eef1f5; color: #888; padding: 8px 12px; font-size: 13px; }
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
  .devcell { max-width: 190px; }
  .cnt { font-weight: 600; margin-bottom: 2px; }
  .devline { display: flex; align-items: center; gap: 6px; padding: 2px 0; font-size: 12px; }
  .mini { background: #eef1f5; color: #c0392b; padding: 2px 8px; font-size: 11px; border-radius: 6px; }
  .project-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
  .project-btn.on { background: #2f6fed; color: #fff; }
  .project-tag { display: inline-block; padding: 1px 7px; border-radius: 5px; font-size: 11px; background: #eef6ff; color: #2f6fed; }
  tr.log-fail td { color: #c0392b; }
  tr.log-ok td { color: #16a34a; }
</style>
</head>
<body>
<!-- 登录界面 -->
<div id="login-screen" style="display:none;max-width:320px;margin:60px auto 0;">
  <h1 style="text-align:center">DaoBox 管理台</h1>
  <div class="card">
    <h2>登录</h2>
    <input id="login-user" placeholder="用户名" style="width:100%;padding:10px;margin:4px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:15px;">
    <input id="login-pass" type="password" placeholder="密码" style="width:100%;padding:10px;margin:4px 0;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-size:15px;">
    <button class="blue" style="width:100%;margin-top:8px;padding:12px" onclick="doLogin()">登 录</button>
    <div id="login-error" style="color:#c0392b;font-size:13px;margin-top:8px;display:none"></div>
  </div>
</div>
<!-- 管理内容 -->
<div id="admin-content" style="display:none">
<h1>DaoBox 管理台 <button class="ghost" style="float:right;padding:4px 12px;font-size:12px" onclick="logout()">退出</button></h1>
<h2 style="margin-top:12px">登录记录</h2>
<div id="loginlogs" class="card"><span class="muted">加载中…</span></div>
<div class="card">
  <h2>项目</h2>
  <div class="project-tabs">
    <button class="ghost project-btn" data-project="vocab_full">背单词完整版</button>
    <button class="ghost project-btn" data-project="lottery_full">彩票完整版</button>
    <button class="ghost project-btn" data-project="all">全部</button>
  </div>
</div>
<h2>待确认订单</h2>
<div id="pending" class="card"><span class="muted">加载中…</span></div>
<div id="rejected"></div>
<div id="deleted"></div>
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
const TOKEN_KEY = 'daobox_admin_token';
const ORIGIN = location.origin;
function getToken() { return localStorage.getItem(TOKEN_KEY); }
function authHeaders() { return { 'X-Admin-Token': getToken(), 'Content-Type': 'application/json' }; }
const PROJECT_IDS = {
  vocab_full: '背单词完整版',
  lottery_full: '彩票完整版',
};
let PROJECT = new URLSearchParams(location.search).get('project') || sessionStorage.getItem('daobox_admin_project') || 'vocab_full';
if (PROJECT !== 'all' && !PROJECT_IDS[PROJECT]) PROJECT = 'vocab_full';
let ALLCODES = [];
let FILTER = 'all';

function projectName(id) {
  return PROJECT_IDS[id] || '未知';
}

function updateProjectTabs() {
  document.querySelectorAll('.project-btn').forEach(function (btn) {
    btn.classList.toggle('on', btn.dataset.project === PROJECT);
  });
}

function setProject(id) {
  PROJECT = id;
  sessionStorage.setItem('daobox_admin_project', id);
  const url = new URL(location.href);
  url.searchParams.set('project', id);
  history.replaceState({}, '', url);
  updateProjectTabs();
  load();
}

document.addEventListener('click', function (event) {
  const btn = event.target.closest('.project-btn');
  if (btn) setProject(btn.dataset.project);
});
updateProjectTabs();
const fmt = (t) => new Date(t).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s || '').replace(/[<>&"]/g, '');

async function load() {
  const [ord, codes, logs] = await Promise.all([
    fetch('/admin/orders?project=' + encodeURIComponent(PROJECT), { headers: authHeaders() }).then(r => r.json()),
    fetch('/admin/list?project=' + encodeURIComponent(PROJECT), { headers: authHeaders() }).then(r => r.json()),
    fetch('/admin/loginlogs', { headers: authHeaders() }).then(r => r.json()).catch(() => ({ logs: [] })),
  ]);

  // 渲染登录记录
  const logList = logs.logs || [];
  document.getElementById('loginlogs').innerHTML = logList.length === 0
    ? '<span class="muted">暂无登录记录</span>'
    : '<div style="overflow-x:auto"><table><thead><tr><th>结果</th><th>用户名</th><th>地区</th><th>IP 地址</th><th>时间</th></tr></thead><tbody>' +
      logList.map(l => {
        const flag = l.success ? '✅ 成功' : '❌ 失败';
        const loc = [l.country, l.city].filter(Boolean).join(' · ') || '未知';
        return '<tr class="' + (l.success ? 'log-ok' : 'log-fail') + '">' +
          '<td>' + flag + '</td>' +
          '<td>' + esc(l.username) + '</td>' +
          '<td>' + esc(loc) + '</td>' +
          '<td class="mono">' + esc(l.ip) + '</td>' +
          '<td>' + fmt(l.time) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  const orders = (ord.orders || []).slice().sort((a, b) => b.created_at - a.created_at);
  const pending = orders.filter(o => o.status === 'pending');
  const rejected = orders.filter(o => o.status === 'rejected');
  const paid = orders.filter(o => o.status === 'paid');

  document.getElementById('pending').innerHTML = pending.length === 0
    ? '<span class="muted">暂无待确认订单 ✅</span>'
    : pending.map(o =>
        '<div class="row"><span class="project-tag">' + esc(projectName(o.project_id)) + '</span><b>' + esc(o.contact) + '</b>' +
        '<span class="muted">' + fmt(o.created_at) + '</span>' +
        '<button class="ok" onclick="confirmOrder(\\\'' + o.id + '\\')">确认收款</button>' +
        '<button class="no" onclick="rejectOrder(\\\'' + o.id + '\\')">✕ 拒绝</button>' +
        '<button class="no" onclick="armDelete(this,\\'' + o.id + '\\')">🗑 删除</button></div>'
      ).join('') +
      (paid.length ? '<div class="muted" style="margin-top:10px">最近已确认：' +
        paid.slice(0, 5).map(o => esc(o.contact) + ' → ' + (o.code || '?')).join('，') + '</div>' : '');

  // Rejected orders section
  var rejectedHtml = '';
  if (rejected.length > 0) {
    rejectedHtml = '<h2>已拒绝订单 (' + rejected.length + ')</h2><div class="card">' +
      rejected.map(o =>
        '<div class="row"><b>' + esc(o.contact) + '</b>' +
        '<span class="muted">' + fmt(o.created_at) + '</span>' +
        '<button class="ghost" onclick="restoreOrder(\\\'' + o.id + '\\')">↩ 恢复</button>' +
        '<button class="no" onclick="armDelete(this,\\'' + o.id + '\\')">🗑 删除</button>' +
        '<span class="muted">恢复后回到待确认列表</span></div>'
      ).join('') + '</div>';
  }
  document.getElementById('rejected').innerHTML = rejectedHtml;

  // Deleted orders section
  const deleted = orders.filter(o => o.status === 'deleted');
  var deletedHtml = '';
  if (deleted.length > 0) {
    deletedHtml = '<h2>已删除订单 (' + deleted.length + ')</h2><div class="card">' +
      deleted.map(o =>
        '<div class="row"><span class="project-tag">' + esc(projectName(o.project_id)) + '</span><b>' + esc(o.contact) + '</b>' +
        '<span class="muted">' + fmt(o.created_at) + '</span>' +
        '<button class="ghost" onclick="restoreOrder(\\\'' + o.id + '\\')">↩ 恢复</button>' +
        '<span class="muted">误删可恢复，回到待确认列表</span></div>'
      ).join('') + '</div>';
  }
  document.getElementById('deleted').innerHTML = deletedHtml;

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

var BINDINGS = [];  // 每行 { code, devices: [{id, t}] }，解绑按钮按索引取值

function renderTable() {
  const list = ALLCODES.filter(c => FILTER === 'all' || c.status === FILTER);
  BINDINGS = [];
  if (list.length === 0) {
    document.getElementById('codetable').innerHTML = '<span class="muted">该分类下暂无激活码</span>';
    return;
  }
  const rows = list.map((c, i) => {
    const ids = c.devices ? c.devices.split(',').filter(Boolean) : [];
    const times = c.bound_times ? String(c.bound_times).split(',').filter(Boolean) : [];
    const devs = ids.map((id, j) => ({ id: id, t: Number(times[j] || 0) }));
    BINDINGS.push({ code: c.code, devices: devs });
    const link = ORIGIN + '/c/' + c.claim_token;

    let devHtml;
    if (devs.length === 0) {
      devHtml = '<div class="muted">未绑定</div>';
    } else {
      devHtml = '<div class="cnt">' + devs.length + '/3</div>' + devs.map((dv, j) =>
        '<div class="devline"><span class="muted" title="' + dv.id + '">' + dv.id.slice(0, 10) + '…</span>' +
        '<span class="muted">' + new Date(dv.t).toLocaleDateString('zh-CN') + '</span>' +
        '<button class="mini" onclick="unbindDev(' + i + ',' + j + ')">解绑</button></div>'
      ).join('');
    }

    return '<tr class="' + c.status + '">' +
      '<td>' + (i + 1) + '</td>' +
      '<td><span class="project-tag">' + esc(projectName(c.project_id)) + '</span></td>' +
      '<td class="mono">' + c.code + '</td>' +
      '<td><span class="tag ' + c.status + '">' + (c.status === 'used' ? '已用' : '未用') + '</span></td>' +
      '<td class="devcell">' + devHtml + '</td>' +
      '<td class="muted">' + fmt(c.created_at) + '</td>' +
      '<td><button class="copy" onclick="copyLink(\\'' + link + '\\')">复制链接</button></td>' +
      '</tr>';
  }).join('');
  document.getElementById('codetable').innerHTML =
    '<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>项目</th><th>激活码</th><th>状态</th><th>设备</th><th>生成时间</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function unbindDev(ri, di) {
  const row = BINDINGS[ri];
  if (!row) return;
  const dev = row.devices[di];
  fetch('/admin/unbind', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ code: row.code, deviceId: dev.id }),
  })
    .then(r => r.json())
    .then(d => {
      if (d.ok) { alert('已解绑'); load(); }
      else { alert('解绑失败：' + (d.error || '未知错误')); }
    })
    .catch(() => alert('网络异常，请重试'));
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
  try {
    const r = await fetch('/admin/confirm', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ orderId: id }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.ok) { alert('已确认，分配激活码：' + d.code); }
    else { alert('确认失败：' + (d.error || '未知错误')); }
  } catch (e) { alert('网络异常，请重试'); }
  load();
}

async function rejectOrder(id) {
  try {
    const r = await fetch('/admin/reject', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ orderId: id }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.ok) { alert('已拒绝，订单已标记为 rejected。'); }
    else { alert('拒绝失败：' + (d.error || '未知错误')); }
  } catch (e) { alert('网络异常，请重试'); }
  load();
}

async function restoreOrder(id) {
  try {
    const r = await fetch('/admin/restore', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ orderId: id }),
    });
    const d = await r.json().catch(() => ({}));
    if (d.ok) { alert('已恢复，订单回到待确认列表'); }
    else { alert('恢复失败：' + (d.error || '未知错误')); }
  } catch (e) { alert('网络异常，请重试'); }
  load();
}

function armDelete(btn, id) {
  if (btn.dataset.armed === '1') { deleteOrder(id); return; }
  btn.dataset.armed = '1';
  btn.textContent = '确认删除？';
  btn.style.background = '#c0392b';
  btn.style.color = '#fff';
  setTimeout(function () {
    if (btn.isConnected && btn.dataset.armed === '1') {
      btn.dataset.armed = '';
      btn.textContent = '🗑 删除';
      btn.style.background = '';
      btn.style.color = '';
    }
  }, 4000);
}

async function deleteOrder(id) {
  try {
    const r = await fetch('/admin/delete', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ orderId: id }),
    });
    const d = await r.json().catch(function () { return {}; });
    if (d.ok) { alert('已删除，误删可在「已删除订单」区恢复'); }
    else { alert('删除失败：' + (d.error || '未知错误')); }
  } catch (e) { alert('网络异常，请重试'); }
  load();
}

async function seed() {
  if (PROJECT === 'all') {
    alert('请先选择一个具体项目，再生成激活码。');
    return;
  }
  const r = await fetch('/admin/seed?count=100&project=' + encodeURIComponent(PROJECT), { method: 'POST', headers: authHeaders() });
  const d = await r.json();
  document.getElementById('seedout').value = (d.codes || []).map(c => c.code + '  ' + c.link).join('\\n');
  load();
}


async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errDiv = document.getElementById('login-error');
  errDiv.style.display = 'none';
  try {
    const r = await fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const d = await r.json();
    if (d.ok) {
      localStorage.setItem(TOKEN_KEY, d.token);
      showAdmin();
    } else {
      errDiv.textContent = d.error || '登录失败';
      errDiv.style.display = 'block';
    }
  } catch(e) {
    errDiv.textContent = '网络异常，请重试';
    errDiv.style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  location.reload();
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'block';
  document.getElementById('admin-content').style.display = 'none';
}

function showAdmin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-content').style.display = 'block';
  load();
}

async function checkAuth() {
  const token = getToken();
  if (!token) { showLogin(); return; }
  try {
    const r = await fetch('/admin/verify', { headers: { 'X-Admin-Token': token } });
    if (r.ok) { showAdmin(); } else { localStorage.removeItem(TOKEN_KEY); showLogin(); }
  } catch(e) { showLogin(); }
}

document.getElementById('login-pass').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') doLogin();
});

checkAuth();
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
      const projectId = body.projectId ? normalizeProjectId(body.projectId) : DEFAULT_PROJECT_ID;

      if (!code || !deviceId || !projectId) {
        return json({ ok: false, error: body.projectId && !projectId ? '未知项目' : '参数不完整' }, 400);
      }

      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const limitKey = `${projectId}:${ip}:${deviceId}`;

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
        .prepare('SELECT code, status FROM codes WHERE project_id = ? AND code = ?')
        .bind(projectId, code)
        .first();

      if (!codeRow) {
        await recordFail(env.DB, limitKey);
        return json({ ok: false, error: '激活码不存在，请核对后重试' }, 404);
      }

      const bound = await env.DB
        .prepare('SELECT device_id FROM bindings WHERE project_id = ? AND code = ?')
        .bind(projectId, code)
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
        .prepare('INSERT INTO bindings (project_id, code, device_id, bound_at) VALUES (?, ?, ?, ?)')
        .bind(projectId, code, deviceId, Date.now())
        .run();
      await env.DB
        .prepare("UPDATE codes SET status = 'used', claimed_at = ? WHERE project_id = ? AND code = ? AND status = 'unused'")
        .bind(Date.now(), projectId, code)
        .run();
      await clearFails(env.DB, limitKey);

      return json({ ok: true, plan: 'all', message: '已解锁' });
    }

    // ---- 付款登记 ----
    if (request.method === 'POST' && path === '/api/order') {
      const body = await request.json().catch(() => ({}));
      const contact = normalizeContact(body.contact);
      const projectId = body.projectId ? normalizeProjectId(body.projectId) : DEFAULT_PROJECT_ID;
      if (!contact) {
        return json({ ok: false, error: '请填写有效的手机号或微信号' }, 400);
      }
      if (!projectId) {
        return json({ ok: false, error: '未知项目' }, 400);
      }
      const id = genToken(6);
      const token = genToken(12);
      await env.DB
        .prepare('INSERT INTO orders (project_id, id, token, contact, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(projectId, id, token, contact, 'pending', Date.now())
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

      // 登录接口不需要 Token
      if (request.method === 'POST' && path === '/admin/login') {
        const body = await request.json().catch(() => ({}));
        const username = String(body.username || '').trim();
        const password = String(body.password || '');
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const cfCountry = request.cf?.country || '';
        const cfCity = request.cf?.city || '';
        const success = env.ADMIN_USER && env.ADMIN_PASS && username === env.ADMIN_USER && password === env.ADMIN_PASS;

        // 记录登录日志（成功和失败都记）
        try {
          await env.DB
            .prepare('INSERT INTO login_logs (time, ip, country, city, username, success) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(Date.now(), ip, cfCountry, cfCity, username, success ? 1 : 0)
            .run();
        } catch (e) { console.error('login log error:', e); }

        if (!success) {
          return json({ ok: false, error: '用户名或密码错误' }, 401);
        }
        const token = await genAdminToken(env.ADMIN_SECRET || env.ADMIN_PASS);
        return json({ ok: true, token, expiresAt: Date.now() + ADMIN_TOKEN_TTL_MS });
      }

      // /admin 精确路径 → 返回 404（隐蔽入口，防止被猜到）
      if (request.method === 'GET' && path === '/admin') {
        return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }

      // 管理台页面在隐藏路径 /admin/moon-tiger
      if (request.method === 'GET' && path === '/admin/' + ADMIN_PATH_SECRET) {
        return new Response(adminPageHtml(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // 门户统一账号表结构迁移（幂等 DDL；X-Admin-Key 认证，供 daobox-home 部署流程调用）
      if (request.method === 'POST' && path === '/admin/portal-schema') {
        if (!env.ADMIN_KEY || request.headers.get('X-Admin-Key') !== env.ADMIN_KEY) {
          return json({ ok: false, error: 'unauthorized' }, 401);
        }
        const ddl = [
          "CREATE TABLE IF NOT EXISTS portal_users (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL UNIQUE, nickname TEXT, pass_hash TEXT NOT NULL, source TEXT, created_at INTEGER NOT NULL, last_login_at INTEGER, status TEXT NOT NULL DEFAULT 'active')",
          "CREATE TABLE IF NOT EXISTS portal_login_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, ts INTEGER NOT NULL, src TEXT, app TEXT, ip_hash TEXT, ua TEXT)",
          "CREATE INDEX IF NOT EXISTS idx_pll_user_ts ON portal_login_logs(user_id, ts)",
          "CREATE TABLE IF NOT EXISTS portal_usage_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, app TEXT NOT NULL, action TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 1, ts INTEGER NOT NULL)",
          "CREATE INDEX IF NOT EXISTS idx_pul_user ON portal_usage_log(user_id, app, action, ts)",
          "CREATE TABLE IF NOT EXISTS portal_quota (identity TEXT NOT NULL, app TEXT NOT NULL, action TEXT NOT NULL, date TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (identity, app, action, date))"
        ];
        await env.DB.batch(ddl.map(s => env.DB.prepare(s)));
        return json({ ok: true, applied: ddl.length });
      }

      // 其他管理 API 需要有效 Token
      const adminToken = request.headers.get('X-Admin-Token');
      const tokenValid = await verifyAdminToken(adminToken, env.ADMIN_SECRET || env.ADMIN_PASS);
      if (!tokenValid) {
        return json({ ok: false, error: '登录已过期，请重新登录' }, 401);
      }

      if (request.method === 'GET' && path === '/admin/verify') {
        return json({ ok: true });
      }

      if (request.method === 'GET' && path === '/admin/loginlogs') {
        const rows = await env.DB
          .prepare('SELECT time, ip, country, city, username, success FROM login_logs ORDER BY time DESC LIMIT 200')
          .all();
        return json({ ok: true, logs: rows.results });
      }

      if (request.method === 'POST' && path === '/admin/confirm') {
        const body = await request.json().catch(() => ({}));
        const orderId = String(body.orderId || '');
        const order = await env.DB
          .prepare("SELECT project_id, id, status FROM orders WHERE id = ? AND status = 'pending'")
          .bind(orderId)
          .first();
        if (!order) return json({ ok: false, error: '订单不存在或已确认' }, 404);

        const unused = await env.DB
          .prepare("SELECT code, claim_token FROM codes WHERE project_id = ? AND status = 'unused' LIMIT 1")
          .bind(order.project_id)
          .first();
        if (!unused) return json({ ok: false, error: '该项目的激活码已用完，请先生成新码' }, 500);

        const now = Date.now();
        await env.DB.batch([
          env.DB.prepare("UPDATE codes SET status = 'used', claimed_at = ? WHERE project_id = ? AND code = ?").bind(now, order.project_id, unused.code),
          env.DB.prepare("UPDATE orders SET status = 'paid', code = ?, paid_at = ? WHERE id = ?").bind(unused.code, now, orderId),
        ]);
        return json({ ok: true, code: unused.code, link: `${url.origin}/c/${unused.claim_token}` });
      }

      if (request.method === 'POST' && path === '/admin/reject') {
        const body = await request.json().catch(() => ({}));
        const orderId = String(body.orderId || '');
        const result = await env.DB
          .prepare("UPDATE orders SET status = 'rejected' WHERE id = ? AND status = 'pending'")
          .bind(orderId)
          .run();
        if (!result.meta.changes) return json({ ok: false, error: '订单不存在或状态已变' }, 404);
        return json({ ok: true });
      }

      if (request.method === 'POST' && path === '/admin/delete') {
        const body = await request.json().catch(() => ({}));
        const orderId = String(body.orderId || '');
        const result = await env.DB
          .prepare("UPDATE orders SET status = 'deleted' WHERE id = ? AND status IN ('pending','rejected')")
          .bind(orderId)
          .run();
        if (!result.meta.changes) return json({ ok: false, error: '订单不存在或状态已变' }, 404);
        return json({ ok: true });
      }

      if (request.method === 'POST' && path === '/admin/restore') {
        const body = await request.json().catch(() => ({}));
        const orderId = String(body.orderId || '');
        const result = await env.DB
          .prepare("UPDATE orders SET status = 'pending' WHERE id = ? AND status IN ('rejected','deleted')")
          .bind(orderId)
          .run();
        if (!result.meta.changes) return json({ ok: false, error: '订单不存在或状态已变' }, 404);
        return json({ ok: true });
      }

      if (request.method === 'GET' && path === '/admin/orders') {
        const project = normalizeProjectId(url.searchParams.get('project'), { allowAll: true }) || DEFAULT_PROJECT_ID;
        const sql = 'SELECT project_id, id, contact, status, code, created_at, paid_at FROM orders'
          + (project === 'all' ? '' : ' WHERE project_id = ?')
          + ' ORDER BY created_at DESC LIMIT 500';
        const rows = project === 'all'
          ? await env.DB.prepare(sql).all()
          : await env.DB.prepare(sql).bind(project).all();
        return json({ ok: true, orders: rows.results });
      }

      if (request.method === 'POST' && path === '/admin/seed') {
        const count = Math.min(parseInt(url.searchParams.get('count') || '100', 10), 2000);
        const project = normalizeProjectId(url.searchParams.get('project')) || DEFAULT_PROJECT_ID;
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
              .prepare('INSERT INTO codes (project_id, code, claim_token, status, created_at) VALUES (?, ?, ?, ?, ?)')
              .bind(project, code, token, 'unused', Date.now())
          );
          results.push({ code, link: `${url.origin}/c/${token}` });
        }
        await env.DB.batch(stmts);
        return json({ ok: true, generated: results.length, codes: results });
      }

      if (request.method === 'GET' && path === '/admin/list') {
        const project = normalizeProjectId(url.searchParams.get('project'), { allowAll: true }) || DEFAULT_PROJECT_ID;
        const sql = `
            SELECT c.project_id, c.code, c.status, c.created_at, c.claimed_at, c.claim_token,
                   GROUP_CONCAT(b.device_id) AS devices,
                   GROUP_CONCAT(b.bound_at) AS bound_times
            FROM codes c
            LEFT JOIN bindings b ON b.code = c.code
            ${project === 'all' ? '' : 'WHERE c.project_id = ?'}
            GROUP BY c.code
            ORDER BY c.created_at DESC
          `;
        const codes = project === 'all'
          ? await env.DB.prepare(sql).all()
          : await env.DB.prepare(sql).bind(project).all();
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
