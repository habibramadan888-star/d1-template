# Bed Transfer Traceability Model

The customer history timeline must support future queries:

1. Which beds a customer has occupied.
2. From which bed to which bed.
3. Transfer date and effective date.
4. Operator employee.
5. Deposit carried at transfer time.
6. Arrears carried at transfer time.
7. TTLock state before and after transfer.
8. Whether arrears continued after transfer.
9. Whether the customer checked out soon after transfer.
10. Transfer reason.

Example future timeline:

```text
Bed 431
-> transferred to Bed 652 on 2026-xx-xx
-> deposit carried: xxx AED
-> arrears carried: xxx AED
-> operator: Abdul
```

Traceability anchors must be persisted before production enablement. This task only defines and partially prepares the UI contract.
