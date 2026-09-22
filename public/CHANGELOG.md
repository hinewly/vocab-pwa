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
