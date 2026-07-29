# HOMELINK_GOVERNANCE_V2_COMPLETE_HANDOFF_PACKAGE

**用途：** Homelink Governance V2 新治理对话的权威迁移来源  
**覆盖范围：** 本项目从最初开发、生产验证、业务纠错，到当前 Bed Transfer 合同锁定与代码审计  
**更新时间基线：** 以本对话内最新确认信息为准  
**生产状态：**

```text id="wn8j0o"
PRODUCTION_BUSINESS_DATA_CHANGED = no
MIGRATION = no
DEPLOYMENT = no
PRODUCTION_CUTOVER = PRODUCTION_NO_GO
```

本迁移包严格区分：

```text id="4qu4o1"
USER_EXPLICITLY_CONFIRMED
USER_ACCEPTED_RECOMMENDATION
CONFIRMED_FROM_PRIOR_OUTPUT
CURRENT_CODE_FACT
PREVIOUS_MODEL_PROPOSAL_ONLY
CONFLICTING_HISTORY
SUPERSEDED_BY_LATEST_USER_DEFINITION
UNKNOWN
DEFERRED
BLOCKED
```

---

# A. PROJECT_CHARTER

## A1. 项目名称与业务背景

**STATUS: USER_EXPLICITLY_CONFIRMED**

Homelink 是阿联酋民宿/月租床位运营系统，主要管理：

- 月租床位；
- 员工收租；
- 欠款和还款；
- 押金收退；
- 退房；
- 公司支出；
- 换床；
- 老板端财务、历史和异常待办；
- TTLock 门禁、床位和押金上下文。

历史业务规模信息：

- 多个公寓和民宿；
- 约数百位月租住客；
- 员工收取现金和银行转账；
- 曾发生员工截留租金问题；
- 系统目标包括降低现金风险、明确审计责任和统一真实信息源。

## A2. 项目治理目标

**STATUS: USER_EXPLICITLY_CONFIRMED**

系统不再采用“发现一个显示错误就修一个页面”的方式，而采用：

> 锁定中心事实源，让每个功能模块直接依赖事实源，而不是功能之间互相取数。

核心要求：

- 业务事实不可由 UI 文本决定；
- 历史不能被随意重写；
- 功能之间不得形成相互依赖的事实链；
- 每一个状态必须有来源和可追溯证据；
- 生产验证必须区分测试、只读、dry-run 和真实写入；
- 未完成全部生产验证前保持 `PRODUCTION_NO_GO`。

## A3. 项目角色

### 用户

**STATUS: USER_EXPLICITLY_CONFIRMED**

用户是业务事实和最终业务决定的权威来源，负责：

- 确认真实业务规则；
- 纠正模型和代码对业务的错误理解；
- 执行必要的人工生产验证；
- 决定是否允许真实生产写入或发布切换。

### ChatGPT Governance

**STATUS: USER_ACCEPTED_RECOMMENDATION**

负责：

- 恢复和整理业务定义；
- 区分用户决定、代码事实和模型建议；
- 审查 Codex 输出；
- 判断测试证据是否充分；
- 控制任务范围和验证等级；
- 给出单个最小任务；
- 不把 Codex 自述当作最终证据。

### Codex / Work

**STATUS: USER_ACCEPTED_RECOMMENDATION**

负责：

- 读取本地 Git 仓库；
- 审计源码；
- 修改代码；
- 运行测试；
- 生成文档与 evidence；
- 执行部署，但仅在任务明确允许时。

Codex 不负责自行决定未确认的业务规则。

---

# B. COLLABORATION_WORKFLOW

## B1. 历史工作流

**STATUS: CONFIRMED_FROM_PRIOR_OUTPUT**

此前工作方式：

```text id="g9zjvl"
用户与 ChatGPT 治理对话
→ ChatGPT 生成最小 Codex 任务
→ 用户复制到电脑端 Codex
→ Codex 执行并返回结果
→ 用户将结果贴回 ChatGPT
→ ChatGPT 判断证据、状态和下一步
```

## B2. 新推荐工作流

**STATUS: USER_ACCEPTED_RECOMMENDATION**

在同一个 Homelink Project 内分层：

```text id="cfrg98"
Governance V2
= 业务决定、架构治理、状态判定

Codex Work
= 仓库审计、实现、测试、文档和 evidence

Git 仓库
= 代码事实源与长期合同

docs/evidence
= 原始验证证据

V1
= 历史档案与争议追溯
```

## B3. 固定工作纪律

每次只安排一个最小任务。

每次 Codex 输出必须区分：

- 代码是否修改；
- 是否 commit；
- 是否 deploy；
- 是否调用 production；
- 是否改变 production business data；
- 是否 migration；
- 测试等级；
- 未验证范围。

禁止：

- 自动进入下一阶段；
- 发现脚本 FAIL 就自动改 runtime；
- 用假数据结果升级生产状态；
- 在未确认业务规则时让 Codex自行决定；
- 大范围混合修改；
- 在没有 cleanup 证据时声称完整 live verification。

---

# C. USER_CONFIRMED_BUSINESS_DICTIONARY

## C1. 员工端业务事项

**STATUS: USER_EXPLICITLY_CONFIRMED**

员工端只有 7 个事项，不是 17 个：

1. Rent
2. Arrears Payment
3. Deposit In
4. Deposit Out
5. Checkout
6. Expense
7. Bed Transfer

## C2. 床位号

**STATUS: USER_EXPLICITLY_CONFIRMED**

TTLock 示例：

```text id="cuk93p"
146 D200 0101
```

其中：

```text id="uhpx74"
146 = 床位号
```

床位号是事件发生位置或当前物理位置，不是永久住客身份。

