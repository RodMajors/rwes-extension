# RWES 浏览器扩展迁移 — 系统设计

日期:2026-10-27
状态:已评审通过;本轮已完成 IndexedDB 同步、内容脚本迁移、构建管线及面板初版

## 1. 背景与目标

RWES(魔兽世界常用网站中文用户体验增强)目前以油猴脚本形式运行(仓库 `C:\projects\RWES`)。现决定迁移为浏览器扩展并上架三大商店(Chrome Web Store / Microsoft Edge Add-ons / Firefox AMO),**完全替换并停维护油猴版**。扩展化带来三个收益:代码可拆分分层、新增点击图标的设置面板、商店正规分发与自动更新。

现状盘点(迁移基础):
- 词典后端(importer + FastAPI 服务器)保持不变,继续以 `https://wowdata.rodmajors.com` 发布。
- 客户端现有能力:文本节点翻译引擎(translateText/DOM 扫描/ID 兜底/后缀前缀规则)、词典同步(manifest sha256 diff、增量下载、IndexedDB 缓存)、站点功能(跳转简中/去广告/链接改写/whTooltips 强制)、42 张 DBC 表 + custom 词条词典。
- 24 个 Node 纯逻辑测试已随迁,并由本仓库的 `src/content/legacy.cjs` 提供翻译逻辑。

## 2. 关键决策(已与用户确认)

| 决策项 | 结论 |
|---|---|
| 油猴版关系 | 完全替换,停维护;仓库归档并引导用户迁移 |
| 技术栈 | 纯 JS + esbuild 打包(不引入 TypeScript) |
| 面板功能 | 4 个开关 + 词典版本/同步状态/缓存大小 + 重新同步/清空缓存按钮 |
| 仓库 | 新建 `C:\projects\rwes-extension` |
| 词典分发架构 | 后台同步 → 扩展后台 IndexedDB → 内容脚本按表读取(方案 A 修订) |
| 三平台策略 | 单代码库,构建产出 dist/chrome、dist/edge(= chrome)、dist/firefox |

## 3. 总体架构与数据流

### 3.1 词典分发(核心决策:方案 A)

- **后台**(Chrome service worker / Firefox 事件页):负责 manifest 检查、逐文件 sha256 diff、下载变化的 .json.gz、校验 SHA-256,并以单个 IndexedDB readwrite 事务写入全部变更及版本 meta;失败时保留旧版本。
- **词典存储**:扩展 origin 下共享的 IndexedDB(数据库 `rwes-dict`,stores `meta` 与 `files`),只保存 gzip 二进制 `ArrayBuffer`。扩展 origin 的配额独立于站点 origin,按需申请持久存储;不将词典复制到 `storage.local`。
- **内容脚本**:`document_start` 注入后从后台分块请求需要的 gzip 表 → `DecompressionStream` 解压 → 懒加载构建内存 Map → 翻译/扫描。数据搬运仅按表批量进行,不进行逐词条消息查询;后台不依赖页面 origin 的 IndexedDB。
- 不选"后台消息逐词条查询"(175k 词条往返不可行);不选"内容脚本自行 fetch"(MV3 内容脚本受页面 CORS 限制)。

```
[后台 SW/事件页]                      [内容脚本(document_start)]
  fetch manifest ──┐                     runtime 按表批量取 gz
  sha256 diff      │                     ├─ 解压 → 内存 Map(懒加载)
  下载变化表/校验 ─┼─► IndexedDB(原子事务)
  写版本 meta      │                     ├─ DOM 扫描翻译(隔离世界)
                   │                     └─ 跳转/去广告/链接改写
[面板 popup]       │
  开关 + 版本/缓存大小显示
  重新同步/清缓存 → runtime.sendMessage → 后台
```

- 设置(开关)存 `storage.local`;后台/内容脚本/面板通过 `storage.onChanged` 联动。词典仅在扩展 origin IndexedDB;内容脚本的数据通过受校验的 runtime 消息按表读取。
- 翻译总开关关闭时即时生效:内容脚本收到 storage.onChanged 后,后续扫描不再翻译(已替换的中文文本不回溯还原,刷新页面后恢复英文;与油猴版行为一致)。

## 4. 仓库结构

```
rwes-extension/
├─ src/
│  ├─ background/
│  │  ├─ entry.js          # 平台入口差异(Chrome: SW 生命周期+onMessage;Firefox: 事件页,同一套监听逻辑)
│  │  └─ sync.js           # 词典同步核心(自 RWES.syncDictionary 迁移,GM_xhr → fetch)
│  ├─ content/
│  │  ├─ main.js           # 启动编排:读设置 → 确保词典 → 扫描调度(debounce/MutationObserver)
│  │  ├─ translate.js      # 纯逻辑:diffManifest/parseArtifact/lookup/translateText/规则(直接搬 + 24 测试随迁)
│  │  ├─ dom.js            # DOM 引擎:scanTextNodes/translateItemLink/translateDataWowhead/translateAttrs
│  │  ├─ sites.js          # 站点功能:Wowhead 跳转/WCL cn/去广告/链接改写(原 boot 逻辑)
│  │  └─ page-hooks.js     # whTooltips/Locale 强制(以 MAIN world 注入,见 5)
│  ├─ popup/
│  │  ├─ popup.html
│  │  ├─ popup.css
│  │  └─ popup.js          # 开关/状态/按钮
│  └─ shared/
│     ├─ settings.js       # 设置键名/默认值/读写封装
│     └─ constants.js      # 表清单/黑名单/规则常量共享
├─ build.mjs               # esbuild 打包 + 三平台 manifest 生成 + zip
├─ manifest.base.json      # 公共 manifest,平台差异字段由 build 注入
├─ assets/icons/           # 16/32/48/128 PNG(由 icon.svg 渲染)
├─ tests/                  # 纯逻辑 Node 测试(随迁自 RWES)
└─ dist/{chrome,edge,firefox}/
```

