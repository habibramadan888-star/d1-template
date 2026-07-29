# Owner Nav Wrap Regression Fix Result

Date: 2026-05-30, Asia/Dubai

## Result

The owner primary nav is capped at five visible high-frequency entries:

1. Overview
2. Arrears
3. History
4. Analytics
5. Network

The lower-frequency clients module remains in the page code but is hidden from the primary owner nav so `NETWORK` does not wrap to a second row on mobile.

Regression test: `tests/owner-nav-no-wrap-regression.spec.mjs`.
