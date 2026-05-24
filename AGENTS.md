# Agent guidance — Drone Weather

## Flyability business rules

### Cloud cover is informational only

**Cloud cover must not affect whether a flight is considered safe to fly.**

- `DroneFlyabilityService.checkFlyingConditions` must not reject hours based on `cloudCover` or `maxCloudCover`.
- UI that reflects flyability (Home status, Hour selector, Week/Forecast safety colors, filter chips) must not treat cloud cover as a blocking factor.
- Cloud cover may still be shown in weather grids, detail modals, and forecast tables with **neutral** styling (not green/red go/no-go).
- `WeatherThresholds.weather.maxCloudCover` remains in types and drone profiles for reference/metadata, but is not a user-facing safety slider and is not enforced in flyability logic.

When adding thresholds or safety checks, only use factors that currently gate flyability: temperature, wind speed, wind gusts, visibility, and precipitation probability.
