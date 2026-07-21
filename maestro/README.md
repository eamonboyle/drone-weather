# Maestro smoke flows

These flows target a **standalone install** of the app
(`appId: com.eamonsdiary.droneweather`), not Expo Go.

## Requirements

- Maestro CLI installed (`https://maestro.mobile.dev`)
- **Java runtime** for the Maestro CLI (Temurin / OpenJDK 17+). On macOS:
  `brew install --cask temurin`
  If `java -version` fails in a new shell, export Temurin first:
  `export JAVA_HOME=$(/usr/libexec/java_home)`
- An Android build installed with package `com.eamonsdiary.droneweather`
  (EAS preview/production APK — not Expo Go), **or** an iOS Simulator / device
  build with the same bundle id
- Network access and a configured OpenCage API key for flows that search
  locations (`map-country-packs.yaml`, `map-toronto-country.yaml`,
  `location-search.yaml`)

## Run locally

```bash
maestro test maestro/
```

Country pack flows that search for a city (exact result labels + deep links):

```bash
export JAVA_HOME=$(/usr/libexec/java_home)
maestro test maestro/map-country-packs.yaml
maestro test maestro/map-toronto-country.yaml
```

These flows select `Toronto, Canada` / `San Francisco, United States of America`
exactly, then open Map via `myapp://map` (iOS tab titles are often missing from
XCTest text).

## Map accessibility checklist (VoiceOver)

After opening the Map tab → layers sheet:

1. Confirm **Close layers** is announced as a **button** (not a switch)
2. Swipe order reaches: Close → UK source switch → OpenAIP switch → Refresh → dismiss/scrim
3. Source switches announce checked/disabled state (including “Suppressed while UK pack is on” when applicable)

If Close briefly misreports as a switch in the Simulator accessibility inspector only, re-check with VoiceOver enabled; treat persistent mislabeling as a platform quirk unless reproducible with VoiceOver.

## CI

Maestro is **not** part of the default CI job. Device runners and a built APK
are required. Use a manual workflow (`.github/workflows/maestro.yml`) when an
emulator/device and artifact are available.
