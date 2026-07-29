# Arrears Employee Feedback Field Model

Production cutover remains `PRODUCTION_NO_GO`.

| Field                   |    Required | Who Sets           | Owner Display        |
| ----------------------- | ----------: | ------------------ | -------------------- |
| promised_amount_fils    | recommended | employee follow-up | 承诺金额             |
| promised_payment_date   | recommended | employee follow-up | 承诺日期             |
| followup_note           |    optional | employee follow-up | 备注                 |
| contact_result          |    optional | employee follow-up | not shown by default |
| payment_method_expected |    optional | employee follow-up | not shown by default |
| customer_response       |    optional | employee follow-up | not shown by default |

Owner cards default to the first three fields only: promised amount, promised payment date, and note.
