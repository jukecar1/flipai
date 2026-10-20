# Sources and assumptions: "What if every state's minimum wage kept up with inflation?"

**What is real:** the terrain (AWS/Mapzen elevation tiles, built from NASA SRTM and other data, exaggerated for relief), the state shapes (U.S. Census cartographic boundaries via the us-atlas package, with Alaska and Hawaii shown as insets), and the wage figures below.

**What is illustrative:** the block heights (one dollar of wage = a fixed height), the amber "if it matched inflation" glass, and the camera moves. Alaska and Hawaii are drawn at map scale in the inset positions.

| Claim in the video | Basis |
|---|---|
| Federal minimum wage: $1.60 (1968), $3.35 (1981), $3.80 (Apr 1990), $5.15 (Sept 1997), $7.25 (July 24, 2009); no raise since | U.S. Department of Labor, Wage and Hour Division, "History of Federal Minimum Wage Rates". Shown as the rate in effect on Jan 1 of each year |
| State minimum wages, 1968 to 2025 | FRED (Federal Reserve Bank of St. Louis) series STTMINWG{state} (state minimum wage rates, compiled from the DOL and state sources), value on Jan 1 of each year. The effective minimum is the greater of the state rate and the federal rate. States with no state minimum (AL, LA, MS, SC, TN) or a lower one (GA, WY) use the federal rate. Dollar amounts for D.C. are shown as FRED reports them (D.C. $17.50 on Jan 1, 2025) |
| 31 places above the federal rate on Jan 1, 2025; 20 at $7.25 | **My count** from the series above (30 states and D.C.; AL, GA, ID, IN, IA, KS, KY, LA, MS, NH, NC, ND, OK, PA, SC, TN, TX, UT, WI, WY at the federal rate) |
| In 1968 only Alaska ($2.10) and California ($1.65) were above $1.60 | **My comparison** of the series above for Jan 1, 1968 |
| Inflation | CPI-U, not seasonally adjusted, annual average (BLS CPIAUCNS via FRED); 1968 = 34.8, 2025 = 321.9 (ratio 9.26) |
| "If it matched inflation": $14.81 federal, $19.44 Alaska, $15.27 California | **My arithmetic:** (greater of the state's 1968 rate and $1.60) × CPI(year) ÷ CPI(1968). One scenario, starting from 1968, when the federal minimum's buying power peaked. Indexing from the original 1938 $0.25 gives about $5.71 in 2025, below today's $7.25, so the starting point matters |
| 13 of 51 places at or above their own indexed rate on Jan 1, 2025 | **My comparison**: CA, CO, CT, DE, IL, MD, MA, NJ, NY, OR, RI, WA and D.C. |
| Highest Jan 1, 2025: D.C. $17.50, WA $16.66, CA and NY $16.50 | FRED state series. Some jurisdictions (for example D.C. and certain cities) raise their rates later in the year, and some cities set higher local minimums that this map doesn't show |
| CBO 2021: $15 by 2025 would mean about 1.4 million fewer jobs and 900,000 fewer people in poverty | Congressional Budget Office, "The Budgetary Effects of the Raise the Wage Act of 2021" (Feb 2021, cbo.gov/publication/56975). Estimates for that bill, shown to note that effects are debated |

The scenario is a thought experiment, not a forecast. It doesn't model how employers, prices or jobs would have responded, and state minimums are the statewide rates (local minimums are ignored).
