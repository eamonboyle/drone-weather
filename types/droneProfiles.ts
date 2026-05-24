import { WeatherThresholds } from './weatherConfig'

export interface DroneProfile {
    id: string
    name: string
    manufacturer: string
    model: string
    /** Calendar year the model first shipped (used for newest-first sorting). */
    releaseYear: number
    imageUrl?: string
    thresholds: WeatherThresholds
}

/**
 * Weather thresholds are derived from manufacturer-published spec pages.
 *
 * Wind: max wind speed resistance (m/s) converted via msToKmh(); gust = sustained + 2 km/h.
 * Skydio models use published gust handling as windGust.max with sustained ~2 km/h lower.
 * Temperature: operating temperature range from specs.
 * Precipitation: tiered by IP rating / category (no direct manufacturer field).
 * Visibility: 5 km consumer, 4 km enterprise/agriculture, 3 km heavy enterprise.
 */
function msToKmh(mps: number): number {
    return Math.round(mps * 3.6)
}

function gustFromSustained(sustainedKmh: number): number {
    return sustainedKmh + 2
}

export function sortProfilesByReleaseYear(
    profiles: DroneProfile[]
): DroneProfile[] {
    return [...profiles].sort((a, b) => {
        if (b.releaseYear !== a.releaseYear) {
            return b.releaseYear - a.releaseYear
        }
        return a.name.localeCompare(b.name)
    })
}

