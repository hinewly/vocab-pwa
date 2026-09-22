# vocab-pwa · 背单词

> **英文名**：`vocab-pwa`
> **中文名**：背单词
> **原项目**：`/Users/zoujiean/TraeWork CN/背单词`（V1.20，保留作为权威源）
> **当前状态**：PWA 改造进行中（基于原项目 V1.20 快照起步）

---

## 一、项目说明

这是一个**纯前端的英语单词记忆 PWA**（Progressive Web App）。

原项目是本地双击即用的 HTML 应用（V1.20），现在改造为：

- ✅ 浏览器中可一键"添加到主屏幕"，像原生 App 一样启动
- ✅ 完全离线使用（Service Worker 缓存全部静态资源）
- ✅ 学习记录用 IndexedDB 持久化（容量更大、更可靠）
- ✅ 跨平台运行（Chrome / Edge / Safari / iOS / Android）

---

## 二、核心功能

| 模块 | 说明 |
|---|---|
| 📚 词库 | 5 个分类（初中 / 高中 / 四级 / 六级 / 专业），共 **6722 词** |
| 💬 短语本 | 410 条短语（初中 / 高中 / 开发） |
| 🏷️ 标签分级 | 认识 / 模糊 / 重点 / 必背 / 过关，5 档颜色 |
| 🎯 掌握度 | 各分类目标值（初中 99% / 高中 95% / 四级 90% / 六级 90% / 专业 95%）|
| ⏱️ 倒计时 | 学习节奏可调（默认 3-5 秒/词） |
| 🔊 发音 | 有道真人发音 + Web Speech API 兜底 |
| 🔍 查词本 | 跨分类搜索 + 自动收录 + 查词次数统计 |
| 📅 打卡 | 连续打卡天数 + 累计学习记录 |

---

## 三、文件结构

```
vocab-pwa/
├── README.md             ← 本文件
├── DESIGN.md             ← V1.20 设计文档（来自原项目）
├── 开发计划.md            ← 来自原项目
├── 更新日志.md            ← 来自原项目
├── index.html            ← 入口（含 PWA meta + SW 注册）
├── app.js                ← 主逻辑（V1.20 + 多用户档案系统）
├── style.css             ← 样式（含 profile / contact-footer 等）
├── manifest.json         ← PWA 应用清单
├── service-worker.js     ← 离线缓存（自动 CACHE_VERSION bump）
├── data.js               ← 6722 词词库（700 KB）
├── phrases.js            ← 410 条短语（51 KB）
├── icons/                ← PWA 图标（192/512/maskable-512/favicon）
├── build-data.js         ← 词库构建脚本
├── build-phonetic.js     ← 音标补全脚本
├── 单词资料/              ← 源数据（更新词库时使用）
├── 单词数据-拆分/         ← 源数据
└── 英语语法/              ← 笔记（保留）
```

---

## 四、PWA 改造进度

- [x] 项目目录创建、AGENTS.md 偏好记录
- [ ] `manifest.webmanifest`（应用清单）
- [ ] `sw.js`（Service Worker，离线缓存 + 版本管理）
- [ ] `icons/`（192×192 / 512×512 / maskable）
- [ ] localStorage → IndexedDB（14 个 key 平移）
- [ ] 备份/恢复改通用方案（下载/上传 JSON，跨浏览器）
- [ ] HTTPS 部署
- [ ] 安装到主屏幕测试（iOS / Android / Chrome）

---

## 五、与原项目的关系

| | 原项目（TraeWork CN/背单词） | 本项目（vocab-pwa） |
|---|---|---|
| 状态 | 活跃维护中（V1.20） | 改造中 |
| 运行方式 | 双击 index.html 本地打开 | PWA 安装后从主屏幕启动 |
| 备份 | File System Access API（仅 Chrome）| 下载/上传 JSON（全平台）|
| 持久化 | localStorage | IndexedDB（改造后）|
| 用途 | 您的日常主力使用 | 验证 PWA 改造 + 跨设备分享 |

**原则**：原项目作为权威源保留不动。本项目改造过程中如发现原项目需要修复，会把改动同步回原项目。

---

## 六、设计参考

- 📐 设计文档：[DESIGN.md](./DESIGN.md)
- 🛠️ 开发计划：[开发计划.md](./开发计划.md)
- 📝 更新日志：[更新日志.md](./更新日志.md)

## 七、版本更新

所有版本变更记录见 [`CHANGELOG.md`](./CHANGELOG.md)。
