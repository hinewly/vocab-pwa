# 点数收费接入（试点）交接

- last_updated: 2026-10-06 14:00
- status: active
- version: v1.2.32（vocab 前端）/ daobox-home 13e2393（钱包后端）

## 任务目标

vocab-pwa 接入通用点数收费系统：1 点 = 1 天学习会员，与 shici/suan 三工具通用；激活码买断保留但弱化为"意向登记"。

## 当前状态（2026-10-06 定稿）

包 1+2+3（钱包核心 + 截图上传 + 买断意向）已全部上线并部署，D1 迁移已执行（errors:[]）。**真实充值订单全流程（登记→管理台确认→到账）尚未用真实账号实测**，是下一会话第一件事。

## 已完成（截至 v1.2.32）

### 后端（daobox-home/worker，daobox.app 域名）
- 点数表：points_balance / points_ledger / points_orders / points_daily / buyout_interest（均建好）
- 档位：¥5/10/20/30/50 → 50/120/260/420/750 点（带赠点，与开发计划"1元=10点"版本不一致，用户倾向保留线上版，未最终拍板）
- POST /api/points/order：接受 screenshot（dataURL ≤300KB，超限静默丢弃不报错）
- GET /api/admin/points/orders：列出 has_screenshot / actual_cents；拉列表时自动清理已支付 30 天前的截图（订单记录永久保留，**不作废**）
- POST /api/admin/points/confirm：支持 body.actualAmount（实收金额元）——匹配档位给档位点数，否则 1 元=10 点基础价；流水 note 记 actual
- GET /api/admin/points/screenshot?id=：看截图原图
- POST /api/buyout/interest（登录用户，一人一工具一次）+ GET /api/admin/buyout/list
- 安全修复：/api/admin/points/* 与 buyout/list 原先无鉴权，现已补 adminKeyOk/adminCookieOk 校验
- POST /api/admin/migrate 改为逐条 try/catch（ALTER 重复不炸）

### 免费额度定稿（v1.2.30，2026-10-06）
- 免费层从"按场次"改为**按天计时**：未登录 5 分钟/天，登录未充值 15 分钟/天，会员无限
- 计时从当天第一次点学习开始走墙钟（切后台照扣），存 localStorage 按日期 key，过午夜重置；当天不用即作废不累计
- 中途用完允许学完当前场次；免费用完且登录有余额 → 自动扣 1 点开通今日会员
- 学习页顶部倒计时条：running 橙 / member 绿 / expired 红
- 纯前端实现，服务端零改动；shici/suan 待同步（口径一致）

### 前端（vocab app.js v1.2.32）
- 解锁页：付款四步口径（选档→扫码付款**留言栏填手机号**→昵称登记→等确认），可选上传付款截图（canvas 压缩 ≤120KB，预览）
- 文案：**"尽量 48 小时内处理，超时未到账发邮件"**——用户明确否决了"48h 自动作废"方案，订单永远挂着等管理员处理
- 买断折叠区顶部：「📝 想要永久买断？先登记意向」按钮（登录后 POST，成功显示累计人数）

### 管理端（daobox.app/admin，admin-client.js → sync-handoff.mjs 重新生成 admin-client-data.js）
- 充值订单表新增：实收列、截图列（查看链接）；确认时 prompt 输入实收金额（留空=按档位）
- 新增「买断意向」侧边栏页
- 状态筛选增加 expired（当前无自动过期，预留）

### 定稿策略（写进 public/DEVPLAN.md「💰 点数钱包系统」章节）
- 只做日卡，不做买断承诺；买断只攒意向，攒够再放开并另定升级边界
- 双通道定价：人工通道原价（引流主通道）/ 以后商户号自动通道上浮 20~30% 即时到账；orders.channel 字段已预留（manual_qr / wechat_pay）
- 截图存 D1 不开 R2；月单超 2000 或钱包表超 500MB 再迁 R2

## 待办

- [ ] **真实订单 E2E**：登录测试账号 → 登记充值（带截图）→ 管理台确认（含实收不符场景）→ 余额/流水核对
- [ ] 买断意向按钮真实点击验证（需登录态）
- [ ] 档位方案拍板：线上版（带赠点）vs 开发计划版（1元=10点无赠点）
- [ ] 短语/词缀学习入口暂未加门槛
- [ ] 以后：个体户+商户号 → 自动回调通道

## 注意事项 / 坑

- 部署 vocab：`zsh /Users/zoujiean/CodeX/daobox-home/worker/cf.sh deploy --config /Users/zoujiean/CodeX/vocab-pwa/worker/wrangler.toml`（deploy.sh 里 wrangler 会静默失败，别用）
- 部署 daobox-home：`zsh cf.sh deploy --config /Users/zoujiean/CodeX/daobox-home/worker/wrangler.toml`（在 daobox-home/worker 目录下跑 cf.sh）
- D1 迁移：`curl -X POST "https://daobox.app/api/admin/migrate?key=<ADMIN_KEY>"`（ADMIN_KEY 在两边 wrangler.toml 同值）
- 改 public/ 必须同步 bump app.js APP_VERSION + service-worker.js CACHE_VERSION，**两者必须真实递增**（v1.2.26 已被并行会话占用过，撞号会导致 SW 缓存不失效——v1.2.24 那次踩过）
- 管理后台 UI 源码是 daobox-home/worker/src/admin-client.js，改完必须跑 `node scripts/sync-handoff.mjs` 重新生成 admin-client-data.js
- SW 缓存：新版发布后浏览器要 reload 1-2 次才激活；应用内 🔄 按钮可强刷
