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
- UK airspace reference map (situational awareness only)
- Dark aviation-inspired UI with accessibility labels on key controls

## Getting Started

1. Install dependencies:

    ```bash
    npm install
    ```

2. Start the development server:

    ```bash
    npx expo start
    ```

3. Run on your preferred platform:

- Press `a` for Android
- Press `i` for iOS
- Scan the QR code with Expo Go

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
- date-fns, Reanimated, Gesture Handler

## Configuration

Safety thresholds (Settings):

- Temperature range (°C / °F) — values convert when you switch units
- Maximum wind speed and gusts (km/h / mph)
- Maximum precipitation probability
- Minimum visibility (km / miles)

Cloud cover remains in profile metadata for reference but is **not** a safety slider and does not affect flyability.

`app.config.js` `extra` values are public client configuration (e.g. OpenCage key for the client). Do not store secrets there.

## Quality gates

CI (`.github/workflows/ci.yml`) runs `npm ci`, lint, typecheck, and Jest.

Android Maestro smoke flows live under `maestro/` (Home, Forecast, Map, Settings).

## License

This project is licensed under the MIT License.
