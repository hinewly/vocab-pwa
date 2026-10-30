# 付费解锁流程 交接

- last_updated: 2026-09-30 12:00
- status: done（正常运营阶段，无需开发）
- version: v1.2.13

## 任务目标

为 vocab-pwa 搭建低维护成本的付费解锁闭环：付款 → 隐藏链接取码 → 后端验证 → 解锁全部词本。

## 当前状态

全部完成（v1.2.13 + 管理台表格）。用户已亲自实测全流程：解锁成功、清数据后凭码恢复成功。100 个正式码已生成并入底账。

## 已上线的基础设施

- 域名：`daobox.app`（Cloudflare Registrar 注册，$14.20/年，自动续费开启）
- 后端 API：`https://api.daobox.app`（Cloudflare Worker `daobox-api`，国内可访问）
- 数据库：Cloudflare D1 `daobox-db`
- 代码位置：项目内 `worker/` 目录（wrangler.toml / schema.sql / src/index.js）
- workers.dev 临时地址在国内被 DNS 污染不可用，仅用自有域名

## 站点架构（v1.2.12 起）

- `daobox.app` = 前端 + 后端同域（Worker Static Assets 托管 public/，主推地址）
- `api.daobox.app` = 同一 Worker 的别名（保留，旧链接继续有效）
- GitHub Pages（hinewly.github.io/vocab-pwa）= 备用入口，push main 自动部署不变
- WorkBuddy host = 备用入口

## 付款流程（半自动，个人收款码）

1. 解锁页展示收款码（早鸟 ¥9.9 / 原价 ¥19.9）
2. 用户扫码付款 → 填手机号点「登记」→ 生成专属取码页 /o/<token>
3. 用户收藏取码页（页面每 15 秒轮询状态）
4. 管理员微信收到款 → 打开管理台 /admin?key=ADMIN_KEY → 点「确认收款」
5. 系统自动分配一个未用激活码 → 用户取码页自动显示码
6. 用户复制码到 App 解锁页 → /api/activate 验证 → 解锁

定价：正式价 ¥19.9，限时早鸟 ¥9.9。卖点：一次付费永久、3 台设备家庭共用、纯粹无干扰。

## 接口清单

- `POST /api/activate` — App 解锁页调用：{ code, deviceId } → 验证 + 绑定
- `POST /api/order` — 付款登记 { contact } → 返回取码页地址
- `GET /o/<token>` — 用户取码页（轮询自动显示码）
- `GET /admin?key=ADMIN_KEY` — 管理台（确认订单/生成码/统计）
- `POST /admin/confirm` — 确认订单 { orderId } → 自动分配激活码
- `GET /c/:claimToken` — 隐藏取码页：大号数字 + 一键复制 + 凭证保存提醒
- `POST /admin/seed?key=ADMIN_KEY&count=N` — 批量生成激活码，返回码+链接
- `GET /admin/list?key=ADMIN_KEY` — 查看所有码和绑定（用户丢码时帮查）
- `POST /admin/unbind?key=ADMIN_KEY` — 手动解绑设备
- ADMIN_KEY 存于 worker/wrangler.toml（勿外泄、勿提交到公开文档）

## 已定产品规则（已在代码中实现）

- 激活码：6 位纯数字，好输入
- 激活码 = 购买凭证：清数据/换设备重新输入即可，无需重复购买
- 软绑定：每码最多 3 台设备，超限需管理员解绑
- 防穷举：连错 5 次冷却 10 分钟，反复触发翻倍
- 取码页提示截图保存

## 已完成验证（2026-09-30）

- 生成 3 个测试码（269480 / 815471 / 966142）
- 取码页渲染正常（用户已在浏览器实测）
- 激活 / 同设备重复激活 / 错误码处理全部通过

## 前端接入（v1.2.11，已推送 31ef66b）

- 移除本地演示码 VOCAB-2026
- 解锁页输入 6 位数字 → POST /api/activate → 成功存 localStorage `wa:unlocked`
- 设备 ID 存 localStorage `wa:device_id`

## 待办（运营阶段）

1. 等真实订单：微信收款推送 → 管理台点确认 → 用户取码页自动出码
2. 码池剩 100 个用完前，管理台一键补 100 个，并更新底账文件
3. 观察早鸟价转化，后续评估恢复 ¥19.9
4. 远期：多软件共用后端时加 product 字段（方案 A：一套 Worker+D1 共管）
5. 远期：接商户/聚合支付回调，去掉人工确认环节

## 「3 台设备」的准确含义（内部口径，2026-10-01 用户问询后补充）

对外文案统一说「3 台设备」（用户易懂）。技术上的准确语义是「3 个浏览器存储位置」，内部必须清楚：

- 设备 ID 不是硬件机器码，是我们生成的随机字符串，存在浏览器 localStorage（wa:device_id）
- 同一台电脑的 Chrome 和 Safari = 2 个名额；同一 iPhone 的 Safari 和桌面 PWA = 2 个名额
- 用户清除网站数据后重开 = 新名额（旧 ID 丢失）
- 换算关系：普通用户手机 + 电脑 + 家人一台 ≈ 3 个名额，正好覆盖目标场景
- 用户若问「为什么我电脑开两个浏览器就算两个」：解释口径是「每个独立的浏览器算一个激活位置，这是行业通用规则（视频网站会员同理）」，「清除浏览器数据后重新输入激活码即可恢复，不用重新购买」

对外文案已确认保持「3 台设备」表述，勿再改动（2026-10-01 已从「浏览器或安装位置」表述回滚）。

## 注意事项（新增）

- 用户丢取码页：让用户重新登记，管理员在 /admin/orders 里找到同联系方式的旧单确认即可（不重复扣码）
- wrangler.toml 里 routes 必须写在 [assets] 之前（TOML 表作用域坑，踩过两次）

## 「3 台设备」的准确含义（内部口径，2026-10-01 用户问询后补充）

对外文案统一说「3 台设备」（用户易懂）。技术上的准确语义是「3 个浏览器存储位置」，内部必须清楚：

- 设备 ID 不是硬件机器码，是我们生成的随机字符串，存在浏览器 localStorage（wa:device_id）
- 同一台电脑的 Chrome 和 Safari = 2 个名额；同一 iPhone 的 Safari 和桌面 PWA = 2 个名额
- 用户清除网站数据后重开 = 新名额（旧 ID 丢失）
- 换算关系：普通用户手机 + 电脑 + 家人一台 ≈ 3 个名额，正好覆盖目标场景
- 用户若问「为什么我电脑开两个浏览器就算两个」：解释口径是「每个独立的浏览器算一个激活位置，这是行业通用规则（视频网站会员同理）」，「清除浏览器数据后重新输入激活码即可恢复，不用重新购买」

对外文案已确认保持「3 台设备」表述，勿再改动（2026-10-01 已从「浏览器或安装位置」表述回滚）。

## 注意事项

- Cloudflare 免费额度足够当前量级（Worker 10 万请求/天，D1 500 万读/天）
- Worker 更新需在 worker/ 目录执行 `npx wrangler deploy`
- 本地 curl 直连 workers.dev 会被 DNS 污染，测试一律用 api.daobox.app
- 测试激活码 269480 已被 test-device-001 绑定，正式发码前可清理

## 相关文件

- `worker/`（后端全部代码）
- `public/app.js`（解锁逻辑：UNLOCK_API / submitUnlock / getDeviceId）
- `public/CHANGELOG.md`
