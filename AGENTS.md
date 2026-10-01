# vocab-pwa 项目约定

> 本文件为项目级规则，叠加在 `/Users/zoujiean/CodeX/AGENTS.md`（目录级通用约定）之上。
> Codex 从项目目录逐级向上读取 AGENTS.md，越靠近项目优先级越高。

## 发布与版本号（用户 2026-09-28 确定）

本项目有**两条发布线**：

1. **GitHub Actions → GitHub Pages**：push main 自动触发部署，云端 build-time 自动 bump CACHE_VERSION（不回写仓库）
2. **WorkBuddy 发布**：由 WorkBuddy 侧手动触发，上传 `public/` 当前磁盘内容，**不会自动 bump**

### 因此：改代码必须手动递增版本号

**每次修改 `public/` 下任何文件后，必须递增以下两处再 commit：**

- `public/service-worker.js` 的 `CACHE_VERSION`（缓存依据，不改则客户端看不到更新）
- `public/app.js` 的 `APP_VERSION`（界面显示用，顺带同步）

### 版本号写法

- 用**递增号**：`v1.2.8` → `v1.2.9`
- **不要用 commit sha**：版本号必须先写进文件才能 commit，写入时拿不到本次 sha（鸡生蛋）
- 服务端的 sha 后缀（如 `v1.2.8-a1b2c3d`）只由 GitHub Actions 在云端生成，本地不要模仿

### 分工边界

- **代码改动（功能、词库、配置）只在本项目目录内做**
- **WorkBuddy 侧只负责发布**，不修改源码；发布前会只读校验 CACHE_VERSION 是否变化，未变化则提示
