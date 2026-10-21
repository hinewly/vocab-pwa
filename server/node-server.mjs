// vocab-pwa / daobox-api 国内站 Node 服务器：
// - 复用 worker/src/index.js 的 fetch(request, env)（Cloudflare Workers 原代码零改动运行于 Node）
// - 海外版绑定 vocab.daobox.app + api.daobox.app；国内版只启用 api.daobox.net.cn（激活码/订单/管理台）
// - D1 兼容层走本地 SQLite（与 daobox-home 共库）
import http from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { D1Compat } from "./d1.mjs";
import worker from "../worker/src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DB_FILE = process.env.DB_FILE || path.join(ROOT, "data", "daobox.db");
const PORT = parseInt(process.env.PORT || "8789", 10);
const HOST = process.env.HOST || "127.0.0.1";

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
