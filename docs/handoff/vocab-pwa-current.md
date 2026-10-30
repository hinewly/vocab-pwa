# vocab-pwa 当前会话交接

- last_updated: 2026-10-12 20:06
- status: active
- version: v1.2.35
- latest_commit: 246c4c6
- related_docs:
  - docs/handoff/points-rollout.md（点数系统细节，最活跃）
  - docs/handoff/payment-flow.md
  - docs/handoff/profile-data-management.md

## 任务目标

背单词 PWA 持续维护：收费主线已切换为"点数日卡"（见 points-rollout.md），本文件记录应用本体状态。

## 当前状态（2026-10-12）

### v1.2.35 身份体系统一（方案A：账号即用户，2026-10-12 用户拍板）
- **本地多档案体系下线**：原「默认用户/新建用户/切换/改名/删除」本地 profile 全部移除，头部 chip 改为「⚙️ 备份 / 设置」入口
- **学习数据按身份存储**：登录 → `wa:acc{id}:*` 前缀（portal.js 异步 /api/me 拿账号 id，启动最多等 2.5s）；游客 → `wa:guest:*`
- **启动归一 normalizeStorage()**：旧「当前激活档案」数据自动并入当前身份，其余本地档案与 `wa:profiles`/`wa:active-profile`/`wa:migrated-v2` 元数据清理（其余档案弃用是用户拍板）
- **云备份改为只备份当前身份**的 `wa:{身份}:*` 键（原为整包含档案快照），并改用 Cookie 鉴权（credentials:include + DaoBox.user 判断，原 getToken 在 vocab 域 localStorage 为空、Auth 头不可用）
- **导入备份**直接进当前身份，不再建「导入数据」档案
- 用户管理页改为「备份与恢复」页（本地备份/自动备份/云备份/全部清除），路由仍是 #/profile
- 教训：改动前旧快照云备份恢复到新版本会带回归档元数据，normalizeStorage 在启动兜底清理

## 当前状态（2026-10-06）

### 收费/解锁逻辑（关键！多次反转，以最新为准）
- **解锁仅凭激活码**：isUnlocked() = localStorage wa:unlocked==='1'，登录 DaoBox 不解锁（v1.2.23 定稿，学习类必须收费）
- 点数日卡主推：1 点=1 天，gateStudy 门槛 = 激活码 → 今日已激活 → 免费时长（未登录 5 分钟/天，登录 15 分钟/天，本地按天计时，过午夜重置）→ 扣 1 点 → 引导充值；离线放行（v1.2.30 起改为按时间制，纯前端 localStorage，服务端零改动）
- 激活码买断入口折叠弱化 + 买断意向登记按钮
- 试学额度：TRIAL_LIMITS = senior:300, cet4/6:100, major:100（list.slice 固定取前 N，非随机）；初中全免

### 版本线（v1.2.22 → v1.2.29）
- v1.2.22 试学横幅醒目化 + 非初中词本编号（第 N/total 词 + 列表 #编号）
- v1.2.23 解锁去登录化（收费回调）
- v1.2.24 开发计划页修复：public/DEVPLAN.md（原 fetch 根目录 开发计划.md 线上 404）
- v1.2.26（并行会话）：点数系统核心接入（档位+门槛+免费额度）
- v1.2.27 SW 缓存失效修复（版本撞号教训）
- v1.2.28 文档：截图存 D1 定稿
- v1.2.29 充值截图上传 + 买断意向 + 48h 处理承诺文案
- v1.2.30 免费额度改按天计时制（未登录 5 分钟 / 登录 15 分钟，学习页倒计时条，删服务端 quota/consume 调用）
- v1.2.31 首页底部加"返回 DaoBox 工具箱"链接（原链接一直在 profile 页）
- v1.2.32 首页移除"开发计划 / 更新日志"卡片（页面保留，仅不露出）

### 部署（已验证流程）
- 两条线：GitHub Actions→GitHub Pages（push main 自动）+ Cloudflare Worker（vocab.daobox.app 主站）
- **可靠部署**：`zsh /Users/zoujiean/CodeX/daobox-home/worker/cf.sh deploy --config /Users/zoujiean/CodeX/vocab-pwa/worker/wrangler.toml`
- deploy.sh 的 wrangler 步骤会静默失败，弃用
- 每次改 public/ 必 bump APP_VERSION + CACHE_VERSION（真实递增），部署后 curl 验证 APP_VERSION

### 域名/架构
- vocab.daobox.app = Cloudflare Worker 托管 public/ + 激活码 API（api.daobox.app）
- daobox.app = daobox-home Worker（账号/备份/点数/配额，D1 共库）
- 管理台 daobox.app/admin（用户名密码登录，代理 vocab 验证）+ daobox.app/admin/stats

## 待办

- [ ] 点数真实订单 E2E（见 points-rollout.md）
- [ ] shici/suan 两工具同步"按天计时"免费额度（vocab 已完成，口径：5/15 分钟/天）
- [ ] 包 4 单词整理批量管理页 / 包 5 例句 / 包 6 词缀收尾：用户明确说"思路没想明白，先不做"
- [ ] PWA 与浏览器标签数据同步（待定事项，用户未拍板）

## 用户偏好（务必遵守）

1. 改代码前先沟通方案，明确同意才动手（多次批评过擅自改）
2. 部署后浏览器实测，不能只语法检查
3. 交接文档统一处理，不要频繁问要不要写
4. 中文沟通、通俗解释；用户非技术背景