## C3. 押金 D

**STATUS: USER_EXPLICITLY_CONFIRMED**

```text id="qw7nr1"
D200 = 当前押金 AED 200
D100 = 当前押金 AED 100
D50  = 当前押金 AED 50
```

当前押金余额唯一事实源是最新有效 TTLock / Access Snapshot 的 D 金额。

没有 D：

```text id="fg3p4t"
UNKNOWN / MISSING_D
```

不能默认为 0。

以下规则仍未确认：

- `D0`；
- 小写 `d`；
- 小数；
- 多个 D；
- `D 200`；
- 冲突 D 的选择逻辑。

## C4. TTLock E/e

**STATUS: USER_ACCEPTED_RECOMMENDATION**

`E` 和 `e` 等价，表示物理空床。

当前已接受的 Phase 1 规则：

- E/e 必须是独立房态 token；
- 不应把普通英文单词内部的字母 `e` 当成空床；
- 有有效独立 E/e token：`vacant`；
- 没有 E/e：`not_marked_vacant`；
- Snapshot unavailable、ambiguous、stale 或 invalid 时，不得默认已入住。

此前用户规划中曾出现：

```text id="rzzl4n"
任意位置出现字母 E/e 就视为空床
```

该定义存在严重误判风险，已被后续接受的“独立 token”规则取代。

**STATUS: SUPERSEDED_BY_LATEST_USER_DEFINITION**

## C5. TTLock MMDD

**STATUS: USER_EXPLICITLY_CONFIRMED**

```text id="399y8f"
0101 = 1月1日
0708 = 7月8日
```

规则：

- 固定为 MMDD；
- 不是 DDMM；
- 没有年份；
- 表示入住日期月日；
- 不是当前 Rent period；
- 不能用于推导 rent_period_start/end；
- 不能自行补全年份。

仍未完全确认：

- 是第一次入住 Homelink、当前公寓还是当前床位的日期；
- 换床后保留原 MMDD 还是写换床日；
- 来源床空出后是否删除 MMDD；
- `0229`、`0000`、`1332` 等异常值规则。

## C6. TTLock expiry

**STATUS: USER_EXPLICITLY_CONFIRMED**

TTLock 卡片的“有效期截止”表示：

- 当前门禁/租金账期截止；
- 包含年月日；
- 包含具体时间；
- 由老板设置。

例如：

```text id="7f1otb"
2026-08-01 12:00
```

添加时间不能作为 Rent 截止时间，因为换卡后添加时间会变化。

card ID 不能作为住客身份，因为换卡后会变化。

`+971525199099 / 99099` 是老板或卡片添加者手机号，不是住客身份。

当前代码使用的准确 expiry API 字段、数据类型、时区和单位仍为 `UNKNOWN`。

## C7. Rent 日期推进

### 一个月足额支付

**STATUS: USER_ACCEPTED_RECOMMENDATION**

业务算法：

```text id="2m2xet"
新 expiry = 当前 expiry + 1 个自然月
```

- 保留时、分、秒；
- 目标月无对应日时，取该月最后一天；
- 业务时区：Asia/Dubai。

示例：

```text id="5scj5p"
2026-01-31 12:00 → 2026-02-28 12:00
2028-01-31 12:00 → 2028-02-29 12:00
```

### 15 天

**STATUS: USER_ACCEPTED_RECOMMENDATION**

```text id="ymtksu"
新 expiry = 当前 expiry + 15 个自然日
```

### 自定义日期

**STATUS: USER_ACCEPTED_RECOMMENDATION**

必须明确选择完整日期和时间，不得从 MMDD 或添加时间推断。

当前代码是否实现这些算法仍需以源码审计为准。

## C8. 公司流水账期

**STATUS: PREVIOUS_MODEL_PROPOSAL_ONLY / USER_PLAN_NOT_FINALIZED**

用户规划中出现过：

```text id="jk03jb"
每月 3 日 00:00:00
至下个月 2 日 23:59:59
Asia/Dubai
```

但没有完成独立正式确认，不应作为当前代码合同自行实现。

## C9. 换床范围

**STATUS: USER_EXPLICITLY_CONFIRMED**

公司名下任意床位之间可以换床：

- 可跨房间；
- 可跨公寓；
- 可跨物业；
- 必须属于同一公司授权范围；
- 不允许跨公司。

当前代码实际使用的 company scope 字段仍为 `UNKNOWN / PARTIAL`。

## C10. 换床费

**STATUS: USER_EXPLICITLY_CONFIRMED**

标准换床费通常为：

```text id="mgmzdb"
AED 50
```

不收费必须说明原因。

换床费欠款：

- 统一显示在老板欠款页面；
- 不能伪装成普通 Rent arrears；
- 不允许部分偿还；
- 必须一次性偿还 AED 50。

## C11. 历史跟随住客

**STATUS: USER_EXPLICITLY_CONFIRMED**

住客从 A 换到 B 后：

- A 时期属于该住客的业务历史；
- 欠款来源；
- Rent 历史；
- 押金事件；
- A→B 换床链路；

都必须可以在 B 的当前住客历史中追溯。

这不等于把 A 床从开业以来所有人的历史都转到 B。

## C12. 334

**STATUS: DEFERRED**

334 存在 duplicate/alias arrears 问题。

已知两个引用：

```text id="qnba4x"
task-mrax794j-cb01ef7d
rent-short-paid-S20260707-w1ofc-ent20260707-w1ofc-01
```

规则：

- 暂不修复；
- 不作为最终测试床；
- Bed Transfer 脚本必须排除 334。

---

# D. SOURCE_OF_TRUTH_CONSTITUTION

