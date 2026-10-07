# vocab-pwa 交接文档（待办区）

> 按家族总规则（daobox-home/AGENTS.md「待办同步（强制）」）建立：本文件是背单词项目后续工作的唯一待办入口。

## 待办
- [x] 激活 API 域名修复（2026-10-04，v1.2.25）：根因是 10/3 迁移 vocab.daobox.app 时 daobox.app 路由让位给首页 worker，前端 UNLOCK_API_BASE 未同步改；已改为 https://api.daobox.app 并部署验证
- [ ] 建立完整 HANDOFF.md 战略/状态/技术备忘章节（当前仅有待办区）
- [x] /admin/login 防爆破锁定（2026-10-07 完成并部署验证）：错 5 次锁 10 分钟指数翻倍；顺带修复 recordFail resetCycle bug（过期后计数永不累计，同样影响 /api/activate）；详见 daobox-home/docs/handoff/admin-user-management-login-throttle.md

## 会话记录（2026-10-08 凌晨）

- v1.2.33 上线：portal.js 接入 data-time="off"——vocab 豁免全家族时长配额（登录即解锁逻辑不动，用户后续玩法未定）
- 打卡桥接 /api/checkin 保留，但服务端额度奖励已取消（返回 granted:false）

## 待办

- [ ] vocab 玩法待用户想清楚后单独设计（是否纳入时长/付费体系）
- [ ] 前端扣点失败文案按 locked 细化（区分「积分冻结」与「余额不足」，沿自 2026-10-07 待办）
