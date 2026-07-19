# Maestro smoke flows

These flows target a **standalone install** of the app
(`appId: com.eamonsdiary.droneweather`), not Expo Go.

## Requirements

- Maestro CLI installed (`https://maestro.mobile.dev`)
- An Android build installed with package `com.eamonsdiary.droneweather`
  (EAS preview/production APK — not Expo Go)

## Run locally

```bash
maestro test maestro/
```

## CI

Maestro is **not** part of the default CI job. Device runners and a built APK
are required. Use a manual workflow (`.github/workflows/maestro.yml`) when an
emulator/device and artifact are available.
