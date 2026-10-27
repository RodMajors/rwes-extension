# RWES 浏览器扩展

魔兽世界常用网站中文体验增强。当前为迁移实施中的开发版本；功能沿用 RWES 油猴版，词典由后台同步到扩展 origin 的 IndexedDB。

## 开发

需要 Node.js 16 或更新版本。

```powershell
npm ci
npm test
npm run build
```

`dist/chrome` 可通过 Chrome 或 Edge 的“加载已解压的扩展程序”安装；`dist/firefox` 可在 `about:debugging#/runtime/this-firefox` 临时载入。打包文件位于 `dist/chrome.zip` 与 `dist/firefox.zip`。

构建目标可指定为 `node build.mjs chrome`、`node build.mjs edge` 或 `node build.mjs firefox`。Chrome 与 Edge 共用 MV3 产物。Firefox 128+ 支持 MAIN world 页面钩子。

## 隐私

扩展只在 README 所列的魔兽世界相关网站运行。词典请求发往 `https://wowdata.rodmajors.com`，作为 gzip 数据文件下载并保存在本地 IndexedDB。扩展不收集或上传个人数据。

## 迁移来源

纯翻译逻辑、站点规则和 DOM 扫描迁移自同一组织的 RWES 油猴版；历史说明与 Greasy Fork 文案归档在 `docs/`。
