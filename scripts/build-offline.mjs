#!/usr/bin/env node
/**
 * vocab 单机版打包脚本
 * 用法：node scripts/build-offline.mjs
 * 输出：dist/vocab-offline.html（全部资源内联的单文件离线版）
 *
 * 产物特性：
 * - 词库/逻辑/样式/表情图全部内联，双击即可在浏览器打开
 * - window.VOCAB_OFFLINE = true：解锁页只走激活码流程，隐藏 DaoBox 登录/云备份入口
 * - 激活请求带 projectId: 'vocab_offline'（moon-tiger 后台单独立项统计）
 * - 首次激活需联网（daobox.app /api/activate），激活后 localStorage 记录，永久离线可用
 * - 不含 portal.js / Service Worker / PWA manifest
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

const read = (f) => readFileSync(join(pub, f), 'utf8');
const b64 = (f) => 'data:image/jpeg;base64,' + readFileSync(join(pub, f)).toString('base64');

let html = read('index.html');

// ---- 移除 PWA / 门户相关 ----
html = html.replace(/<link rel="manifest"[^>]*>\s*/i, '');
html = html.replace(/<link rel="icon"[^>]*>\s*/gi, '');
html = html.replace(/<link rel="apple-touch-icon"[^>]*>\s*/i, '');
html = html.replace(/<script src="https:\/\/daobox\.app\/portal\.js"[^>]*><\/script>\s*/i, '');
html = html.replace(/<!-- PWA Service Worker 注册 -->[\s\S]*?<\/script>\s*/i, '');

// ---- 标题 ----
html = html.replace('<title>背单词 · 每日强化</title>', '<title>背单词 · 单机版</title>');

// ---- 内联 CSS ----
html = html.replace(
  /<link rel="stylesheet" href="style\.css">/i,
  () => '<style>\n' + read('style.css') + '\n</style>'
);

// ---- marked：优先本地 vendor，回退 CDN ----
const markedPath = join(pub, 'vendor', 'marked.min.js');
const markedSrc = existsSync(markedPath)
  ? readFileSync(markedPath, 'utf8')
  : null;
if (markedSrc) {
  html = html.replace(
    /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/marked@4\/marked\.min\.js"><\/script>/i,
    () => '<script>\n' + markedSrc + '\n</script>'
  );
}

// ---- 内联业务脚本 + 离线标志 ----
const offlineFlag = '<script>window.VOCAB_OFFLINE = true;</script>';
html = html.replace('<script src="data.js"></script>',
  () => offlineFlag + '\n  <script>\n' + read('data.js') + '\n</script>');
html = html.replace('<script src="phrases.js"></script>',
  () => '<script>\n' + read('phrases.js') + '\n</script>');
html = html.replace('<script src="data-affixes.js"></script>',
  () => '<script>\n' + read('data-affixes.js') + '\n</script>');
html = html.replace('<script src="app.js"></script>',
  () => '<script>\n' + read('app.js') + '\n</script>');

// ---- 收款二维码内联（离线场景仅作展示说明）----
if (existsSync(join(pub, 'qr-wechat.jpg'))) {
  html = html.replace(/src="\.\/qr-wechat\.jpg"/g, () => 'src="' + b64('qr-wechat.jpg') + '"');
}

// ---- 校验 ----
const mustContain = ['window.VOCAB_OFFLINE = true', 'vocab_offline', 'WORDS'];
for (const marker of mustContain) {
  if (!html.includes(marker)) { console.error('❌ 缺少标记:', marker); process.exit(1); }
}
if (html.includes('portal.js') || html.includes('serviceWorker.register')) {
  console.error('❌ 仍残留门户/SW 注册引用'); process.exit(1);
}
if (/<script src="/.test(html)) {
  console.error('❌ 仍存在外部脚本引用'); process.exit(1);
}

const out = join(dist, 'vocab-offline.html');
writeFileSync(out, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log('✅ 打包完成:', out, `(${kb} KB)`);
