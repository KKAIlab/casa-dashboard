# Built-in Reference Datasets

These CSVs are bundled with the dashboard as **fertility reference baselines** for
the Prediction page and as quick-start data for new users.

| File | Group | Donors | Cells | Source |
|------|-------|--------|-------|--------|
| `who_human_fertile.csv` | fertile | 3 | 465 | WHO 5th ed. normative ranges (synthetic) |
| `who_human_subfertile.csv` | subfertile | 3 | 445 | Asthenozoospermia ranges (synthetic) |

## What they are

Each row is one human sperm cell with the same columns the dashboard uses for
analysis (`Type`, `VCL`, `VSL`, `VAP`, `LIN`, `STR`, `WOB`, `ALH`, `BCF`,
`Mouse`, `Group`). The distributions match published reference ranges:

- WHO Laboratory Manual for the Examination and Processing of Human Semen, 5th edition (2010)
- Mortimer ST. (1990). *CASA — practical aspects.* J. Androl.
- Holt WV. et al. (1985). *Computer-assisted measurement of sperm swimming speed.* Fertil. Steril.

## What they are *not*

These are **not real patient data**. They are synthetic samples drawn from
published distributions so users can:

1. See the full UI with realistic human values without uploading anything.
2. Use a "fertile baseline" on the Prediction page when they don't have their
   own labeled reference cohort.

For real human CASA data, see the VISEM dataset import workflow in
`scripts/import_visem.mjs` and the top-level README.