## D1. 八爪鱼架构

**STATUS: USER_EXPLICITLY_CONFIRMED**

中心身体是事实源，功能是爪子。

任何功能不得从另一功能的显示结果获取事实。

## D2. 数据层级

### L0 外部输入事实

1. TTLock / Access Snapshot
2. Employee 7 Event submission

### L1 Canonical Event Archive

包括：

- accepted cloud sessions；
- `sessions.entries_json`；
- session anchor；
- entry anchor；
- correction anchor；
- void anchor；
- reversal anchor。

“历史档案”不是独立于员工事件之外的新事实源，而是员工事件被云端接受后的永久记录层。

### L2 Derived Projections

- Arrears Projection
- Deposit Context
- Occupancy / Bed Status
- Finance Projection
- Owner History
- Sync State
- Transfer Lineage

### L3 Canonical Gateways

- Bed Context Gateway
- Arrears Gateway
- Deposit Gateway
- Occupancy Gateway
- Finance Gateway
- Owner Archive Gateway
- Sync State Gateway
- Today Todo Gateway
- Upload / Source Firewall

### L4 Feature Legs

- Employee form
- Owner dashboard
- Owner history
- Preview
- WhatsApp
- Reports
- Current session UI
- Today Todo

## D3. 事实源优先矩阵

| 信息 | 权威来源 |
|---|---|
| 物理空床 | TTLock E/e |
| 当前押金余额 | TTLock D |
| 入住日期月日 | TTLock MMDD |
| 当前 expiry | TTLock 有效期截止字段 |
| Rent 财务流水 | Canonical Rent event |
| Deposit In/Out 流水 | Canonical Deposit event |
| Expense | Canonical Expense event |
| 欠款 | Canonical Arrears Gateway |
| 欠款还款 | Canonical Arrears Payment event |
| 历史事件 | Canonical Archive |
| void/correction | Canonical anchors |
| 当前 sync 状态 | Cloud session/entry/anchor reconciliation |
| Today Todo | 各 Canonical Gateway 派生 |
| 住客换床链路 | Canonical Transfer Lineage，当前实现 BLOCKED |

## D4. 明确禁止成为事实源的内容

**STATUS: USER_EXPLICITLY_CONFIRMED / CONFIRMED_FROM_PRIOR_OUTPUT**

- owner display text；
- employee display text；
- Preview；
- WhatsApp export；
- localStorage；
- IndexedDB；
- memory cache；
- local synced flag；
- TTLock card ID；
- tenant_card_id；
- old_ttlock_ref；
- provider phone；
- phone_99099；
- TTLock creator phone；
- card creation time；
- provider metadata。

## D5. 是否允许功能读取其他功能输出

**STATUS: USER_EXPLICITLY_CONFIRMED**

没有正式例外。

功能可以调用 Canonical Gateway，但不得把另一功能的 UI 或缓存输出当成事实。

---

# E. TTLOCK_TOKEN_AND_EXPIRY_DICTIONARY

| 项目 | 当前定义 | 状态 |
|---|---|---|
| 床位号 | 示例为纯数字 | USER_EXPLICITLY_CONFIRMED / 格式边界 UNKNOWN |
| D | 当前押金 AED | USER_EXPLICITLY_CONFIRMED |
| 无 D | UNKNOWN / MISSING_D | USER_EXPLICITLY_CONFIRMED |
| E/e | 独立房态 token，表示 vacant | USER_ACCEPTED_RECOMMENDATION |
| 无 E/e | not_marked_vacant | CONFIRMED_FROM_PRIOR_OUTPUT |
| MMDD | 入住日期月日，无年份 | USER_EXPLICITLY_CONFIRMED |
| MMDD 与 Rent | 无正式关系 | USER_EXPLICITLY_CONFIRMED |
| expiry | 当前门禁/租金截止年月日时间 | USER_EXPLICITLY_CONFIRMED |
| 添加时间 | 无租期/身份价值 | USER_EXPLICITLY_CONFIRMED |
| card ID | 不得作为永久身份 | USER_EXPLICITLY_CONFIRMED |
| 99099 | 老板手机号 | USER_EXPLICITLY_CONFIRMED |
| API expiry 字段 | UNKNOWN | UNKNOWN |
| timestamp 单位 | UNKNOWN | UNKNOWN |
| API 时区 | UNKNOWN | UNKNOWN |
| snapshot stale 阈值 | UNKNOWN | UNKNOWN |
| 重复 snapshot 处理 | UNKNOWN | UNKNOWN |
| 多 D | UNKNOWN | UNKNOWN |
| D0 | UNKNOWN | UNKNOWN |
| 小写 d | UNKNOWN | UNKNOWN |
| 异常 MMDD | UNKNOWN | UNKNOWN |

---

# F. SEVEN_EVENT_CONTRACT_STATUS

## F1. Rent

**STATUS: LIVE_VERIFIED**

已验证：

- 足额支付；
- short-paid；
- short-paid 创建 arrears；
- 老板端收入和欠款显示；
- employee sync。

生产示例：

```text id="efrzry"
Bed 611
应收 680
实收 680
Rent income 680
```

short-paid 示例：

```text id="2dl5sr"
Bed 611
应收 680
实收 580
Arrears opened 100
```

## F2. Arrears Payment

**STATUS: LIVE_VERIFIED**

已验证：

- 能读取 open arrears；
- 绑定 cloud arrears ref；
- repayment 正确关闭欠款；
- 不计入 Rent income；
- post-sync 不再误报 stale。

## F3. Deposit In

**STATUS: PARTIAL LIVE VERIFICATION**

已验证：

