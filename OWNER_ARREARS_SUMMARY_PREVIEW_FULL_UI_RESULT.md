# OWNER ARREARS SUMMARY / PREVIEW / FULL UI RESULT

The owner overview arrears module now has separate concepts:

| UI Area               | Meaning                            | Source                                                                |
| --------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| Summary chips         | Full loaded pool totals            | `ownerArrearsSummary(ownerArrearsActiveRows())`                       |
| Preview cards         | First 5 cards for overview density | `pageRows = sorted.slice(0, ARREARS_OVERVIEW_PAGE_SIZE)`              |
| Full view             | All currently loaded tasks         | `state.arrearsExpanded` with `state.arrearsLimit >= active row count` |
| Full page arrears tab | Paginated card list                | `renderArrearsPanel()`                                                |

This avoids treating the 5-card overview as the full arrears pool.
