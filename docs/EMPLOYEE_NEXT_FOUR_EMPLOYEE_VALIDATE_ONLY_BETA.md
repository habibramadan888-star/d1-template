# Employee Next 四员工 Validate-only 公测说明

FOUR_EMPLOYEE_BETA_SCOPE=4_internal_employees

BETA_MODE=validate_only

BUSINESS_DATA_WRITE=no

PRODUCTION_USE=no

## 员工操作说明

1. 使用负责人提供的非生产 `/employee-next` 公测地址登录。
2. 每次只选择一个事项：Rent、Arrears Payment、Deposit In、Deposit Out、Checkout、Expense 或 Bed Transfer。
3. 按真实情况填写字段，但不要把本次演练视为已经完成正式报备。
4. 看到“Validation passed / 测试验证通过”后记录结果；页面同时应提示“本次为公测演练，尚未正式写入云端”。
5. 看到错误时，记录事项、时间和完整错误文字，并保存不含密码或认证信息的截图。
6. 不要在旧 Employee 页面重复提交同一内容。
7. 本次公测数据不会成为正式收租、欠款还款、押金收退、退房、费用或转床记录。
8. 不得记录或提交密码、Cookie、Token 或其他认证秘密。

## 反馈记录模板

| employee | test_time | event_type | bed | validation_result | error_code | screen_message | screenshot_reference | expected_result | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  |

每行只记录一次事项验证结果。截图引用应使用内部安全文件名或编号，不得包含认证凭证。
