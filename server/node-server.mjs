// vocab-pwa / daobox-api 国内站 Node 服务器：
// - 复用 worker/src/index.js 的 fetch(request, env)（Cloudflare Workers 原代码零改动运行于 Node）
// - 海外版绑定 vocab.daobox.app + api.daobox.app；国内版启用 vocab.daobox.net.cn（主站+静态）与 api.daobox.net.cn（激活码/订单/管理台）
// - 静态文件托管复刻 wrangler [assets] 行为（静态优先，未匹配走 worker）
// - D1 兼容层走本地 SQLite（与 daobox-home 共库）
import http from "node:http";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { D1Compat } from "./d1.mjs";
import worker from "../worker/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DB_FILE = process.env.DB_FILE || path.join(ROOT, "data", "daobox.db");
const PORT = parseInt(process.env.PORT || "8789", 10);
const HOST = process.env.HOST || "127.0.0.1";

// 静态文件 MIME（wrangler assets 行为复刻）
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
};

function serveStatic(pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/" || rel === "") rel = "/index.html";
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return null;
  let target = file;
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    const idx = path.join(target, "index.html");
    if (fs.existsSync(idx)) target = idx; else return null;
  }
  const ext = path.extname(target).toLowerCase();
  return { status: 200, body: fs.readFileSync(target), type: MIME[ext] || "application/octet-stream" };
}

const env = {
  DB: new D1Compat(DB_FILE),
  ADMIN_KEY: process.env.ADMIN_KEY,
  ADMIN_USER: process.env.ADMIN_USER || "",
  ADMIN_PASS: process.env.ADMIN_PASS || "",
  ADMIN_SECRET: process.env.ADMIN_SECRET || "",
};

function webRequestFromNode(req, bodyBuf) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || "localhost";
  const url = `${proto}://${host}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else if (v != null) headers.append(k, v);
  }
  if (bodyBuf && bodyBuf.length) headers.set("Content-Length", String(bodyBuf.length));
  return new Request(url, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : bodyBuf,
    duplex: "half",
  });
}

async function sendWebResponse(res, webRes) {
  const headers = {};
  webRes.headers.forEach((v, k) => {
    if (k.toLowerCase() === "set-cookie") return;
    if (headers[k]) headers[k] += ", " + v;
    else headers[k] = v;
  });
  const cookies = webRes.headers.getSetCookie ? webRes.headers.getSetCookie() : [];
  if (cookies.length) headers["Set-Cookie"] = cookies;
  res.writeHead(webRes.status, headers);
  if (webRes.body) {
    const buf = Buffer.from(await webRes.arrayBuffer());
    res.end(buf);
  } else {
    res.end();
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    // 1. 静态资源优先（/api、/admin 不会有同名文件，天然穿透）
    if (req.method === "GET" || req.method === "HEAD") {
      const staticRes = serveStatic(new URL(req.url, "http://localhost").pathname);
      if (staticRes) {
        res.writeHead(staticRes.status, { "Content-Type": staticRes.type, "Cache-Control": "public, max-age=300" });
        res.end(staticRes.body);
        return;
      }
    }

    // 2. Worker fetch（API + 管理台）
    const request = webRequestFromNode(req, Buffer.concat(chunks));
    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    await sendWebResponse(res, response);
  } catch (err) {
    console.error("[daobox-api-cn] request error:", err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: "internal error" }));
  }
});

// 首次启动：应用 vocab 建表结构（projects/codes/bindings/attempts/orders）
if (!(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'").first())) {
  const schemaSql = fs.readFileSync(path.join(ROOT, "worker", "schema.sql"), "utf8");
  env.DB.exec(schemaSql);
  console.log("[daobox-api-cn] vocab schema.sql applied");
}

// 启动前确认数据库可读
if (!fs.existsSync(DB_FILE)) {
  console.error(`[daobox-api-cn] DB 文件不存在：${DB_FILE}`);
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log(`[daobox-api-cn] listening on ${HOST}:${PORT}, db=${DB_FILE}`);
});
