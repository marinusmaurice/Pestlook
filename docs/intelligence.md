# Pestlook — Agronomic Intelligence Features

> This document lists candidate AI and data-driven intelligence features that could be built on top of the observation, session, trap, and environmental data already collected by Pestlook. The goal is to move from reporting (what happened) to intelligence (what is happening, why, and what to do next).

---

## 🧭 Spread & Movement Intelligence

### Pest Spread Direction Mapping
Using GPS-tagged observations over time, calculate the direction and speed at which a pest population is moving across fields. Display as an animated arrow overlay on the farm map — showing that a pest first appeared in Field A (northwest corner) and has moved 200m northeast over 3 weeks. Allows scouts to get ahead of the infestation rather than react to it.

### Spread Velocity Score
Quantify how fast a pest is spreading field-to-field. A score of 0 means contained; a rising score triggers an alert. Factor in the number of new fields reporting the species each week relative to previously unaffected fields.

### Infestation Origin Detection
Work backwards from the current observation map to identify the most likely origin field for an outbreak — the field that first reported the species at elevated counts. Useful for tracing the source after a multi-farm event.

### Neighbour Risk Alert
When a threshold breach is recorded on a field, automatically flag all adjacent or nearby fields (within a configurable radius) as elevated-risk. Alert their assigned scouts to perform an unscheduled inspection.

### Cross-Farm Outbreak Correlation
If the same pest species spikes simultaneously across multiple farms in a region in the same week, surface this as a regional outbreak event — as opposed to isolated incidents. Helps distinguish seasonal pressure from a genuine new introduction.

---

## 📈 Predictive Intelligence

### Pest Population Forecast
Use historical observation counts for each species + field combination to project the likely population in the next 2–4 weeks using time-series modelling (e.g. linear regression, ARIMA, or a simple seasonal decomposition). Display as a "predicted count" band on the trend chart so scouts know whether to increase inspection frequency.

### Threshold Breach Probability
For each field + pest combination, calculate the probability of a threshold breach in the next scouting session based on the current trajectory. Flag any combination with > 60% probability as high-risk so scouts know to look carefully.

### Optimal Next Scouting Date
Based on how fast a population has been growing in a field, recommend the ideal date for the next visit rather than a fixed weekly schedule. A rapidly growing population might warrant a visit in 3 days; a stable low count might be fine for 10 days.

### Seasonal Pressure Forecast
Using the 18-month historical record plus average temperature for the time of year, forecast which pest species are likely to peak in the coming 4–6 weeks. Display as a "seasonal risk calendar" — e.g. "Aphid pressure typically peaks in late October based on your farm's 2-year history."

### Weather-Correlated Risk Index
Integrate a weather feed (OpenWeatherMap API or similar) and correlate temperature, humidity, and rainfall with observed pest spikes. Produce a daily risk index per pest that rises when conditions are historically associated with population explosions — before scouts even go out.

### Trap Saturation Prediction
Predict when a trap will reach peak capacity based on current catch rate trends. Helps plan servicing schedules so traps do not overflow and produce inaccurate counts.

---

## 🎯 Actionable Recommendations

### Spray Timing Recommendation
Based on population trajectory and the configured action threshold, recommend the ideal treatment window — i.e. "Apply treatment within the next 5 days. If you wait longer than 10 days, the population is projected to be 3× the threshold."

### Scout Priority Queue
Each morning, rank all fields by their combined risk score (population trend + days since last visit + historical peak season + weather index) and present scouts with a prioritised visit list. Highest risk fields appear first regardless of the standard schedule.

### Treatment Effectiveness Scoring
After a threshold breach, track whether observation counts on that field fell in the two sessions following treatment. Score treatments as Effective / Partially Effective / Ineffective. Over time, build a history of which products or actions have worked best for each pest.

### Overdue Action Alerts
Identify fields that have had a threshold breach but have not had a follow-up session within the expected response window (e.g. 48 hours for a critical breach). Escalate to the farm manager.

### Under-scouted High-Risk Zones
Cross-reference fields with low coverage scores (< 50% of target sessions) against fields in a high-season pressure period. Flag the combination as an intelligence blind spot — you do not know what is happening in this field during its most dangerous period of the year.

---

## 🌿 Species & Ecology Intelligence

### Life Stage Progression Tracking
Track the distribution of observed life stages (egg → larva → adult) for a pest species over time on a given field. When the majority of observations shift from larva to adult, calculate how many days to the next egg-laying cycle and pre-schedule a scout visit timed to the next vulnerable larval stage.

### Pest Co-occurrence Map
Identify which pest species tend to appear together on the same field in the same session. High co-occurrence may indicate a shared host plant or environmental trigger, helping agronomists design combined control strategies.