- Deposit In 财务移动；
- TTLock D mismatch warning；
- Deposit In on vacant bed warning；
- Today Todo；
- void 后 Todo auto-resolve；
- void 后有效收入恢复。

未完整验证所有真实 Deposit In 生命周期。

## F4. Deposit Out

**STATUS: PRODUCTION_DRY_RUN_VERIFIED**

已验证：

- 合法退款；
- 超过 TTLock D 余额拒绝；
- 少退时 difference reason；
- 不计入 Rent income；
- 没有生产业务写入。

未做真实退押金 live write。

## F5. Checkout

**STATUS: PRODUCTION_DRY_RUN_VERIFIED**

已验证：

- no-arrears normal checkout；
- open arrears 阻止 normal checkout；
- Left With Arrears 字段；
- Checkout 本身不定义物理空床。

未做真实 Checkout live write。

## F6. Expense

**STATUS: PRODUCTION_DRY_RUN_VERIFIED**

已验证：

- 50 AED 无 evidence 可通过；
- 100/150 AED 必须 evidence；
- amount/category/reason/payment_method 必填；
- explicit payment_method=other 可通过；
- 不路由到 Rent；
- provider identity clean。

曾出现测试脚本最终 `result=FAIL`，但所有实际 assertions 与 HTTP 返回均正确。

**STATUS: SCRIPT_BUG**

不是 runtime bug。

## F7. Bed Transfer

**STATUS: NOT_VERIFIED / REQUIREMENTS_REVIEW**

已完成合同与代码审计，但未达到：

- business verification；
- production dry-run verified；
- live verified。

---

# G. GATEWAY_VERIFICATION_MATRIX

| Gateway | 当前等级 | 核心证据 |
|---|---|---|
| Bed Context Gateway | LIVE_VERIFIED | 生产床位上下文读取，D/E/arrears 来源正确 |
| Arrears Gateway | LIVE_VERIFIED | 611 AP、948 open arrears |
| Sync State Gateway | LIVE_VERIFIED | cloud void 后不再显示 Synced |
| TTLock E/e vacancy rule | LIVE_VERIFIED | Bed 111 e |
| Today Todo Gateway | LIVE_VERIFIED | 111 reconciliation todo + void auto-resolve |
| Owner Archive Gateway | PRODUCTION_READ_VERIFIED | x6wio raw 1550 / effective 0 |
| Finance Gateway | PRODUCTION_READ_VERIFIED | voided excluded，canonical source |
| Deposit Gateway | PRODUCTION_READ_VERIFIED — PARTIAL_SCOPE: TTLOCK_D_CONTEXT | D100/D200/D50、missing D |
| Occupancy Gateway | PRODUCTION_READ_VERIFIED — PARTIAL_SCOPE: BASE_OCCUPANCY_READ | E/e source，完整 lifecycle 未验证 |
| Upload / Source Firewall | TEST_PASS + production path evidence | AP forbidden identity stripping、7-event dispatch |
| Bed Transfer Lineage | BLOCKED | 无 stable stay identity |
| Transfer Fee Arrears | NOT_IMPLEMENTED / unsupported | 代码审计 |
| Transfer Void/Reversal | PARTIAL | 代码审计 |
| Company Scope | PARTIAL | 代码审计 |
| Transfer Concurrency | PARTIAL | 代码审计 |

---

# H. CODE_AND_DEPLOYMENT_BASELINE

## H1. Repository

**STATUS: CONFIRMED_FROM_PRIOR_OUTPUT**

```text id="kmz6hl"
repository_root:
C:/Users/Chinalink/Desktop/软件迭代
```

该路径已确认是有效 Git repository。

## H2. 历史主基线

```text id="9t37tw"
branch:
fix/auth-closure-001

commit:
0c8059b711c4e6ed10ef14d1a60d9702eeafb1ed

worker:
707797e0-21b5-47ae-9bca-08ae9b19e5a9
```

该 worker 与 Expense required-field fix 相关。

## H3. 当前工作树最新确认

**STATUS: CONFIRMED_FROM_PRIOR_OUTPUT**

```text id="solb5e"
current working branch:
chore/bed-transfer-production-dry-run

current HEAD:
1c61104b3a6efe61e5a7342229d3eb4bfcf5268f
```

工作区存在：

- 无关 modified/untracked 文档；
- dry-run 文件；
- 新增 Bed Transfer 合同与代码审计文档。

## H4. Bed Transfer 已部署代码

**STATUS: CONFIRMED_FROM_PRIOR_OUTPUT**

```text id="2x5un1"
branch:
fix/bed-transfer-phase1-validator

commit:
ba9584fed13200a422f72433eed2c455f2c06316

worker:
fe0d6788-5f00-488a-85c8-5cb336750318

deployment:
yes
```

必须严格区分：

```text id="csjnst"
部署事实 = yes
业务验证 = no
production dry-run verified = no
live verified = no
```

## H5. Safety commit ancestry

**STATUS: CONFIRMED_FROM_PRIOR_OUTPUT**

```text id="yew7om"
d7be5160 is ancestor of ba9584 = yes
```

这不代表所有写路径安全，因为独立写路径仍可能绕过 Canonical Archive。

## H6. Git remote

**STATUS: UNKNOWN**

历史中没有确认 Git remote 名称或 URL，也没有确认曾经 push 到 GitHub。

---

# I. DECISION_AND_ERRATA_LOG

## I1. 7 events

旧理解或审计曾出现更多事项。

最新规则：

```text id="nnlto8"
员工端只有 7 个事项
```

**STATUS: SUPERSEDED_BY_LATEST_USER_DEFINITION**

## I2. Rent fallback

曾发现未知或缺失 event_type 会落到 Rent validator。

已修：

