# RWES

魔兽世界常用网站中文用户体验增强油猴脚本。

## 自动翻译功能

- 词典来源:本地 wow-tools-local 提取全量游戏数据,经 wow-data-importer 生成词典产物,由 rwes-dict-server 发布。
- 客户端:manifest 版本比对 → IndexedDB 增量同步 → 本地查表翻译(全名精确匹配 + ID 查询)。
- 首次全量下载约 5-8MB(后台静默),之后仅按版本增量更新。
- 服务器地址在脚本内 `DICT_SERVER_DEFAULT` 修改(或部署前替换 `@connect` 域名)。

## 开发

```bash
node tests/run.js   # 纯逻辑单测
node --check RWES.js
```
