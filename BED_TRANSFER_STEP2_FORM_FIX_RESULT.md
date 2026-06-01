# Bed Transfer Step 2 Form Fix Result

Date: 2026-06-01, Asia/Dubai

## Result

When `Bed Transfer / 换床` is selected, Step 2 now renders the dedicated Bed Transfer form instead of only the generic Bed input.

| Field | Required | UI Status |
|---|---:|---|
| From Bed / 原床位 | Yes | Present as `transferFromBed` |
| To Bed / 新床位 | Yes | Present as `bedTo` |
| Transfer Date / 换床日期 | Yes | Present as `transferDate`, defaulted to today by `syncForm()` |
| Reason / 换床原因 | Yes | Present as `transferReason` select |
| Note / 备注 | Optional | Present as shared `remark` field |

## Behavior

- `transferFields` is mounted into `bedTransferStep2Mount`.
- `genericBedFieldWrap` is hidden for Bed Transfer.
- From Bed and To Bed cannot be the same.
- Save remains gated and cannot write production.

## Safety

- Production write: No
- Production migration: No
- Production D1 execute: No
- Production cutover: `PRODUCTION_NO_GO`