- unknown event 不再 fallback Rent；
- 7-event dispatch isolation；
- contract tests PASS。

## I3. Deposit current balance

旧设计曾考虑由 Deposit In/Out 推算余额。

用户纠正：

```text id="kxwqrz"
当前余额必须以 TTLock D 为准
```

旧定义已废止。

## I4. Occupancy

旧设计曾考虑 Checkout / Transfer 推断空床。

用户纠正：

```text id="hrs521"
物理空床只看 TTLock E/e
```

旧定义已废止。

## I5. TTLock MMDD

旧上下文中曾出现 `valid_until_mmdd` 或租期相关误读。

最新规则：

```text id="j2jrp2"
MMDD = 入住日期月日
不等于 Rent coverage
```

旧理解已废止。

## I6. E/e 任意字符

用户规划曾写任意位置出现 E/e 即空床。

后续接受的规则为：

```text id="dej0ki"
E/e 必须是独立房态 token
```

任意英文字符匹配规则已废止。

## I7. Expense rollup

官方 dry-run 脚本曾把全部 case 标 FAIL。

真实后端返回：

- valid case HTTP 200；
- rejection case HTTP 422；
- assertions 全部 true。

结论：

```text id="ecl936"
SCRIPT_BUG
不是 runtime bug
```

## I8. 948 coverage

早期 production bed-context JSON 曾返回：

```text id="by2qxj"
current_rent_coverage_start = 2026-07-08
current_rent_coverage_end   = 2026-08-08
```

后续真实 GET 又为空。

当前审计分类：

```text id="bivz9m"
UNKNOWN
```

不能将此前 coverage 测试升级为 Bed Transfer PASS。

## I9. Repository root

早期因检查错误目录而认为 root unknown。

后续已确认：

```text id="jcj7i0"
C:/Users/Chinalink/Desktop/软件迭代
```

旧 `REPO_ROOT=UNKNOWN` 已被修正。

---

# J. BED_TRANSFER_CONFIRMED_CONTRACT

以下规则已经被记录为 Phase 1 用户接受业务合同。它们不代表当前代码已经实现。

## J1. 本质

**STATUS: USER_ACCEPTED_RECOMMENDATION**

Bed Transfer 是：

> 将当前住客在来源床 A 的有效业务上下文迁移到目标床 B，同时保留原始事件位置和完整 A→B→C 链路。

不是把所有旧事件的 `bed=A` 改成 `bed=B`。

## J2. 历史不可重写

原始事件必须保留：

- original event ID；
- original bed；
- original date；
- original financial category；
- original arrears source。

查询当前住客历史时，通过 active transfer lineage 聚合。

Finance 只计算原始 event 一次。

## J3. stay_context_id 业务语义

**STATUS: USER_ACCEPTED_RECOMMENDATION**

定义一个连续入住上下文语义：

```text id="wb4yhp"
stay_context_id
```

该名称是业务语义，不代表当前代码字段名。

规则：

- accepted check-in 到 accepted Checkout 是一个 stay；
- A→B→C 保持同一个 stay；
- Checkout 结束 stay；
- 后续重新入住生成新 stay；
- 不得用手机号、card ID 或 provider metadata 替代。

当前代码没有稳定 stay identity。

## J4. Phase 1 操作顺序

**STATUS: USER_ACCEPTED_RECOMMENDATION**

Phase 1 只支持：

```text id="neeywv"
员工选择并提交 A→B
→ Canonical Archive 接受
→ 老板修改 TTLock
→ Today Todo 等待一致
```

不支持：

- 老板先修改 TTLock；
- 员工后补事件；
- 自由补录；
- 过去日期 backfill。

## J5. 来源床和目标床

### 来源床 A

- 不等于 B；
- 同一公司授权范围；
- Snapshot available；
- non-ambiguous；
- 不含有效 E/e vacancy token；
- 必须存在 current active stay/business context。

### 目标床 B

- 同一公司授权范围；
- Snapshot available；
- non-ambiguous；
- 必须含有效独立 E/e vacancy token；
- 空床残留 D/MMDD 不能被当成新住客事实；
- Phase 1 不引入模糊 owner override。

## J6. TTLock transfer 后状态

概念示例：

```text id="7ftejh"
Before:
A = 146 D200 0101
B = 111 e

After:
A = 146 e
B = 111 D200 0101
```

Transfer 本身：

- 不生成 Deposit In；
- 不生成 Deposit Out；
- 不改变 D；
- 不重新计算 expiry；
- 不从 MMDD 推断 expiry。

## J7. Expiry

Transfer 原样继承当前 expiry：

```text id="rza5t5"
A expiry = 2026-08-08 12:00
A→B
B expiry = 2026-08-08 12:00
```

不加一个月，不加 15 天。

## J8. 换床费

### Paid now

- 收取 AED 50；
- payment method 必填；
- Finance 分类为 transfer-fee income；
- 不是 Rent；
- 不是 Deposit；
- 不是 AP。

### Waived

- 实收 0；
- 原因必填；
- 产生老板 review/acknowledgement Todo；
- 不生成 arrears。

### Unpaid

- 生成 AED 50 transfer-fee arrears；
- repayment date 必填；
- 老板统一欠款页面显示；
- 禁止部分还款；
- 必须整笔 50 偿还。

当前代码尚不支持完整 transfer-fee arrears 合同。

## J9. 旧欠款

属于当前 stay 的所有 open arrears 应跟随 active lineage：

- 0 笔：正常；
- 1 笔：保持原 arrears identity；
- 多笔：全部可见；
- 不允许只转第一笔；
- 原始 arrears bed 不改；
- 当前追偿床由 lineage 派生；
- 不重复计入 Finance。

