# 更新日志

所有 PWA 版本（v1.0.0+）的更新记录。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [v1.0.0] - 2026-09-22

🎉 **首次 PWA 发布**

从 `/Users/zoujiean/TraeWork CN/背单词` V1.20 改造而来，全部 6722 词 + 410 短语数据保留，所有学习记录通过一次性迁移自动搬到「用户1」档案。

🔗 **在线访问**：https://hinewly.github.io/vocab-pwa/

### ✨ 新增

- **PWA 三件套**（`manifest.json` + `service-worker.js` + `icons/`）
  - 应用名 `背单词 · 每日强化`，绿色主题 `#059669`
  - 4 个图标（192×192 / 512×512 / maskable-512 / favicon）
  - 离线可用（Service Worker 缓存所有静态资源）
- **多用户档案系统**
  - 13 个 localStorage key 加 profile 前缀（`wa:<id>:labels` 等）
  - 首页右上角 👤 当前用户标签，点击进入 `/#/profile` 管理页
  - 支持：创建 / 切换 / 重命名 / 删除用户档案
  - 一次性迁移：老数据自动搬到「用户1」档案
- **版本号徽章**（header 显示 `APP_VERSION`，commit SHA 后缀）
- **刷新按钮** 🔄（一键清 SW 缓存 + unregister SW + cache-busting 重载）
- **联系邮箱反馈**（首页底部 `mailto:[email protected]`）
- **README.md**（项目说明，中英双语）

### 🐛 修复

- **`escapeHtml` 未定义导致白屏**（renderHome / renderProfile 引用了但未定义）
- **Service Worker 缓存策略缺陷**
  - `cache.addAll` 包含 CDN URL，内置浏览器屏蔽外网导致 install 失败
  - 修复：CDN 资源降级为可选（独立 try/catch）
  - 修复：去掉 `?v=N` URL 机制（跟 SW 缓存 key 不一致导致 fallback 到坏代码）
- **CACHE_VERSION 自动 bump**
  - workflow 注入 commit SHA 后缀，确保每次部署都能命中新版本

### 🔧 工程化

- **GitHub Actions 自动部署**（push `main` 分支即上线）
- **workflow 自动 bump**：
  - `CACHE_VERSION` in `service-worker.js`（SW 缓存失效）
  - `APP_VERSION` in `app.js`（用户可见的版本号）
  - 两者都加 commit SHA 短码做 suffix
- **项目目录重组**：
  - 部署资源（`index.html` / `app.js` / `style.css` / `data.js` / `phrases.js`）放到 `public/`
  - 文档 + 构建脚本 + 源数据 留在项目根
- **`.gitignore`**（参考 lucky-pick 风格）

### 📝 文档

- **`/Users/zoujiean/Codex/AGENTS.md`**：加两条规则
  - 工作风格：拿不准先沟通、列方案、等同意再动手
  - 跨项目借鉴：lucky-pick 有的好功能，vocab-pwa 也应该有
- **`README.md`**：标注 PWA 改造进度（已完成 `[x]`，未完成 `[ ]`）

### 🔢 关联 Git 提交（按时间顺序）

```
a0b448f chore: initial commit from TraeWork CN/背单词 V1.20
20fc7c5 feat(pwa): add manifest + service worker + icons
ae11798 feat(profile): add multi用户 profiles + contact email
c251354 fix(sw): bump CACHE_VERSION to v2 + auto-bump on deploy
1682d3d fix(profile): add missing escapeHtml function
1a201a3 fix(sw): 彻底修复白屏问题
4fa7172 docs: README 更新 PWA 改造进度
927648b feat: 版本号徽章 + 刷新按钮（借鉴 lucky-pick 模式）
```

---

## [v1.0.1] - 2026-09-22

首页 UI 优化 + 版本号可读性修复。

### ✨ 新增

- **首页 5 张分类卡 → 2 列网格布局**
  - 每张卡瘦身：图标 + 名字 + 右上角 [百分比徽章] + 进度条 + "已学 X/total"
  - 页面更紧凑，滚动更少
- **新增 `compactCard()` 统一模板函数**
- **首页新增 3 张导航卡**（之前是简易按钮）
  - 📊 学习统计（每日数据 · 标签分布）
  - 📋 开发计划（V1.20 路线 · 后续规划）
  - 📝 更新日志（版本变更记录）
