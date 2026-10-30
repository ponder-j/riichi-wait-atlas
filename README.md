# Riichi Wait Atlas

An exhaustive riichi mahjong wait atlas with exact wait-to-hand search and 355,313 canonical hands.

[Live website](https://ponder-j.github.io/riichi-wait-atlas/) | [Exact wait search](https://ponder-j.github.io/riichi-wait-atlas/#view=wait-search) | [Offline HTML](https://ponder-j.github.io/riichi-wait-atlas/downloads/riichi-atlas-offline.html)

13 张门清手牌的全量图鉴，统计恰好听 3–13 种牌的情况。

| 听牌种数 | 数牌、四风、三元牌各自整体置换去重后 |
|---|---:|
| 3 | 305,994 |
| 4 | 39,411 |
| 5 | 8,807 |
| 6 | 932 |
| 7 | 115 |
| 8 | 52 |
| 9 | 1 |
| 10–12 | 0 |
| 13 | 1 |
| 合计 | 355,313 |

## 使用

`dist/index.html` 为网站入口，需以 HTTP 服务打开。`dist/downloads/riichi-atlas-offline.html` 为自包含离线文件，可双击打开，不需要网络或服务器。两者均包含全部手牌，可筛选、分页、检索、验算并查看每种待牌的和牌拆解。

“待牌反查”只支持完整待牌集合完全相同的精确匹配。例如输入 `69p7z`，只返回恰好听 6 筒、9 筒、中三种牌的 13 张手牌。反查会展开数牌花色、四风、三元牌的整体置换，按输入的实际牌名显示全部匹配配置，并合并重复手牌；也可选“每类只看一例”，结果可导出 CSV。检索范围沿用图鉴的 3–13 面听。

### 四张边界与核心牌形

反查和手牌验算提供“考虑一种牌最多只有 4 张”开关，默认不勾选：

- 勾选：按实牌规则计算，手中已有 4 枚的牌不计为待牌。
- 不勾选：按牌形计算，即使补牌需要理论上的第 5 枚，也计入完整待牌集合。现有 13 张手牌始终每种最多 4 枚。

例如 `5666777789m111p` 在实牌规则下听 `456m`，在牌形规则下听 `4567m`，因此不会出现在默认的 `456m` 精确反查中。牌形数据单独穷举，共 375,438 种；也覆盖“实牌不足三面听，但牌形达到三面听”的手牌，不能仅过滤原实牌库代替。

图鉴与反查默认按核心牌形合并。核心由删除 0–3 个完整面子、并可另抽出一个不干扰雀头对子得到，必须在所选规则下保持相同的**完整待牌集合**；保留最短核心，有多个最短候选时先按镜像与同类牌置换下的规范键、再按实际核心键确定性选择一个，使每手牌只归入一组。可以展开查看全部已验算的 13 张配置。

`456m` 的牌形精确反查有 2,143 手实际配置；启用镜像后由 4 种核心合并为 3 种原型，其中 `4455566m＋两个不干扰面子` 合并了 1,004 手。“不干扰”是条件，不能任意无条件更换面子；更换后必须仍合法且完整待牌集合保持不变。三面听的 305,994 种实牌牌型原有 1,276 种核心，合并镜像后为 482 种，再启用待牌对子变量后为 **270 种原型**。默认开启这两种抽象；完整手牌覆盖不变。

导出会保留查询边界：核心 CSV 包含原型编号、公式、XX 标记、已验证 X 取值、原型固定待牌、查询的实际完整待牌及抽象开关。完整手牌 CSV 保留实际完整牌名。离线 HTML 内嵌两套数据和核心索引。

完整 CSV 在 `dist/downloads/all-hands-csv.zip`，按听牌种数分为 11 个文件。SVG 资源与公有领域许可证在 `dist/downloads/mahjong-tiles-svg.zip`。

```sh
npm ci
npm run dev
```


### 镜像与待牌对子变量

两个抽象开关默认开启，也可分别关闭：

- **独立数牌镜像**：各花色可独立作 `1↔9、2↔8、3↔7、4↔6`，再按整体花色与字牌置换规范化。`1234m` 与 `6789m` 查询得到相同的原型编号；每次反查仍只包含实际待牌与输入完全相同的手牌。
- **待牌对子 XX**：如 `78999A + XX + 2M → 69A + X`。A/B/C 是抽象数牌花色；XX 是参与待牌的对子，PP 是另行抽出的不干扰雀头，M 是完整面子。该原型的镜像为 `11123A + XX + 2M → 14A + X`。

XX 抽象是有条件的有限分组：从核心去掉恰有两枚且属于待牌的 X 后，基底 B 必须已能拆成面子与雀头；B 在外部雀头已提供时的待牌 W，须满足 `X ∉ W` 且 `W ∪ {X}` 与原核心的完整待牌集合完全相等。只用已穷举、已验证的 13 张配置构成分组。X 的取值列表与面子不构成可任意相乘的自由选择；网页可筛选本组已经验证的 X，并核对完整手牌。

不统一合并数牌平移或仅按间隔相同的形状：例如 `12` 只听 `3`，`23` 却听 `1/4`。边界和额外待牌都会改变结果。原型键包含完整基底计数、固定待牌与边界模式，避免用短哈希或示例待牌替代严格判定。

`tools/check-abstractions.mjs` 验证镜像查询原型与配置数一致、实际查询牌名不变、两套规则的全部三面听配置恰好归组一次、每种已记录 X 取值的完整手牌及核心可独立求解、三花色各自镜像、错误变量候选被拒绝，以及取消操作。

## 数学口径

- 34 种牌，每种至多 4 枚；无副露、无已宣告的杠，赤五等同普通五。
- n 为恰好能补成标准四面子一雀头、七对子或国士无双的不同牌种数。摸入第五枚同牌不合法，不计入。
- 万、筒、索全部 6 种全局置换为同一类；东南西北全部 24 种整体置换为同一类；白发中全部 6 种整体置换为同一类。三组置换独立组合（群大小 864）。三个数牌花色按 1–9 计数向量降序规范化，四风与三元牌各自按枚数降序规范化。以上原始手牌统计保留数字镜像。原型视图默认进一步合并三个数牌花色各自独立的 1↔9 镜像（最多 8 种），不改写原始统计，也不减少精确查询覆盖。数字平移不统一合并；只改变某个面子花色不构成全局置换。
- 统计形状听牌；牌河、振听、具体场风门风及役种不作为手牌筛选条件。门清可立直或自摸满足役。
- 理论余张数仅扣除本手牌，不代表已知牌局的实际山中可和张数。

## 完整性与独立复核

`tools/enumerate.cpp` 枚举 55 种面子（34 刻子、21 顺子）的四个可重复无序组合，再枚举 34 种雀头，排除超过四枚的牌。对全部标准和牌形逐种移除一张牌，并合并每个规范化 13 张手牌的待牌集合。规范化后相同花色向量与相同字牌枚数的稳定子对称也补齐，因此不遗漏跨同构花色的待牌。

任何标准听牌必然由其 14 张和牌形移除待牌得到，故这个步骤覆盖全部标准听牌。七对子单独只听一种牌，叠加标准形的候选会额外检查；国士单面听因字牌单张不能与标准形叠加，十三面听另加入。

`tools/verify.cpp` 使用独立的逐张摸入、选择雀头、递归拆面子判定，对全部 355,313 个结果及其 34 种摸牌进行复核，检查待牌无漏计、无多计、数量分组和三类置换规范化、无重复。另独立穷举全部 93,600 种单一花色 13 张手牌，其中 11,510 种三面以上听牌与本数据完全一致。

浏览器使用的 JS 解码与第三套递归判定，通过 `tools/check.mjs` 分散抽查及所有 7–13 面听手牌验证。待牌反查额外用独立和牌求解器验证了 53,671 手查询结果；对代表性手牌直接穷举 864 种整体置换，与优化检索结果逐一比对，验证不遗漏被原始数据去重的配置，并检查分页、取消、无结果和非法输入。原始数据哈希与复核结果见 `public/data/manifest.json` 和 `reports/verification.json`。

```sh
npm run enumerate
npm run verify
python3 tools/prepare.py
node tools/check.mjs
node tools/check-wait-search.mjs
npm test
npm run build
```

`data/raw/N.bin` 每条记录 18 字节：前 13 字节为排序后的牌索引（0–8 万，9–17 筒，18–26 索，27–33 东南西北白发中）；后 5 字节为小端 34 位待牌掩码。前 13 张牌经过数牌花色、四风与三元牌各自的全局置换规范化，文件按其计数向量升序排列。

## 参考与资源

- [最高位战日本职业麻将协会竞赛规则](https://saikouisen.com/pdf/saikouisen_regulation.pdf)：第 46 条和牌形与第 48 条相关役种。
- [FluffyStuff/riichi-mahjong-tiles](https://github.com/FluffyStuff/riichi-mahjong-tiles)：本地 SVG 牌面、公有领域。网页为牌面添加可辨认白板的牌身背景。未使用远程图片。
- UI 使用 React、shadcn/ui 组件模式与 Radix Dialog；Lucide 图标。

本统计由项目穷举计算得出，非从规则文献引用的数量。生成日期：2026-10-31。

### 牌形数据与核心索引复现

```sh
npm run enumerate
npm run enumerate:shapes
npm run compile:cores
npm run verify:patterns
npm run prepare:patterns
npm test
npm run build
```

`enumerate-shapes.cpp` 使用六进制编码 14 张完成形，允许至多一个牌种出现第 5 枚，并且只移除该第 5 枚得到合法 13 张手牌；其他完成形逐种移除。完成形含两种第五枚或第六枚时不可能移除一张后合法，因此排除。输出的 13 张牌仍以五进制规范化编码，避免第五枚进位碰撞。

`compile-cores.cpp` 穷举可删除的完整面子组合，对剩余核心逐张尝试摸牌；只有完整待牌掩码相等时才可选为核心。`N.cores` 为每条 13 张记录对应的两字节小端位掩码，低 13 位表示保留哪些牌作为核心，第 13 位（值 8192）表示另有一个外部雀头对子。有外部对子时，核心摸入待牌后仅需拆成完整面子。

独立递归校验器 `verify-patterns.cpp` 已复核全部 355,313 手实牌和 375,438 手牌形数据，包括核心待牌相等、移除部分可拆成完整面子；两种口径还分别对全部 93,600 种清一色手牌作独立穷举对照。结果见 `reports/core-verification.json` 和 `reports/shape-verification.json`。浏览器测试包含两套规则、用户案例、核心合并覆盖与额外牌形记录的回归检查。

## Build and GitHub Pages

Requires Node.js 22.12 or newer. CI uses Node.js 24.

```sh
npm ci
npm test
npm run build
npm run preview
```

The build produces `dist/`, including the self-contained offline HTML. Generated build output is ignored by Git; precomputed datasets and CSV/SVG downloads are included in `public/`.

`.github/workflows/pages.yml` tests, builds and deploys `dist/` to GitHub Pages on every push to `main` or manual workflow dispatch. The Pages publishing source is GitHub Actions.

不干扰雀头 PP：`369m` 可概括为 `45678m＋1 个不干扰对子＋2 个不干扰面子`，共 5+2+6=13 张。对子和面子均受合法枚数、完整待牌集合不变的约束。展开时分别展示附加对子与面子，CSV 的 `free_pair` 字段保留该信息。