当前实现不满足 identity-preserving multiple-arrears carryover。

## J10. Finance

Bed Transfer event 本身零财务影响：

```text id="i4upvw"
rent_income = 0
deposit_received = 0
deposit_refund = 0
arrears_repaid = 0
expense = 0
```

只有明确 money event 才产生流水。

当前代码是否完全保证 transfer-without-money Finance zero：

```text id="sgasvd"
UNKNOWN
```

## J11. Void

底层不能 hard delete transfer。

应使用 void/reversal/correction 语义，使 Projection：

- lineage 失效；
- current bed 恢复；
- arrears recovery context 恢复；
- B 不再继承 A history；
- Todo 重新计算；
- Sync State 反映 Cloud Voided。

TTLock 不会因云端 void 自动回滚，需老板人工修复。

当前 transfer void/reversal 支持仅 `PARTIAL`。

---

# K. BED_TRANSFER_CURRENT_CODE_AUDIT

## K1. 当前代码合同事实

**STATUS: CURRENT_CODE_FACT**

```text id="m8pmlw"
event_type = bed_transfer
employeeEntryUploadType maps Bed Transfer to TF
validateEmployeeBedTransferUploadFields is called
```

这些是当前代码事实，不是用户业务决定。

## K2. 现有写入路径

**STATUS: CURRENT_CODE_FACT**

源码审计发现：

```text id="q1i2wc"
POST /api/employee/bed-transfers
POST /api/employee/entry
POST /api/employee/entry/validate
bed_transfer_events / entry_events
sessions.entries_json
```

## K3. 双事实源风险

**STATUS: CONFIRMED_FROM_PRIOR_OUTPUT**

独立 Bed Transfer 写入可以绕过：

```text id="b8yk0c"
sessions.entries_json
```

这会形成：

```text id="m662rc"
独立 transfer tables
与
Canonical sessions.entries_json
```

两套事实路径。

`LEGACY_PATH_BYPASS_RISK` 已确认。

## K4. 身份污染

**STATUS: CONFIRMED_FROM_PRIOR_OUTPUT**

当前 Transfer snapshot 会从：

```text id="oeyy47"
tenant_card_id
```

派生身份。

这与 Source-of-Truth Constitution 冲突。

## K5. Stable stay identity

**STATUS: CONFIRMED_FROM_PRIOR_OUTPUT**

```text id="4bplkv"
STABLE_STAY_IDENTITY_EXISTS = no
```

当前 lineage：

```text id="i2gv95"
BLOCKED
```

## K6. Arrears 代码支持

发现来源类型：

```text id="busycb"
employee_entry_short_paid
left_with_arrears
cloud_arrears_projection
ttlock_expired_unpaid
```

没有完整支持：

```text id="xv8fo5"
bed_transfer_fee_arrears
bed_price_difference_arrears
```

现有 Arrears Payment 对 transfer fee 的复用程度：

```text id="tireen"
partial
```

## K7. Void、scope、concurrency

```text id="lgua5b"
VOID_REVERSAL_SUPPORT = PARTIAL
COMPANY_SCOPE_CHECK = PARTIAL
CONCURRENCY_PROTECTION = PARTIAL
```

## K8. Expiry

源码审计已经执行，但最终摘要只确认：

```text id="7ki4kj"
expiry unit/timezone unresolved
```

不能猜测准确 API field 或 timestamp 单位。

## K9. 948 coverage

```text id="zy3rk1"
948_COVERAGE_CONFLICT_CLASSIFICATION = UNKNOWN
```

---

# L. BED_TRANSFER_BLOCKERS

## L1. 缺少稳定入住身份

**STATUS: BLOCKED**

没有 stable stay identity，系统不能安全区分：

- A 的上一任住客；
- A 的当前住客；
- 当前住客应继承的历史；
- 不应跟随的旧事件。

## L2. Canonical 写入路径不唯一

**STATUS: BLOCKED**

独立 transfer 写入绕过 `sessions.entries_json`，违反八爪鱼中心事实源原则。

## L3. tenant_card_id 身份污染

**STATUS: BLOCKED**

当前 Transfer snapshot 使用禁止字段建立身份上下文。

## L4. 多欠款 lineage 不安全

**STATUS: BLOCKED / PARTIAL**

不能证明多笔 open arrears 都能以原 identity 跟随 stay。

## L5. Transfer Fee Arrears 不支持

**STATUS: BLOCKED**

用户已确认换床费欠款合同，但代码尚未支持。

## L6. Finance zero 未证明

**STATUS: UNKNOWN**

不能确认没有 money 的 transfer 一定不会污染 Rent、Deposit、AP 或 Expense。

## L7. Void/reversal 不完整

**STATUS: PARTIAL**

尚不能证明 transfer void 后所有 lineage、arrears、history、sync 和 Todo 全量恢复。

## L8. 公司范围不完整

**STATUS: PARTIAL**

用户允许同公司内跨房间/公寓/物业，但代码 scope 字段和完整授权验证未完全确认。

## L9. 并发保护不完整

**STATUS: PARTIAL**

未证明两员工同时转入同一 target 时能被原子阻止。

## L10. 948 coverage 未解释

**STATUS: UNKNOWN**

不能用于证明 Rent coverage carryover。

---

# M. CURRENT_PRODUCTION_RISKS