## 5. 关键迁移映射(GM_* → chrome.*)

| 油猴 | 扩展 |
|---|---|
| GM_addStyle | 内容脚本注入 `<style>` 元素 |
| GM_getValue/GM_setValue | chrome.storage.local(shared/settings.js 封装) |
| GM_registerMenuCommand | 面板开关(必要时再加 contextMenus) |
| GM_xmlhttpRequest | 后台 fetch + `host_permissions: ["https://wowdata.rodmajors.com/*"]` |
| @match / @run-at document-start | content_scripts.matches / run_at: "document_start" |
| window.whTooltips / window.Locale 覆盖 | manifest 声明独立 `world: "MAIN"` 的 `document_start` 脚本,确保页面脚本前注入(Chrome 111+ / Firefox 128+) |
| IndexedDB 词典缓存 | 继续使用扩展 origin IndexedDB,由后台同步/事务更新;内容脚本按表从后台读压缩数据(避免页面 origin 隔离及 `storage.local` JSON 序列化大词典) |

其余(文本节点扫描、MutationObserver、DOM 改写)在隔离世界内容脚本中照常工作,无需改造。

## 6. 三平台 manifest 差异与构建

| 项 | Chrome | Edge | Firefox |
|---|---|---|---|
| MV | 3 | 3 | 3(128+) |
| 后台 | background.service_worker | 同 Chrome | **background.scripts(事件页)** |
| 后台打包 | SW 支持 type:module | 同 | 事件页 ESM 支持不稳 → 打成单文件 IIFE |
| 商店字段 | — | — | browser_specific_settings.gecko.id 必填 |
| 产物 | dist/chrome | 复用 dist/chrome | dist/firefox |

build.mjs:`node build.mjs [chrome|edge|firefox|all]` → esbuild 打包(内容脚本/面板/后台按平台入口)→ 生成 manifest(background 字段、gecko id、版本号注入)→ 复制图标 → 输出 zip。**实际维护 2 个变体**(chrome+edge 同包)。

## 7. 面板设计(vanilla HTML/CSS/JS)

```
┌─────────────────────────────┐
│ 🎴 RWES · 魔兽中文增强  v1.x  │
├─────────────────────────────┤
│ ☑ 自动翻译英文名词            │
│ ☑ Wowhead 跳转简中           │
│ ☑ WCL 跳转 cn               │
│ ☐ 测试服强制正式服           │
├─────────────────────────────┤
│ 词典:12.1.5.70391-87df762…   │
│ 同步状态:✓ 已是最新 / ⟳ 同步中│
│ 缓存:12.4 MB · 44 张表        │
│ [⟳ 重新同步]  [🗑 清空缓存]    │
├─────────────────────────────┤
│ 反馈 · 脚本主页               │
└─────────────────────────────┘
```

- 开关语义直接迁移现有 4 项(翻译总开关/Wowhead 跳转/WCL cn/测试服强制);默认值与油猴版一致。
- 状态区数据:面板打开时向后台发送一次消息取当前版本/构建号/缓存字节数/表数量。
- 重新同步/清缓存:面板 → runtime.sendMessage → 后台执行 → 完成后 storage.onChanged 通知内容脚本重载词典。

## 8. 上架准备

- 图标:由 icon.svg 渲染 16/32/48/128 全尺寸 PNG(透明背景,渲染流程已验证)。
- 隐私说明(三商店必填):仅访问 `wowdata.rodmajors.com` 与 @match 列表站点;下载的词典为数据文件而非远程代码;不收集、不上传任何用户数据;缓存仅存本地。
- 商店描述:复用 greasyfork 附加信息(改措辞)。
- 审核注意:`unlimitedStorage` 权限需说明用途(本地 IndexedDB 词典缓存);MAIN world 的 `document_start` 脚本用于将 Wowhead 提示语言设为简体中文。
- 版本策略:三商店版本号独立维护(build 注入),与油猴版版本断档无影响。

## 9. 实施批次

1. **仓库 + 构建管线**:git init rwes-extension;esbuild + build.mjs + manifest.base;产出三平台可安装骨架(面板占位、内容脚本 hello-world);本机三浏览器装包验证。
2. **设置与后台同步**:shared/settings.js;background/sync.js 迁移(diff/增量/清缓存/版本 meta);storage.local 读写;Node 测试随迁。
3. **内容脚本迁移**:翻译逻辑、DOM 扫描、站点适配和 page-hooks(MAIN world 注入);内容脚本通过后台从 IndexedDB 分批读取 gzip 表并构建内存 Map;纯逻辑 Node 测试全绿,浏览器实测翻译/跳转/去广告。
4. **面板完整功能**:开关联动(storage.onChanged 热生效)、状态显示、按钮。
5. **商店准备与提交**:图标全尺寸、隐私说明/描述、三商店提交;油猴版仓库归档(README 停维护声明 + 新扩展链接)。

每批验收:三平台(Edge/Chrome/Firefox)本机加载 dist 产物,核心场景(翻译、跳转、去广告、面板联动)回归。

## 10. 明确不做(YAGNI)

- 不做 TypeScript 化、不引入 UI 框架(面板 vanilla)。
- 不做词典服务器外的多环境切换(生产地址固定 wowdata.rodmajors.com;开发用浏览器直接加载 dist 即可)。
- 不做缺译词条上报/更新日志面板(后续按需)。
- 不保留油猴版双轨维护。
