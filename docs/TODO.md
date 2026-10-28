# RWES 后续工作

## Maxroll 技能描述 Tooltip 汉化

- [ ] 在 importer 中从 `spell.csv` 发布技能描述词典，至少包含 `ID`、`Description_lang` 和 `AuraDescription_lang`。
- [ ] 在扩展中按 Maxroll 的 `.wow-spell[data-wow-id]` 关联动态生成的 `.mxt-Tooltip`。
- [ ] 研究并实现 WoW 描述占位符展开，例如 `$t1`、`$d`、`$1244998s1`、`$@spellname1228211`。
- [ ] 对 Maxroll 已计算后的英文描述设计中英文模板参数映射；不能安全展开时保留原文。
- [ ] 翻译 Tooltip 固定字段，例如 `Instant`、施法距离和持续时间。
- [ ] 补充动态 Tooltip、重复悬浮、SPA 页面切换和未知技能 ID 的回归测试。

已确认示例技能 `1228214` 在 `spellname.csv` 和 `spell.csv` 中均有完整中英文数据；目前缺口是 importer 尚未发布描述字段，以及动态占位符尚未展开。