1. 独立 transfer write 绕过 Canonical Archive。
2. `tenant_card_id` 仍进入 Transfer identity。
3. 无 durable stay identity。
4. 旧床全部历史可能被错误合并到当前住客。
5. 多笔 arrears carryover 不具 identity preservation。
6. Transfer Fee Arrears 未实现。
7. 无 money transfer 的 Finance zero 未证明。
8. Transfer void/reversal 全链路恢复未证明。
9. Target bed 并发竞争未证明。
10. Company scope 验证仅 partial。
11. expiry 字段、单位和时区未知。
12. 948 coverage 前后不一致。
13. legacy/direct write path 可能绕过新 validator。
14. hard delete 风险未完全排除。
15. Git remote/远程备份未知。

---

# N. DEFERRED_ITEMS

## N1. 334

```text id="hq7gn6"
334 duplicate/alias arrears = DEFERRED
```

## N2. Bed price difference

仍未确认：

- 计算公式；
- 换便宜床退款；
- 是否立即补差价；
- 是否下期生效；
- 是否允许部分偿还；
- void 后如何退款。

## N3. Transfer void 财务退款

仍未确认：

- 已收 AED 50 是否退款；
- 已收床价差是否退款；
- 已偿还 transfer-fee arrears 如何 reversal；
- 使用何种退款事件。

## N4. TTLock edge cases

- D0；
- lowercase d；
- multiple D；
- invalid MMDD；
- duplicate snapshot；
- stale threshold；
- unavailable fail-closed 细节。

## N5. UI

- A→B→A 循环展示；
- 多次 correction/void 展示；
- old bed current resident pointer；
- transfer Todo 最终 code 名称。

## N6. Wi-Fi / 取电卡

业务规划中提及，但当前实现范围和接口未确认。

---

# O. VERIFICATION_LEVEL_DEFINITIONS

## TEST_PASS

最低证据：

- 单元测试、静态测试或集成测试通过；
- 不代表 deployed；
- 不代表 production。

## DEPLOYED + TEST_PASS, NOT_LIVE_VERIFIED

- 代码已部署；
- 测试通过；
- 没有完整生产业务路径证据。

## PRODUCTION_DRY_RUN_VERIFIED

- production validator endpoint；
- expected HTTP response；
- no real upload；
- production business data unchanged；
- 不等于 LIVE。

## PRODUCTION_READ_VERIFIED

- 生产只读 Gateway / owner view；
- 数据来源正确；
- 没有写入。

可加：

```text id="crflgh"
PRODUCTION_READ_VERIFIED — PARTIAL_SCOPE
```

## LIVE_VERIFIED

事件类功能最低标准：

1. 真实 production write；
2. canonical session 存在；
3. canonical entry 存在；
4. anchor/entries_json 正确；
5. Gateway 派生正确；
6. Owner UI 正确；
7. Employee Sync 正确；
8. 测试数据 cleanup/void 后 Projection 恢复；
9. 部署版本和证据可追踪。

## PARTIAL_PASS

部分检查通过，但仍有失败或未执行范围。

## BUG_FOUND

真实 runtime 或业务行为错误。

## SCRIPT_BUG

测试脚本、assertion、rollup 或显示错误；runtime 可能正确。

## DEFERRED

已知问题，明确暂不处理。

## BLOCKED

依赖的业务决定、身份模型或安全条件不存在，不能继续实现或验证。

## NOT_VERIFIED / REQUIREMENTS_REVIEW

代码可能存在或已部署，但业务合同和验证证据不足。

---

# P. CURRENT_WORKTREE_AND_DOCUMENT_STATUS

## P1. 当前工作树

最新确认：

```text id="0gkr4z"
branch:
chore/bed-transfer-production-dry-run

HEAD:
1c61104b3a6efe61e5a7342229d3eb4bfcf5268f
```

工作区有无关 modified/untracked 文件。

## P2. Bed Transfer 文档

已创建：

```text id="ivysgr"
docs/BED_TRANSFER_PHASE1_BUSINESS_CONTRACT_V1.md
docs/evidence/BED_TRANSFER_CURRENT_CODE_AND_WRITE_PATH_AUDIT_V1.md
```

最新证据显示：

```text id="roixs3"
uncommitted
```

本对话没有收到后续 commit 成功输出，因此不得假设已提交。

## P3. 审计任务安全结果

```text id="vjtlwc"
runtime_code_changed = no
production_called = no
production_business_data_changed = no
migration = no
deployment = no
```

---

# Q. NEXT_RECOMMENDED_MINIMAL_TASK

## 当前立即下一步

**STATUS: RECOMMENDED / NOT_YET_EXECUTED**

先将以下两份文档做成一个原子 Git commit，只提交这两个文件：

```text id="rm7z3q"
docs/BED_TRANSFER_PHASE1_BUSINESS_CONTRACT_V1.md
docs/evidence/BED_TRANSFER_CURRENT_CODE_AND_WRITE_PATH_AUDIT_V1.md
```

不得带入无关 modified/untracked 文件。

该任务名称此前建议为：

```text id="48sq2r"
HOMELINK_COMMIT_BED_TRANSFER_CONTRACT_AND_AUDIT_DOCS_ONLY
```

## 文档提交之后

下一项架构任务才是：

```text id="rq6ope"
DEFINE_DURABLE_STAY_CONTEXT_ID_AND_CANONICAL_TRANSFER_ARCHIVE_PATH
```

该任务需要解决：

- durable stay identity 生命周期；
- 唯一 Canonical transfer write path；
- legacy independent write 的关闭或兼容；
- immutable transfer lineage；
- 多 arrears identity preservation；
- void/reversal recomputation；
- concurrency and idempotency。

在文档提交和设计完成前，不应继续 Bed Transfer production dry-run。

---

# R. V2_OPERATING_INSTRUCTIONS

V2 每次判断必须按以下顺序：

## R1. 先识别证据类型

