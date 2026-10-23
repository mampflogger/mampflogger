# Project architecture

- Keep weight-loss overview calculations in `src/lib/weightLossSummary.ts` and test their calendar windows and measured start-weight difference independently of rendering, so statistical rules remain verifiable.
- Keep calorie overview calendar-window averages in `src/lib/calorieOverview.ts` and test them independently of rendering to prevent sum/average regressions.