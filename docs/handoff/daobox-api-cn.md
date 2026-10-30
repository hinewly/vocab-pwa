# 激活码 API 国内化（api.daobox.net.cn）交接

- last_updated: 2026-10-21 12:20
- status: active
- version: 同 vocab-pwa worker

## 任务目标

把 vocab-pwa worker（daobox-api：激活码/付款登记/管理台）部署到 api.daobox.net.cn，供国内子应用（suan/shici/aoshu…）解锁流程使用。

## 当前状态

✅ 已上线 https://api.daobox.net.cn （2026-10-21）
- /api/activate、/api/order、/api/order/status、/admin/* 全部本地运行
- E2E：激活不存在码正确报错、创建订单成功（orderId 537cbb9bd6a3）、管理台登录成功
- 数据库与 daobox-home/suan 共用 /opt/daobox-home/data/daobox.db（首启自动应用 worker/schema.sql：projects/codes/bindings/attempts/orders）

## 最近完成

- server/ 目录：node-server.mjs（复用 worker fetch，8789 端口，含 schema bootstrap——注意 first() 必须 await）+ d1.mjs 副本 + package.json
- 服务器：systemd daobox-api-cn.service（/opt/vocab-pwa），Caddy api.daobox.net.cn → 127.0.0.1:8789
- DNS：api A 记录（经 zone 文件导入，控制台表单的级联线路下拉自动化点击不可靠）
- 国内管理台账密 daoboxadmin（密码见 /Users/zoujiean/CodeX/docs/账号密码管理.md），与海外 Cloudflare secrets 相互独立

## 重要决策

- 只迁 API，vocab 主站（vocab.daobox.net.cn）后续单独迁
- 订单联系人格式「手机号 / 昵称」（normalizeContact），与海外一致

## 注意事项

- worker 订单接口参数是 projectId（驼峰），DEFAULT_PROJECT_ID 是 vocab；子应用需传自己的 projectId
- 管理台隐藏路径 /admin/moon-tiger
- rsync 部署同 suan：--exclude node_modules --exclude .env

## 相关文件

- server/node-server.mjs、server/d1.mjs、worker/src/index.js、worker/schema.sql
- 服务器 /opt/vocab-pwa/，systemd daobox-api-cn.service，Caddyfile 第 api 段