- **10 张卡统一紧凑风格**：5 分类 + 短语本 + 查词本 + 3 导航，全部进 `.cats-grid`
- **联系邮箱 footer 移到 main 末尾**（之前夹在卡片中间）

### 🐛 修复

- **版本号徽章对比度过低**（白字叠 20% 透明白叠绿底，几乎看不见）
  - 修复：背景透明度 0.2 → 0.5，字色改深绿 `#047857`，字重 500 → 600

### 🔧 工程化

无（纯 UI 调整）

### 📝 文档

无

### 🔢 关联 Git 提交

```
0fbe2c6 ui(home): 分类卡 2 列网格布局（紧凑版 + 百分比右上角徽章）
c995d40 ui(home): 统一所有卡片为紧凑风格 + 修版本号对比度
```

---

## [v1.0.2] - 2026-09-22

改名交互修复 + 首页卡片分组 + 邮箱真实显示 + 对比度修复。

### ✨ 新增

- **首页卡片分两组**（section header + cats-grid）
  - "📚 学习" 组：5 分类 + 短语本 + 查词本
  - "🛠️ 系统" 组：学习统计 + 开发计划 + 更新日志
- **系统卡差异化样式**（虚线 border + 浅灰底 + › 箭头）
- **更新日志页面接入 CHANGELOG.md**（之前是坏的，fetch 404）

### 🐛 修复

- **profile-chip 用户名看不见**（跟版本号同款问题：白字 + 20% 透明 + 绿底 = 看不见）
  - 修复：背景 0.15 → 0.4，字色改深绿 `#047857`
- **改名按钮没反应**（用了 `prompt()`，PWA / 移动浏览器经常被拦截）
  - 修复：改用**行内编辑**模式（点改名 → 名字变 input，回车保存、ESC 取消）
- **footer 邮箱不显示**
  - 原因：JS 写在 `innerHTML` 模板字符串里，浏览器**不会执行 innerHTML 里的 `<script>`**
  - 修复：JS 逻辑挪到 `route()` 函数里 `innerHTML = html` 之后调用

### 🔧 工程化

- **CHANGELOG.md 移到 `public/`**，可被 fetch（在更新日志页面渲染）
- **AGENTS.md 加用户联系方式规则**（统一邮箱 `[email protected]`，HTML 不直接写邮箱字符串）

### 📝 文档

- **AGENTS.md** 加"用户联系方式"小节

### 🔢 关联 Git 提交

```
1039515 fix(profile): 改名功能用行内编辑（替代不可靠的 prompt）
8e99868 ui(home): 学习卡/系统卡分组 + 系统卡差异化样式 + 邮箱修复
e80c474 fix(ui): profile-chip 改对比度（用户名前面看不见）
```

---

## [v1.1.0] - 2026-09-22

新增"常用英语词缀"模块。

### ✨ 新增

- **词缀学习模块** 📐
  - 新增 `data-affixes.js`：**精选 140 条常用英语词缀**（60 前缀 + 80 后缀）
  - 覆盖：反义（un-/in-/dis-）、时间（pre-/post-/fore-）、程度（over-/super-/sub-）、数字（uni-/bi-/tri-）、抽象名词后缀（-tion/-ment/-ness/-ity）、形容词后缀（-able/-ful/-ous/-ive）、动词后缀（-ize/-en/-ify）等
  - 首页新加"📐 词缀"卡（紧凑风格，紫色系）
  - 路由 `#/affix`：词缀总览页（统计 + 数量按钮 10/20/50/100/全部）
  - 路由 `#/affix-study`：词缀学习页（翻面卡 + 标签系统）
  - 路由 `#/affix-result`：本轮结果
  - 加 5 个存储 key：`aLabels/aStudied/aSessions/aTotals/aCursor`（profile-aware）
- **学习流程**：游标推进抽词（避免重复）+ 翻面卡 + 复用 5 标签系统 + 倒计时

### 🐛 修复

无

### 🔧 工程化

无

### 📝 文档

- **开发计划.md** 加"PWA 项目"段落（V1.0.0 - V1.1.0）
- **开发计划.md** 加待定事项：PWA / 浏览器数据同步问题

### 🔢 关联 Git 提交

```
a4ea887 feat(affix): 数据层 + 存储层完成（UI 待补）
（本次提交）feat(affix): 加 UI + 路由 + 学习流程 + CHANGELOG
```