- 用户明确规则；
- 用户接受建议；
- Codex 自述；
- 当前代码事实；
- HTTP 返回；
- production read；
- production write；
- owner page 人工确认；
- cleanup 证据。

## R2. 不把代码事实反推成业务规则

例如：

```text id="4dvv2k"
current code type = TF
```

只说明代码当前使用 TF，不代表用户业务合同要求 TF。

## R3. 不把 deployment 当验证

```text id="3rinxv"
ba9584 deployed = yes
```

不等于：

```text id="jj5009"
Bed Transfer verified
```

## R4. 不把脚本 FAIL 当 runtime FAIL

先检查：

- HTTP status；
- event_type；
- error_code；
- missing_fields；
- assertions；
- production data change。

## R5. 不外推验证范围

Dry-run 不能升级为 LIVE。

只读验证不能证明写入链路。

## R6. 每次只安排一个最小任务

输出应包括：

```text id="lcwiij"
结论等级
充分证据
不足证据
事实源检查
runtime 是否要改
未验证范围
下一步最小任务
production safety
```

## R7. 固定安全状态

除非用户明确改变：

```text id="rx5yzw"
PRODUCTION_CUTOVER = PRODUCTION_NO_GO
```

---

# S. CONTEXT_ACCEPTANCE_TEST

V2 必须能正确回答以下内容，才能开始工作：

1. Repository root 是什么？
2. 当前工作 branch 和 HEAD 是什么？
3. 历史 baseline 是什么？
4. Bed Transfer deployed branch/commit/worker 是什么？
5. 部署事实、业务验证和 live verification 是否分开？
6. 7 个员工事项是什么？
7. D、E/e、MMDD、expiry 分别是什么？
8. 哪些 provider identity 被禁止？
9. 八爪鱼事实源层级是什么？
10. 当前各 Gateway 等级是什么？
11. Bed Transfer 当前正式状态是什么？
12. 当前代码 event_type/type 是什么？
13. 当前代码有哪些 write path？
14. 为什么 independent write path 是风险？
15. stable stay identity 是否存在？
16. lineage 为什么 BLOCKED？
17. transfer fee arrears 是否支持？
18. AP 是否能完整复用 transfer fee？
19. Finance zero 是否已证明？
20. void/reversal、company scope、concurrency 状态是什么？
21. 948 coverage 当前结论是什么？
22. 334 当前状态是什么？
23. 两份 Bed Transfer 文档是否已提交？
24. 当前立即下一步是什么？
25. 哪些规则仍 UNKNOWN？
26. production_cutover 是什么？

预期核心答案：

```text id="15yx1l"
repository_root =
C:/Users/Chinalink/Desktop/软件迭代

current branch =
chore/bed-transfer-production-dry-run

current HEAD =
1c61104b3a6efe61e5a7342229d3eb4bfcf5268f

Bed Transfer =
NOT_VERIFIED / REQUIREMENTS_REVIEW

stable stay identity =
no

lineage =
BLOCKED

independent write bypass =
confirmed risk

tenant_card_id identity usage =
confirmed conflict

transfer-fee arrears =
unsupported

existing AP reusable =
partial

Finance zero =
UNKNOWN

void/reversal =
PARTIAL

company scope =
PARTIAL

concurrency =
PARTIAL

948 coverage =
UNKNOWN

334 =
DEFERRED

documents =
created but latest evidence says uncommitted

production_cutover =
PRODUCTION_NO_GO
```

---

# 可直接粘贴到 V2 的首条消息

```text id="1taqyb"
这是 Homelink Governance V2 主治理对话。

请先读取本项目来源中的：

HOMELINK_GOVERNANCE_V2_COMPLETE_HANDOFF_PACKAGE

同时参考同一项目中的 V1 历史对话，但迁移包中的最新状态、纠错和分类优先于 V1 中被后续取代的旧理解。

当前不要安排 Codex，不要修改代码，不要测试、部署、迁移或访问生产。

请先输出：

HOMELINK_V2_CONTEXT_RECOVERY_ACCEPTANCE_REPORT

逐项回答并注明来源：

1. repository root、当前 branch、当前 HEAD；
2. 历史 baseline branch/commit；
3. Bed Transfer deployed branch/commit/worker；
4. deployment、business verification、live verification 的区别；
5. 员工端 7 个事项；
6. TTLock D、E/e、MMDD、expiry 的定义；
7. 禁止作为身份的所有字段和来源；
8. 八爪鱼事实源层级；
9. 各 Gateway 当前验证等级；
10. Bed Transfer 已确认/已接受业务规则；
11. Bed Transfer 当前代码事实；
12. Bed Transfer 当前十大阻塞与风险；
13. stable stay identity 是否存在；
14. lineage 当前状态；
15. 两条/多条 write path 风险；
16. transfer-fee arrears 和 AP 复用状态；
17. Finance zero、void/reversal、company scope、concurrency 状态；
18. 948 coverage 当前结论；
19. 334 当前状态；
20. 两份 Bed Transfer 文档是否已提交；
21. 当前立即下一项最小任务；
22. production_cutover；
23. 仍然 UNKNOWN 的关键事项；
24. 已被最新规则取代的旧定义。

读取不到的信息写 UNKNOWN，不得猜测。

最后输出：

CONTEXT_RECOVERY_RESULT:
PASS / PARTIAL / FAIL

missing_context:
list

conflicting_context:
list

unsafe_assumptions:
list

只有 CONTEXT_RECOVERY_RESULT=PASS，并且关键状态与迁移包一致后，才继续 Homelink 工作。
```

保存本回复为项目来源时，建议名称：

```text id="k5zbpk"
HOMELINK_GOVERNANCE_V2_COMPLETE_HANDOFF_PACKAGE
```