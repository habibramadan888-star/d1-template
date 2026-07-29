# Next Prompt: P1 Owner Nav Contract Align

Use this prompt after the P0 arrears SOT implementation.

```text
# TASK P1-OWNER-NAV-CONTRACT-ALIGN

Background:
`npm run test:owner-nav-no-wrap` currently fails because the test expects an implementation-specific flex nowrap selector:

`.owner-ui-unified .nav{display:flex!important;flex-wrap:nowrap!important`

The current implementation uses fixed grid navigation. This is a contract mismatch, not necessarily a product bug.

Goal:
Define and enforce the final owner navigation contract without randomly changing UI behavior.

Strict prohibitions:
1. Do not modify arrears business logic.
2. Do not modify backend D1 logic.
3. Do not execute D1 write/export/import/execute.
4. Do not execute migration.
5. Do not modify financial formula.
6. Do not modify dashboard calculation.
7. Do not print secrets/tokens/cookies.
8. Production cutover remains PRODUCTION_NO_GO.

Final navigation authority:
1. Owner nav must include or provide access to:
   - 总览
   - 欠款
   - 历史
   - 分析
   - 客户
   - 网络
2. On mobile, nav must not wrap to a second line.
3. If all items cannot fit as primary tabs, use one approved pattern:
   - fixed centered grid tabs plus accessible secondary control, or
   - no-wrap horizontal scroll tabs, or
   - primary tabs plus clear more/control entry.
4. Do not remove `分析`.
5. Do not remove `欠款`.
6. Do not restore QUICK ACTIONS.
7. Do not restore three-door fourth entry.

Implementation decision required:
Choose one final pattern and update tests to check behavior, not fragile CSS internals.

Recommended test rewrite:
1. Assert nav labels exist or are accessible.
2. Assert no line wrap at mobile viewport using DOM/layout measurement if browser test is available.
3. Assert `分析` opens the analysis view.
4. Assert `欠款` opens arrears view.
5. Assert `网络` remains accessible if not primary.
6. Do not require the nav implementation to be `display:flex` if fixed grid is the chosen final design.

Validation:
- `npm run test:owner-nav-no-wrap`
- `npm run test:owner-nav-all-modules`
- `npm run test:owner-regression-smoke`
- `npm run security:secrets`
- `npm run gate:commercial-launch`

Expected output:
1. Chosen final nav pattern.
2. Updated tests.
3. Evidence that all owner modules remain accessible.
4. Confirmation production cutover remains PRODUCTION_NO_GO.
```
