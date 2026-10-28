# RWES 后续工作

## Maxroll 技能描述 Tooltip 汉化

- [x] 在 importer 中从 `spell.csv` 发布技能描述词典，包含 `ID`、`Description_lang` 和 `AuraDescription_lang`。
- [x] 在扩展中按 Maxroll 的 `.wow-spell[data-wow-id]` 关联动态生成的 `.mxt-Tooltip`。
- [x] 实现可验证的描述模板占位符映射：匹配 `$t1`、`$d`、数值占位符及 `$@spellname<ID>`；名称按 spell ID 查词典。
- [x] 对 Maxroll 已计算后的英文描述套用中英文模板；占位符不匹配或描述无法精确匹配时保留原文。
- [x] 通过 Maxroll 站点词典翻译 Tooltip 固定字段，例如 `Instant`、施法距离和持续时间。
- [ ] 补充动态 Tooltip、重复悬浮、SPA 页面切换和未知技能 ID 的回归测试。

已确认示例技能 `1228214` 在 `spellname.csv` 和 `spell.csv` 中均有完整中英文数据。当前 importer 会发布 `spelldescription.json.gz`；扩展只在 Maxroll 加载该文件，并仅在英文页面文本与技能 ID 对应模板匹配、且中英文占位符集合一致时替换描述。仍需通过实际页面验证 Tooltip 生命周期及 SPA 行为。
