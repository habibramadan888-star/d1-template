# Owner Overview Trend Interpretation Result

Trend values are deterministic and conservative.

| Input | Direction | Interpretation |
|---|---|---|
| current > comparison | up | improving |
| current < comparison | down | declining |
| current = comparison | flat | flat |
| current = 0 and comparison = 0 | flat | no_data |
| comparison = 0 and current > 0 | up | improving, percent_delta null |

UI labels:

- `UP`
- `DOWN`
- `FLAT`
- `NO DATA`

The UI must not invent percentages when the comparison denominator is zero.