export const DRONE_PROFILES: DroneProfile[] = [
    // --- DJI Consumer ---
    {
        id: 'dji-mini-2',
        name: 'DJI Mini 2',
        manufacturer: 'DJI',
        model: 'Mini 2',
        releaseYear: 2020,
        imageUrl:
            'https://dji-official-fe.djicdn.com/cms/uploads/a1f1fe1b9bb4c96b5c44b1d9e3c8ac32.png',
        thresholds: {
            temperature: { unit: 'celsius', min: 0, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.5) }, // 10.5 m/s — https://www.dji.com/mini-2/specs
            windGust: { max: gustFromSustained(msToKmh(10.5)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 25 },
        },
    },
    {
        id: 'dji-mini-3-pro',
        name: 'DJI Mini 3 Pro',
        manufacturer: 'DJI',
        model: 'Mini 3 Pro',
        releaseYear: 2022,
        imageUrl:
            'https://dji-official-fe.djicdn.com/cms/uploads/6fd5f7f62f9a6a8f76e6cd4f6640c0c4.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.7) }, // 10.7 m/s — https://www.dji.com/mini-3-pro/specs
            windGust: { max: gustFromSustained(msToKmh(10.7)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-mini-4-pro',
        name: 'DJI Mini 4 Pro',
        manufacturer: 'DJI',
        model: 'Mini 4 Pro',
        releaseYear: 2024,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/0c5e97540d6f8c2d4d9e9b1c8cc0d675.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.7) }, // 10.7 m/s — https://www.dji.com/mini-4-pro/faq
            windGust: { max: gustFromSustained(msToKmh(10.7)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 25 },
        },
    },
    {
        id: 'dji-mini-5-pro',
        name: 'DJI Mini 5 Pro',
        manufacturer: 'DJI',
        model: 'Mini 5 Pro',
        releaseYear: 2025,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/mini-5-pro.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/global/mini-5-pro/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 25 },
        },
    },
    {
        id: 'dji-mini-4k',
        name: 'DJI Mini 4K',
        manufacturer: 'DJI',
        model: 'Mini 4K / Mini 2 SE',
        releaseYear: 2024,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/mini-4k.png',
        thresholds: {
            temperature: { unit: 'celsius', min: 0, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.7) }, // 10.7 m/s — https://www.dji.com/mini-2-se/specs
            windGust: { max: gustFromSustained(msToKmh(10.7)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 25 },
        },
    },
    {
        id: 'dji-neo',
        name: 'DJI Neo',
        manufacturer: 'DJI',
        model: 'Neo',
        releaseYear: 2024,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/neo.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(8) }, // 8 m/s — https://www.dji.com/neo/specs
            windGust: { max: gustFromSustained(msToKmh(8)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 20 },
        },
    },
    {
        id: 'dji-flip',
        name: 'DJI Flip',
        manufacturer: 'DJI',
        model: 'Flip',
        releaseYear: 2025,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/flip.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.7) }, // 10.7 m/s — https://www.dji.com/flip/specs
            windGust: { max: gustFromSustained(msToKmh(10.7)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 25 },
        },
    },
    {
        id: 'dji-air-2s',
        name: 'DJI Air 2S',
        manufacturer: 'DJI',
        model: 'Air 2S',
        releaseYear: 2021,
        imageUrl:
            'https://dji-official-fe.djicdn.com/cms/uploads/1bfb5f5ce5186efe9d1ff3c9dd714945.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.7) }, // 10.7 m/s — https://www.dji.com/air-2s/specs
            windGust: { max: gustFromSustained(msToKmh(10.7)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-air-3',
        name: 'DJI Air 3',
        manufacturer: 'DJI',
        model: 'Air 3',
        releaseYear: 2023,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/air-3.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/air-3/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-air-3s',
        name: 'DJI Air 3S',
        manufacturer: 'DJI',
        model: 'Air 3S',
        releaseYear: 2024,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/air-3s.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/air-3s/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-mavic-3-classic',
        name: 'DJI Mavic 3 Classic',
        manufacturer: 'DJI',
        model: 'Mavic 3 Classic',
        releaseYear: 2022,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/mavic-3-classic.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/mavic-3-classic/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-mavic-3',
        name: 'DJI Mavic 3',
        manufacturer: 'DJI',
        model: 'Mavic 3',
        releaseYear: 2021,
        imageUrl:
            'https://dji-official-fe.djicdn.com/cms/uploads/7c4f1f1c4132f5b6bff3c92876d9231c.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/mavic-3/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-mavic-3-pro',
        name: 'DJI Mavic 3 Pro',
        manufacturer: 'DJI',
        model: 'Mavic 3 Pro',
        releaseYear: 2023,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/f1f81f83c13c813a8f00b47397ef1f51.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/mavic-3-pro/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-mavic-4-pro',
        name: 'DJI Mavic 4 Pro',
        manufacturer: 'DJI',
        model: 'Mavic 4 Pro',
        releaseYear: 2025,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/mavic-4-pro.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/global/mavic-4-pro/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-inspire-3',
        name: 'DJI Inspire 3',
        manufacturer: 'DJI',
        model: 'Inspire 3',
        releaseYear: 2023,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/6e8989a4f91f8edcd11a31d4337be7d7.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/inspire-3/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    // --- DJI FPV ---
    {
        id: 'dji-avata',
        name: 'DJI Avata',
        manufacturer: 'DJI',
        model: 'Avata',
        releaseYear: 2022,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/avata.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.7) }, // 10.7 m/s — https://www.dji.com/avata/specs
            windGust: { max: gustFromSustained(msToKmh(10.7)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 20 },
        },
    },
    {
        id: 'dji-avata-2',
        name: 'DJI Avata 2',
        manufacturer: 'DJI',
        model: 'Avata 2',
        releaseYear: 2024,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/avata-2.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.7) }, // 10.7 m/s — https://www.dji.com/avata-2/specs
            windGust: { max: gustFromSustained(msToKmh(10.7)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 20 },
        },
    },
    // --- DJI Enterprise ---
    {
        id: 'dji-matrice-30t',
        name: 'DJI Matrice 30T',
        manufacturer: 'DJI Enterprise',
        model: 'Matrice 30T',
        releaseYear: 2022,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/67e20b0d5d6587faa2501b6e4a3f9e72.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 50 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s, IP55 — https://www.dji.com/matrice-30/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 3 },
            weather: { maxCloudCover: 100, maxPrecipitationProbability: 50 },
        },
    },
    {
        id: 'dji-matrice-4',
        name: 'DJI Matrice 4 Series',
        manufacturer: 'DJI Enterprise',
        model: 'Matrice 4 Series',
        releaseYear: 2025,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/matrice-4.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 50 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s (takeoff/landing), IP55 — https://enterprise.dji.com/matrice-4-series/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 3 },
            weather: { maxCloudCover: 100, maxPrecipitationProbability: 50 },
        },
    },
    {
        id: 'dji-matrice-350-rtk',
        name: 'DJI Matrice 350 RTK',
        manufacturer: 'DJI Enterprise',
        model: 'Matrice 350 RTK',
        releaseYear: 2023,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/matrice-350-rtk.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 50 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s, IP55 — https://www.dji.com/matrice-350-rtk/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 3 },
            weather: { maxCloudCover: 100, maxPrecipitationProbability: 50 },
        },
    },
    {
        id: 'dji-phantom-4-rtk',
        name: 'DJI Phantom 4 RTK',
        manufacturer: 'DJI Enterprise',
        model: 'Phantom 4 RTK',
        releaseYear: 2018,
        imageUrl:
            'https://dji-official-fe.djicdn.com/cms/uploads/7d3b0a8e30816c1472f6e835f3b9df08.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s — https://www.dji.com/phantom-4-rtk/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    // --- DJI Agriculture ---
    {
        id: 'dji-mavic-3m',
        name: 'DJI Mavic 3M',
        manufacturer: 'DJI Agriculture',
        model: 'Mavic 3M',
        releaseYear: 2022,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/mavic-3m.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s (takeoff/landing) — https://ag.dji.com/mavic-3-m/specs
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-agras-t40',
        name: 'DJI Agras T40',
        manufacturer: 'DJI Agriculture',
        model: 'Agras T40',
        releaseYear: 2022,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/e4e1fdd0d338d1d3bd067aaa0551ad4f.png',
        thresholds: {
            temperature: { unit: 'celsius', min: 0, max: 45 },
            windSpeed: { unit: 'kmh', max: msToKmh(6) }, // 6 m/s, IP67 — https://www.dji.com/t40/specs
            windGust: { max: gustFromSustained(msToKmh(6)) },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 100, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-agras-t50',
        name: 'DJI Agras T50',
        manufacturer: 'DJI Agriculture',
        model: 'Agras T50',
        releaseYear: 2024,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/agras-t50.png',
        thresholds: {
            temperature: { unit: 'celsius', min: 0, max: 45 },
            windSpeed: { unit: 'kmh', max: msToKmh(6) }, // 6 m/s — https://www.dji.com/t50/specs
            windGust: { max: gustFromSustained(msToKmh(6)) },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 100, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'dji-agras-t25',
        name: 'DJI Agras T25',
        manufacturer: 'DJI Agriculture',
        model: 'Agras T25',
        releaseYear: 2024,
        imageUrl:
            'https://dji-official-fe.djicdn.com/dps/agras-t25.png',
        thresholds: {
            temperature: { unit: 'celsius', min: 0, max: 45 },
            windSpeed: { unit: 'kmh', max: msToKmh(6) }, // 6 m/s — https://www.dji.com/t25/specs
            windGust: { max: gustFromSustained(msToKmh(6)) },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 100, maxPrecipitationProbability: 30 },
        },
    },
    // --- Autel Robotics ---
    {
        id: 'autel-evo-nano-plus',
        name: 'Autel EVO Nano+',
        manufacturer: 'Autel Robotics',
        model: 'EVO Nano+',
        releaseYear: 2022,
        imageUrl:
            'https://autelpilot.com/cdn/shop/products/EVO-Nano-orange.png',
        thresholds: {
            temperature: { unit: 'celsius', min: 0, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(10.7) }, // Level 5 (~10.7 m/s) — https://shop.autelrobotics.com/pages/evo-nano-specification
            windGust: { max: gustFromSustained(msToKmh(10.7)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 25 },
        },
    },
    {
        id: 'autel-evo-lite-plus',
        name: 'Autel EVO Lite+',
        manufacturer: 'Autel Robotics',
        model: 'EVO Lite+',
        releaseYear: 2022,
        imageUrl:
            'https://autelpilot.com/cdn/shop/products/EVO-Lite-orange.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(11) }, // 11 m/s — https://shop.autelrobotics.com/pages/evo-lite-specification
            windGust: { max: gustFromSustained(msToKmh(11)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 25 },
        },
    },
    {
        id: 'autel-evo-2-pro',
        name: 'Autel EVO II Pro',
        manufacturer: 'Autel Robotics',
        model: 'EVO II Pro',
        releaseYear: 2020,
        imageUrl:
            'https://autelpilot.com/cdn/shop/products/EVO-II-Pro-orange.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // Force 8 (~12 m/s) — https://shop.autelrobotics.com/pages/evo-ii-pro-specification
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    {
        id: 'autel-evo-max-4t',
        name: 'Autel EVO Max 4T',
        manufacturer: 'Autel Robotics',
        model: 'EVO Max 4T',
        releaseYear: 2023,
        imageUrl:
            'https://autelpilot.com/cdn/shop/products/EVO-Max-4T.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 50 },
            windSpeed: { unit: 'kmh', max: msToKmh(12) }, // 12 m/s cruise, IP43 — https://shop.autelrobotics.com/pages/evo-max-4t-aircraft
            windGust: { max: gustFromSustained(msToKmh(12)) },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 95, maxPrecipitationProbability: 35 },
        },
    },
    {
        id: 'autel-dragonfish',
        name: 'Autel Dragonfish',
        manufacturer: 'Autel Robotics',
        model: 'Dragonfish',
        releaseYear: 2022,
        imageUrl:
            'https://autelpilot.com/cdn/shop/products/Dragonfish_Standard_45.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 45 },
            windSpeed: { unit: 'kmh', max: msToKmh(14) }, // 14 m/s — https://shop.autelrobotics.com/pages/dragonfish-specification
            windGust: { max: gustFromSustained(msToKmh(14)) },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 95, maxPrecipitationProbability: 40 },
        },
    },
    // --- Skydio ---
    {
        id: 'skydio-2-plus',
        name: 'Skydio 2+',
        manufacturer: 'Skydio',
        model: '2+',
        releaseYear: 2022,
        imageUrl:
            'https://assets.skydio.com/images/2plus/2plus-sport-kit-front-three-quarter.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(11) }, // 25 mph sustained — https://www.skydio.com/2-plus/technical-specs
            windGust: { max: msToKmh(11) + 2 },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 20 },
        },
    },
    {
        id: 'skydio-x10',
        name: 'Skydio X10',
        manufacturer: 'Skydio',
        model: 'X10',
        releaseYear: 2023,
        imageUrl:
            'https://assets.skydio.com/images/x10/x10-front-three-quarter.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 45 },
            windSpeed: { unit: 'kmh', max: 43 }, // 28 mph gust handling — https://www.skydio.com/x10
            windGust: { max: 45 },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 95, maxPrecipitationProbability: 50 },
        },
    },
    {
        id: 'skydio-x10d',
        name: 'Skydio X10D',
        manufacturer: 'Skydio',
        model: 'X10D',
        releaseYear: 2024,
        imageUrl:
            'https://assets.skydio.com/images/x10d/x10d-front-three-quarter.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 45 },
            windSpeed: { unit: 'kmh', max: 43 }, // 28 mph / 12.8 m/s gust — https://www.skydio.com/x10d/technical-specs
            windGust: { max: 45 },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 95, maxPrecipitationProbability: 50 },
        },
    },
    // --- Parrot ---
    {
        id: 'parrot-anafi-ai',
        name: 'Parrot ANAFI Ai',
        manufacturer: 'Parrot',
        model: 'ANAFI Ai',
        releaseYear: 2021,
        imageUrl:
            'https://www.parrot.com/assets/s/2021/07/packshot-anafi-ai.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(14) }, // 14 m/s in flight — https://www.parrot.com/assets/s3fs-public/2023-02/ANAFI-Ai-product-sheet.pdf
            windGust: { max: gustFromSustained(msToKmh(14)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 35 },
        },
    },
    {
        id: 'parrot-anafi-usa',
        name: 'Parrot ANAFI USA',
        manufacturer: 'Parrot',
        model: 'ANAFI USA',
        releaseYear: 2020,
        imageUrl:
            'https://www.parrot.com/assets/s/2020/08/packshot-anafi-usa.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -36, max: 50 },
            windSpeed: { unit: 'kmh', max: msToKmh(14.7) }, // 14.7 m/s, IP53 — https://www.parrot.com/en/drones/anafi-usa/technical-specifications
            windGust: { max: gustFromSustained(msToKmh(14.7)) },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 95, maxPrecipitationProbability: 40 },
        },
    },
    // --- Freefly Systems ---
    {
        id: 'freefly-astro',
        name: 'Freefly Astro',
        manufacturer: 'Freefly Systems',
        model: 'Astro',
        releaseYear: 2020,
        imageUrl: 'https://freeflysystems.com/static/astro_hero.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -10, max: 40 },
            windSpeed: { unit: 'kmh', max: msToKmh(12.5) }, // 12.5 m/s — https://freeflysystems.com/astro
            windGust: { max: gustFromSustained(msToKmh(12.5)) },
            visibility: { unit: 'kilometers', min: 5 },
            weather: { maxCloudCover: 90, maxPrecipitationProbability: 30 },
        },
    },
    // --- Yuneec ---
    {
        id: 'yuneec-h520e',
        name: 'Yuneec H520E',
        manufacturer: 'Yuneec',
        model: 'H520E',
        releaseYear: 2020,
        imageUrl: 'https://yuneec.com/static/h520e_hero.png',
        thresholds: {
            temperature: { unit: 'celsius', min: -20, max: 45 },
            windSpeed: { unit: 'kmh', max: msToKmh(13) }, // 13 m/s — https://www.yuneec.com/h520e
            windGust: { max: gustFromSustained(msToKmh(13)) },
            visibility: { unit: 'kilometers', min: 4 },
            weather: { maxCloudCover: 95, maxPrecipitationProbability: 35 },
        },
    },
]
