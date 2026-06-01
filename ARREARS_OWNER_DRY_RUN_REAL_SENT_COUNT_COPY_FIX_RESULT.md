# Arrears Owner Dry-Run vs Real Sent Count Copy Fix Result

Date: 2026-06-01, Asia/Dubai

## Problem

Owner arrears batch UI previously showed a selected-count button as `下发员工（N）`. Even though the handler generated only a dry-run list, the button copy could be read as real dispatch.

## Fix

Updated `deploy-worker/public/index-51-main.js`:

- Default button: `生成下发清单`
- Selected button: `生成下发清单（N）`
- Dry-run toast: `已生成 dry-run 下发清单：N 条；真实下发未启用，未写入员工端，员工不会收到这些任务。`

## Copy Contract

| State | Allowed Copy |
|---|---|
| selected | `已选择 N / M` |
| dry-run list generated | `已生成 dry-run 下发清单：N 条` |
| write gate off | `真实下发未启用，未写入员工端` |
| real write success | Only after approved backend write returns success: `已真实下发：N 条` |

## Safety

- No production write.
- No write gate opening.
- No migration.
- No deploy.

Production cutover: `PRODUCTION_NO_GO`.
