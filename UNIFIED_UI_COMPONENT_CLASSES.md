# Unified UI Component Classes

Scope: `deploy-worker/public/shared-design-tokens.css`.

| Class                  | Purpose                              | Used By Employee                | Used By Owner                  | Notes                                                           |
| ---------------------- | ------------------------------------ | ------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| `.hl-page`             | Shared page font/background baseline | Yes                             | Yes                            | Employee keeps visual parity while owner opts into final layer. |
| `.hl-shell`            | Max-width container                  | No direct structural dependency | Yes                            | Owner main shell uses shared width.                             |
| `.hl-header`           | Glass sticky header                  | No direct structural dependency | Yes                            | Applied to owner topbar.                                        |
| `.hl-card`             | Glass elevated card                  | Available                       | Owner equivalent via CSS layer | Unified login uses directly.                                    |
| `.hl-card-title`       | Shared card title hierarchy          | Available                       | Available                      | Owner card-title selector mirrors this.                         |
| `.hl-stat-card`        | Shared stat card shell               | Available                       | Yes                            | Dynamic owner KPI cards use this.                               |
| `.hl-stat-value`       | Numeric stat value                   | Available                       | Yes                            | Dynamic owner KPI values use this.                              |
| `.hl-stat-label`       | Stat label                           | Available                       | Yes                            | Dynamic owner KPI labels use this.                              |
| `.hl-button`           | Shared button base                   | Available                       | Available                      | Unified login direct use; owner `.btn` mirrors it.              |
| `.hl-button-primary`   | Green primary button                 | Available                       | Available                      | Unified login direct use; owner `.btn-primary` mirrors it.      |
| `.hl-button-secondary` | Glass secondary button               | Available                       | Available                      | Unified login direct use; owner `.btn-ghost` mirrors it.        |
| `.hl-button-danger`    | Danger button                        | Available                       | Available                      | Owner `.btn-danger` mirrors it.                                 |
| `.hl-input`            | Shared input field                   | Available                       | Available                      | Owner `.inp` mirrors it.                                        |
| `.hl-select`           | Shared select field                  | Available                       | Available                      | Owner `.sel` mirrors it.                                        |
| `.hl-label`            | Shared label text                    | Available                       | Available                      | Owner `.field label` mirrors it.                                |
| `.hl-form-group`       | Form spacing primitive               | Available                       | Available                      | For future component extraction.                                |
| `.hl-grid`             | Shared grid primitive                | Available                       | Available                      | For future component extraction.                                |
| `.hl-section`          | Section spacing primitive            | Available                       | Available                      | For future component extraction.                                |
| `.hl-section-title`    | Section heading                      | Available                       | Available                      | Owner `.page-title` mirrors it.                                 |
| `.hl-alert`            | Alert panel base                     | Available                       | Available                      | For error/success states.                                       |
| `.hl-alert-error`      | Error alert                          | Available                       | Available                      | Red semantic state.                                             |
| `.hl-alert-success`    | Success alert                        | Available                       | Available                      | Green semantic state.                                           |
| `.hl-badge`            | Badge/tag pill                       | Available                       | Available                      | Owner role badge mirrors it.                                    |
| `.hl-loading`          | Loading state container              | Available                       | Available                      | Owner auth loading mirrors it.                                  |
| `.hl-skeleton`         | Skeleton shimmer                     | Available                       | Available                      | For future progressive dashboard loading.                       |
| `.hl-empty-state`      | Empty state container                | Available                       | Available                      | Owner empty-state mirrors it.                                   |
| `.hl-table-card`       | Table/list card shell                | Available                       | Available                      | Owner table wrappers mirror this.                               |
| `.hl-mobile-card`      | Mobile card primitive                | Available                       | Available                      | Owner mobile card style mirrors it.                             |

## Notes

The owner UI still has legacy semantic class names such as `.card`, `.btn`, `.inp`, `.kpi`, and `.tx-table` because removing them would risk breaking existing behavior. The alignment layer maps those selectors to the shared component class values while dynamic KPI markup also includes the explicit `.hl-stat-*` classes.
