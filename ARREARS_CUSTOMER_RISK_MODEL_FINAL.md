# Arrears Customer Risk Model Final

Status: final model design only

## Input Metrics

1. `total_arrears_count`
2. `arrears_count_30d`
3. `arrears_count_90d`
4. `avg_overdue_days`
5. `max_overdue_days`
6. `promise_count`
7. `promise_missed_count`
8. `short_paid_count`
9. `payment_reported_unmatched_count`
10. `moved_out_count`
11. `false_positive_count`
12. `difficult_contact_count`

## Score Rules

- Every overdue event: +1.
- Overdue more than 7 days: +2.
- Overdue more than 15 days: +3.
- Promise missed: +3.
- Repeated short payment: +2.
- Employee marks difficult contact: +2.
- On-time payment: -1.
- Consecutive normal payment: -2.

## Risk Levels

| Score | Level                 | Meaning                    |
| ----: | --------------------- | -------------------------- |
|   0-2 | `normal`              | Normal                     |
|   3-5 | `watch`               | Watch                      |
|   6-9 | `high_risk`           | High risk                  |
|   10+ | `blacklist_candidate` | Candidate for owner review |

## Business Boundary

Risk score is an operational reference only. It must not automatically ban, block, close, void, or alter accounting status.
