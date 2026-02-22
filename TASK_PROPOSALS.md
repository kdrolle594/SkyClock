# Task proposals from codebase review

## 1) Typo fix task
**Title:** Replace the leftover editor placeholder comment in `app.js`

- **Location:** `app.js` around the weather helper block (`// --- Replace or insert the helper + updated functions below ---`).
- **Issue:** This is an editing instruction, not a meaningful production comment.
- **Proposed fix:** Replace it with a real section header, e.g. `// Network helpers and weather API integration`.
- **Acceptance criteria:**
  - No instructional placeholder wording remains in `app.js`.
  - The replacement comment clearly describes the following code section.

## 2) Bug fix task
**Title:** Fix auto-refresh guard so coordinates with zero still refresh weather

- **Location:** `app.js` in the 10-minute interval callback.
- **Issue:** The guard currently checks `if (currentLocation.lat && currentLocation.lon)`, so `0` is treated as false.
- **User-visible impact:** Weather stops auto-refreshing for valid coordinates that include zero (e.g., equator/prime meridian regions).
- **Proposed fix:** Use explicit null/undefined checks:
  - `if (currentLocation.lat != null && currentLocation.lon != null)`
- **Acceptance criteria:**
  - Auto-refresh runs for `lat = 0`, `lon = 0`.
  - Auto-refresh still does not run when lat/lon are unset.

## 3) Code comment/documentation discrepancy task
**Title:** Make the sun/moon arc comment match the actual 24-hour calculation

- **Location:** `app.js` comments above the `angle` calculation in `updateClock()`.
- **Issue:** Comment says sunrise-to-sunset arc (~6am–6pm), but the code computes `dayPercentage = totalSeconds / 86400` and applies it across the full day.
- **Proposed fix (choose one):**
  1. Update comments to explain the full 24-hour arc behavior (recommended, low risk), or
  2. Change the math to reflect the documented 6am–6pm arc.
- **Acceptance criteria:**
  - Comments accurately describe the implemented behavior.
  - No contradictory explanation remains in `updateClock()`.

## 4) Test improvement task
**Title:** Add automated tests for weather-code mapping and coordinate guard edge cases

- **Gap:** No automated tests currently protect key logic.
- **Proposed scope:**
  - Extract pure helpers into a testable module (e.g., `mapWeatherCode`, refresh guard predicate).
  - Add tests for representative WMO mappings and fallback behavior.
  - Add explicit tests for coordinate guard values: `0`, positive, negative, `null`, `undefined`.
- **Suggested tooling:** Vitest or Jest with a lightweight test script in `package.json`.
- **Acceptance criteria:**
  - Tests fail on the old falsy-coordinate guard and pass with the fix.
  - Mapping tests cover clear, cloudy, foggy, drizzle/rain, snow, storm, and unknown code fallback.
