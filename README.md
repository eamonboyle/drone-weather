# Drone Weather App

A React Native (Expo) app that helps drone pilots decide whether conditions are safe to fly, using real-time weather and customizable safety thresholds.

## Features

- Real-time weather for your current or saved location
- Customizable safety thresholds for:
  - Temperature
  - Wind speed and gusts
  - Precipitation probability
  - Visibility
- Cloud cover shown as **informational only** (never blocks GO/NO-GO)
- Structured flyability checks shared across Home, Forecast, and details
- Per-location weather cache (60-minute TTL)
- Forecast hours labeled in the location’s timezone
- Drone profiles, unit conversion (metric/imperial), and location search
- Native airspace map (MapLibre) with UK pack + OpenAIP country layers (situational awareness only)
- Dark aviation-inspired UI with accessibility labels on key controls

## Getting Started

1. Install dependencies:

    ```bash
    npm install
    ```

2. Start the development server (requires a **dev build** — MapLibre is not in Expo Go):

    ```bash
    npx expo start
    ```

3. Run on your preferred platform with a development client:

```bash
npx expo run:ios
# or
npx expo run:android
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Expo dev server |
| `npm run test` | Jest in watch mode |
| `npm run test:ci` | Jest once (CI) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint via Expo |
| `npm run format` | Prettier |

## Technology Stack

- React Native / Expo / TypeScript
- NativeWind (Tailwind)
- Expo Router
- Open-Meteo weather API
- OpenCage geocoding
- MapLibre Native maps + OpenFreeMap basemap tiles
- Free airspace packs: NATS UK UAS dataset (ingest) and OpenAIP country GeoJSON
- date-fns, Reanimated, Gesture Handler

## Airspace data

The Map tab is **reference only** and does not affect weather flyability.

| Layer | Source | Notes |
|--------|--------|--------|
| UK pack | Bundled `assets/airspace/uk-restrictions.geojson` | Bootstrap from OpenAIP GB, or replace via NATS KMZ ingest |
| Global | OpenAIP daily country exports (cached on device) | CC BY-NC 4.0 — attribution required; data must remain free (not sold exclusively). Large countries may be rejected on-device until prebuilt packs exist. |
| Basemap | OpenFreeMap / OpenMapTiles / OpenStreetMap | Native MapLibre attribution + ODbL credit in Map → About |

```bash
# Official NATS UAS KMZ/KML → bundled UK pack
npm run airspace:ingest-nats -- path/to/uas-flight-restrictions.kmz

# Free interim UK pack from OpenAIP GB
npm run airspace:bootstrap-uk
```

Download NATS digital datasets from the [NATS UAS Restriction Zones / Digital Datasets](https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets) page (AIRAC cycle). Temporary NOTAMs are not included.

## Configuration

Safety thresholds (Settings):

- Temperature range (°C / °F) — values convert when you switch units
- Maximum wind speed and gusts (km/h / mph)
- Maximum precipitation probability
- Minimum visibility (km / miles)

Cloud cover remains in profile metadata for reference but is **not** a safety slider and does not affect flyability.

### OpenCage (location search)

1. Copy `.env.example` → `.env`
2. Set `OPENCAGE_API_KEY` from https://opencagedata.com/dashboard#api-keys
3. Restart Metro (`npx expo start --dev-client`) so `app.config.js` reloads

`.env` is gitignored. The key is embedded in the client bundle via `expo-constants` `extra` — treat it as a **public client key** (restrict usage in the OpenCage dashboard if available). Do not put high-value secrets there.

## Quality gates

CI (`.github/workflows/ci.yml`) runs `npm ci`, lint, typecheck, and Jest.

Android Maestro smoke flows live under `maestro/` (Home, Forecast, Map, Settings).

## License

This project is licensed under the MIT License.