---

## [v1.1.5] - 2026-09-25

修复更新日志漏记录 / 不同步的问题。

### 🐛 修复

- **线上更新日志看不到最新版本**：更新日志页面读取的是 `public/CHANGELOG.md`，但最近记录只写入了根目录 `CHANGELOG.md`，导致两份内容不同步。
- 补录 `v1.1.2`、`v1.1.3` 的更新记录。
- 调整记录顺序，最新版本保持在更前面。

### 🔧 工程化

- 部署时自动把根目录 `CHANGELOG.md` 同步到 `public/CHANGELOG.md`，以后只需要维护一份更新日志。
- `APP_VERSION` 升到 `v1.1.5`
- Service Worker `CACHE_VERSION` 升到 `v1.1.5`

---

## [v1.1.4] - 2026-09-25

新增词缀「批量整理」模式，并把词缀标签按钮拉宽，方便快速分类。

### ✨ 新增

- **词缀批量整理页**
  - 选择 `10 / 20 / 50 / 100 / 全部` 后，先一次性列出本轮词缀
  - 每条词缀展示：词缀、前/后缀、中文释义、例词对照、单独发音按钮、当前标签
  - 支持勾选后一键批量标记：`认识 / 模糊 / 重点 / 必背 / 过关`
  - 提供 `全选 / 取消 / 未标记` 快捷选择，并显示 `已选 n/总数`
  - 批量标记后可继续选择「已勾选」或「全部」进入逐卡学习

### 🎨 优化

- 词缀学习页 5 个标签按钮改为等宽铺满，间距加大到 12px，高度提升到 52px
- 批量页底部标记栏吸附显示，长列表滚动时仍能快速操作

### 🔧 工程化

- `APP_VERSION` 升到 `v1.1.4`
- Service Worker `CACHE_VERSION` 升到 `v1.1.4`

---

## [v1.1.3] - 2026-09-25

优化词缀学习页标签按钮布局。

### 🎨 优化

- 词缀学习页 5 个标签按钮改为等宽铺满。
- 按钮间距加大到 `12px`，高度提升到 `52px`，视觉上更宽松。

### 🔧 工程化

- `APP_VERSION` 升到 `v1.1.3`
- Service Worker `CACHE_VERSION` 升到 `v1.1.3`

---

## [v1.1.2] - 2026-09-25

词缀例词加入发音标识。

### ✨ 新增

- 词缀例词中的每个英文词都加独立 🔊 发音按钮。
- 点击可直接朗读该词，继续使用有道真人发音 + Web Speech 离线兜底。

### 🔧 工程化

- `APP_VERSION` 升到 `v1.1.2`
- Service Worker `CACHE_VERSION` 升到 `v1.1.2`

---

## [v1.1.1] - 2026-09-25

修复「导入备份点了没反应」的问题，并加入 Toast 操作反馈。

### ✨ 新增

- **Toast 通知系统**：右下角浮动提示，4~6 秒自动消失
  - 🟢 成功（导出/导入/自动备份设置成功）
  - 🔴 失败（文件格式错误、刷新失败、浏览器不支持）
- 导入成功提示显示导入的单词 / 短语 / 词缀数量

### 🐛 修复

- **导入备份完全无反应**（核心 bug）：`#import-file` 输入框是 stats 页 innerHTML 动态渲染的，启动时用 `addEventListener` 根本绑不上（`getElementById` 返回 null，`?.` 静默跳过）。改为 document 级事件委托。
- **V1.20 老备份无法导入**：旧版备份只有 `labels` 字段，旧校验却要求 `labels` + `studied` 同时存在，必然报「文件格式不对」。放宽为任一学习记录字段存在即可。
- **重复导入产生多个「导入数据」档案**：现在固定导入到名为「导入数据」的独立档案，已存在则复用。
- 手动导出、设置自动备份、刷新应用等处的阻塞式 `alert()` 全部换成非阻塞 Toast。

### 🔧 工程化

- `APP_VERSION` 升到 `v1.1.1`
- Service Worker `CACHE_VERSION` 升到 `v1.1.1`（旧客户端自动拿到新代码）

---

<!-- 模板（以后新版本复制这段往下加） -->
<!--
## [vX.Y.Z] - 2026-XX-XX

### ✨ 新增
-

### 🐛 修复
-

### 🔧 工程化
-

### 📝 文档
-
-->
