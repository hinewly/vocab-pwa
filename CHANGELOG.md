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

<!-- 模板（以后新版本复制这段往下加） -->
<!--
## [v1.0.1] - 2026-XX-XX

### ✨ 新增
-

### 🐛 修复
-

### 🔧 工程化
-

### 📝 文档
-
-->
