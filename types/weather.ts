export type FlyabilityFactor =
    | 'temperature'
    | 'windSpeed'
    | 'windGust'
    | 'visibility'
    | 'precipitation'

export type FlyabilityCheckStatus = 'safe' | 'unsafe' | 'unavailable'

export interface FlyabilityCheck {
    factor: FlyabilityFactor
    status: FlyabilityCheckStatus
    value: number | null
    displayValue: string
    thresholdLabel: string
    explanation: string
}

export interface DroneFlightConditions {
    isSuitable: boolean
    checks: FlyabilityCheck[]
    /** Derived from unsafe/unavailable checks for display compatibility */
    reasons: string[]
    windSpeedDetails: { height: string; speed: number | null }[]
    windGustDetails: { height: string; speed: number | null }[]
}

export interface WeatherLocationMeta {
    latitude: number
    longitude: number
    timezone: string
    utcOffsetSeconds: number
    fetchedAt: number
    source: string
}

export interface HourlyWeatherData {
    /** UTC instant */
    time: Date
    temperature2m: number | null
    relativeHumidity2m: number | null
    dewPoint2m: number | null
    apparentTemperature: number | null
    precipitationProbability: number | null
    precipitation: number | null
    rain: number | null
    showers: number | null
    snowfall: number | null
    snowDepth: number | null
    weatherCode: number | null
    cloudCover: number | null
    cloudCoverLow: number | null
    cloudCoverMid: number | null
    cloudCoverHigh: number | null
    visibility: number | null
    evapotranspiration: number | null
    et0FaoEvapotranspiration: number | null
    vapourPressureDeficit: number | null
    windSpeed10m: number | null
    windSpeed80m: number | null
    windSpeed120m: number | null
    windSpeed180m: number | null
    windDirection10m: number | null
    windDirection80m: number | null
    windDirection120m: number | null
    windDirection180m: number | null
    windGusts10m: number | null
    temperature80m: number | null
    temperature120m: number | null
    temperature180m: number | null
}

export interface WeatherData {
    hourlyData: HourlyWeatherData[]
    meta?: WeatherLocationMeta
}

export const WEATHER_SOURCE_OPEN_METEO = 'Open-Meteo'
