# RodMajors' WOW Enhance（RWES）

面向《魔兽世界》玩家的浏览器扩展，为常用的游戏数据库、战斗日志、配装模拟和攻略网站提供中文体验增强。RWES 可以翻译游戏专有名词、将 Wowhead 和 Warcraft Logs（WCL）切换到简体中文，并清理部分页面广告和冗余版面，让浏览外文资料更轻松。

扩展支持 Chrome、Microsoft Edge 和 Firefox。Chrome 与 Edge 使用同一份扩展构建；Firefox 使用独立的兼容构建。

## 主要功能

### 游戏名词自动翻译

RWES 使用由《魔兽世界》客户端数据构建的在线词典，并将下载的数据缓存于本地 IndexedDB。词典按文件校验和增量同步；已有缓存可离线使用。

- **按 ID 精确翻译**：识别 Wowhead 链接及 `data-wowhead`、`data-item-id` 等属性中的游戏对象 ID，查找对应的简体中文名称。
- **英文名称匹配**：将页面中的完整英文名称与词典匹配，不做逐词替换，尽量避免改变普通句子。
- **组合名称与文本规则**：支持专精与职业组合名、已知括号后缀，以及常见的版本、物品等级等固定前缀。
- **站点界面词条**：提供部分手工维护的游戏及站点常用词条翻译。
- **增量更新与离线缓存**：扩展定期检查词典版本，只下载变化的词典文件，并保留本地缓存供后续访问使用。

翻译仅作用于页面中与词典或规则匹配的文本；不修改服务器数据，也不执行下载的词典文件。

### Wowhead 简体中文体验

- 可选择将 Wowhead 页面自动跳转到简体中文页面。
- 页面内指向 Wowhead 的链接和 Wowhead 鼠标提示会尽可能使用简体中文。
- 可选开启测试服链接改为正式服简中地址；该选项默认关闭。

### Warcraft Logs 简体中文跳转

可选择将常规 Warcraft Logs 页面跳转到 `cn.warcraftlogs.com`。classic、vanilla、season、PTR 和 beta 等特殊版本地址会保留。

### 页面清理

在 Wowhead、Warcraft Logs 和 Raider.io 上隐藏部分广告位或冗余区域，并在 Wowhead 上调整部分版面布局。实际效果可能随网站页面结构变化而有所不同。

## 支持的网站

| 用途 | 网站 |
| --- | --- |
| 游戏数据库与攻略 | Wowhead、Icy-Veins |
| 战斗日志 | Warcraft Logs（WCL） |
| 配装与模拟 | Raidbots、LiquidArmory、Questionably Epic（QE Live）、Archon、Murlok、KeystoneLoot |
| 战斗分析 | WowAnalyzer、Wipefest |
| 排行榜 | Raider.io、MythicStats |
| 其他游戏工具 | Bloodmallet、Maxroll、MythicTrap、Lorrgs、SimulationCraft |

扩展仅在 manifest 声明的相关站点运行。新增或变更支持范围时，以商店发布的版本和扩展权限说明为准。

## 设置与使用

安装扩展后，点击浏览器工具栏中的 RWES 图标打开设置面板。面板提供以下选项：

- **自动翻译英文名词**：控制页面游戏名词翻译，默认开启。
- **Wowhead 自动跳转简中**：控制 Wowhead 页面跳转，默认开启。
- **WCL 自动跳转简中**：控制常规 WCL 页面跳转，默认开启。
- **测试服链接改正式服**：控制 PTR、beta 等测试服链接改写，默认关闭。
- **重新同步**：立即检查并同步词典。
- **清空缓存**：删除扩展本地保存的词典数据；之后需要重新下载。

面板还会显示词典版本、同步状态和本地缓存占用。翻译开关关闭时，当前页面上已替换的中文文本不会自动还原；刷新页面后将以原始页面内容重新显示。

## 词典来源与致谢

游戏词典从《魔兽世界》客户端数据构建：由 [wow.tools.local](https://github.com/Marlamin/wow.tools.local) 导出，经 [wow-data-importer](https://github.com/rodmajors/wow-data-importer) 处理，再由 RWES 词典服务发布。扩展只下载词典数据文件，不下载或执行远程脚本代码。

部分手工维护的站点界面词条参考了 zyydi 的《wow 翻译器》（Greasy Fork 脚本 594114，MIT 许可），在此致谢。

## 隐私与权限

- **网站访问**：扩展只在上文列出的魔兽世界相关网站运行，用于翻译页面文本、修改相关链接和清理页面元素。
- **词典服务**：扩展会向 `https://wowdata.rodmajors.com` 请求词典清单及压缩词典文件，以检查版本并更新本地缓存。
- **本地存储**：翻译开关保存在扩展本地设置中；词典 gzip 文件和版本信息保存在扩展自己的 IndexedDB 中。缓存不会在不同网站间重复下载，也不会发送到词典服务器。
- **数据收集**：RWES 不收集、不上传浏览记录、账号信息或个人数据。访问网站时产生的请求由相应网站本身处理。
- **存储权限**：`storage` 用于保存扩展设置和轻量同步状态；`unlimitedStorage` 用于在本地保存较大的词典缓存。网站访问权限用于在支持网站上运行扩展，词典主机权限用于获取词典数据。

## 反馈与项目主页

如遇到翻译缺失、误翻、页面兼容问题或希望支持新网站，请通过 [RWES GitHub 项目主页](https://github.com/RodMajors/rwes-extension) 提交反馈。反馈时可附上网站地址、相关英文文本及问题截图；请勿提交账号、密码或其他敏感信息。