### New Species Early Warning
Detect when a species is recorded on a field for the first time ever, or for the first time in a given season. Flag it immediately as a new introduction rather than letting it blend into routine reporting.

### Beneficial Insect Correlation
If scouts also record beneficial species (predators, parasitoids), correlate their presence with pest population trends. Fields with high beneficial counts should suppress pest populations — if they are not, investigate why.

### Unknown Pest Cluster Detection
When multiple unknown pest sightings occur in the same geographic area within a short time window, group them into a cluster and alert the agronomist. A cluster of unknowns in one corner of a farm is more concerning than isolated individual sightings.

---

## 🌡️ Environmental Correlation Intelligence

### Temperature × Pest Activity Index
For each pest species, compute a temperature sensitivity coefficient from historical data — the correlation between the average temperature at the time of scouting and the observed count. Use this to weight forecast risk upward or downward based on the current week's temperatures.

### Rainfall Lag Effect
Some pests spike 7–14 days after significant rainfall. Detect this lag in historical data per species and include it in the risk forecast — e.g. "Significant rain fell 10 days ago. Historically this precedes a Cutworm spike on this farm."

### Drought Stress Correlation
Correlate water-stressed periods (below-average rainfall over 30+ days) with specific pest species known to exploit stressed plants. Alert when drought conditions have persisted long enough to trigger this risk.

---

## 🛡️ Containment Intelligence

### Containment Zone Recommendation
When a spread-direction analysis shows a pest moving in a specific direction, recommend a containment perimeter — the fields to intensively scout and treat to prevent further spread. Display this as a highlighted zone on the farm map.

### Quarantine Field Flag
When a pest is detected that is not historically present in the region (based on all-tenant aggregate data, anonymised), flag the field as a potential quarantine risk and prompt the user to report to their local agricultural authority.

### Entry Point Analysis
Cross-reference outbreak origin fields with farm entry points, roads, irrigation channels, and bordering farms to suggest the most likely vector of introduction — e.g. "This field borders a public road and was the first to report Fruit Fly. Consider perimeter trapping."

### Resistance Pattern Detection
If the same pest on the same field keeps breaching its threshold season after season despite recorded treatment events, flag it as a potential resistance case. Suggest rotation of control methods.

---

## 📊 Benchmarking & Comparative Intelligence

### Farm-vs-Farm Benchmarking (Anonymous)
Compare a farm's pest pressure score, breach rate, and coverage compliance against anonymised averages across all tenants in the same region or crop type. Show whether the farm is performing better or worse than peers.

### Scout Accuracy Score
Compare each scout's reported counts against the farm average for the same field and species in the same period. Significant outliers (consistently much lower or higher than peers) may indicate reporting errors or calibration issues.

### Year-on-Year Outbreak Comparison
For each field, compare current season cumulative pest counts against the same period in prior years. An early-season count that is already 2× last year's level is a strong early warning signal.

### Seasonal Similarity Matching
Find the historical year that most closely matches current conditions (temperature pattern, rainfall, pest trajectory so far) and use that year's full-season data as a forecast baseline — similar to how meteorologists use analogue years.

---

## 🤖 AI Model Ideas (Longer Term)

### Image-Based Pest Identification
Use a pre-trained computer vision model (e.g. fine-tuned EfficientNet or a Microsoft Custom Vision model) to automatically identify the pest species from a photo taken in the field. Reduces the "unknown pest" rate without requiring scout training.

### Anomaly Detection on Trap Counts
Train an unsupervised anomaly detection model on each trap's historical catch time series. Flag any single session catch count that is statistically anomalous (e.g. 5 standard deviations above the rolling mean) — distinguishing a genuine spike from a data entry error.

### Natural Language Query Interface
Allow farm managers to ask plain-language questions about their data: "Which field had the most aphid breaches last season?" or "Is the locust pressure worse this year than last year on Farm B?" — backed by the analytics endpoints and an LLM interpretation layer.

### Automated Session Notes Summarisation
Use an LLM to read all observation notes from a completed session and produce a one-paragraph plain-English summary for the farm manager — "Scout found high aphid pressure in the northwest corner of Field 3, moderate whitefly throughout Field 1, and one unknown pest with photo attached near the irrigation inlet."

### Predictive Maintenance for Traps
Model each trap's catch-rate history. A trap that was catching 20 pests per check but suddenly drops to 0 — without a corresponding drop in nearby trap catches — is likely faulty, stolen, or obstructed. Flag it for physical inspection rather than assuming pest pressure has dropped.

---

*Last updated: May 2026 — review and prioritise before implementation planning.*
