# vocab-pwa 交接文档（待办区）

> 按家族总规则（daobox-home/AGENTS.md「待办同步（强制）」）建立：本文件是背单词项目后续工作的唯一待办入口。

## 待办
- [x] 激活 API 域名修复（2026-10-04，v1.2.25）：根因是 10/3 迁移 vocab.daobox.app 时 daobox.app 路由让位给首页 worker，前端 UNLOCK_API_BASE 未同步改；已改为 https://api.daobox.app 并部署验证
- [ ] 建立完整 HANDOFF.md 战略/状态/技术备忘章节（当前仅有待办区）
- [x] /admin/login 防爆破锁定（2026-10-07 完成并部署验证）：错 5 次锁 10 分钟指数翻倍；顺带修复 recordFail resetCycle bug（过期后计数永不累计，同样影响 /api/activate）；详见 daobox-home/docs/handoff/管理台用户管理页与登录防爆破-2026-10-07-凌晨.md

## 会话记录（2026-10-08 凌晨）

- v1.2.33 上线：portal.js 接入 data-time="off"——vocab 豁免全家族时长配额（登录即解锁逻辑不动，用户后续玩法未定）
- 打卡桥接 /api/checkin 保留，但服务端额度奖励已取消（返回 granted:false）

## 待办

- [x] vocab 玩法（2026-10-12 定调方案A：登录即解锁全部词库、并入家族时长体系，v1.2.34；见 daobox-home HANDOFF 完成记录）
- [ ] 前端扣点失败文案按 locked 细化（区分「积分冻结」与「余额不足」，沿自 2026-10-07 待办）

## 2026-11-23 全家族时长调整

- 撤销 vocab 服务端只统计豁免与本地 5/15 分钟双计时，改由 portal 全家族共享池统一控制。
- 游客 10 分钟/天、注册免费用户 20 分钟/天、有效会员不限时；邀请加成与儿童模式不变。
- 学习入口和超时事件均接入硬门禁，v1.2.48。
