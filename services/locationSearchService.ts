import opencage from 'opencage-api-client'
import Constants from 'expo-constants'

import { normalizeCountryCode } from '@/constants/mapConfig'

// Types
export interface LocationSearchResult {
    formatted: string
    latitude: number
    longitude: number
    city?: string
    country?: string
    /** ISO 3166-1 alpha-2, lowercase when present. */
    countryCode?: string
}

interface OpenCageComponents {
    city?: string
    town?: string
    village?: string
    country?: string
    country_code?: string
    'ISO_3166-1_alpha-2'?: string
}

interface OpenCageGeometry {
    lat: number
    lng: number
}

interface OpenCageResult {
    formatted: string
    geometry: OpenCageGeometry
    components: OpenCageComponents
}

interface OpenCageResponse {
    results: OpenCageResult[]
}

// Constants
const CONFIG = {
    API_KEY: Constants.expoConfig?.extra?.opencageApiKey,
    SEARCH_LIMIT: 8,
    /** Avoid OpenCage calls on 1-character keystrokes (often 400 / wasted quota). */
    MIN_QUERY_LENGTH: 2,
} as const

interface OpenCageRequestError extends Error {
    status?: { code?: number; message?: string }
}

// Helper Functions
function validateApiKey(): void {
    if (!CONFIG.API_KEY) {
        throw new Error('OpenCage API key is not configured')
    }
}

function openCageErrorMessage(
    error: unknown,
    fallback: string
): string {
    const status = (error as OpenCageRequestError | undefined)?.status
    const code = status?.code
    switch (code) {
        case 401:
        case 403:
            return 'Location search is not configured correctly.'
        case 402:
        case 429:
            return 'Location search is temporarily unavailable. Try again shortly.'
        case 400:
            return 'Could not search for that place. Try a fuller place name.'
        default:
            return fallback
    }
}

function extractCityName(components: OpenCageComponents): string | undefined {
    return components.city || components.town || components.village
}

function extractCountryCode(
    components: OpenCageComponents
): string | undefined {
    return (
        normalizeCountryCode(components.country_code) ??
        normalizeCountryCode(components['ISO_3166-1_alpha-2']) ??
        undefined
    )
}

function transformSearchResult(result: OpenCageResult): LocationSearchResult {
    const countryCode = extractCountryCode(result.components)
    return {
        formatted: result.formatted,
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        city: extractCityName(result.components),
        country: result.components.country,
        ...(countryCode ? { countryCode } : {}),
    }
}

function resultIdentity(result: LocationSearchResult): string {
    const region = [result.city, result.country].filter(Boolean).join('|')
    const coords = `${result.latitude.toFixed(4)},${result.longitude.toFixed(4)}`
    return region ? `${region}@${coords}` : coords
}

function dedupeSearchResults(
    results: LocationSearchResult[]
): LocationSearchResult[] {
    const seen = new Set<string>()
    const deduped: LocationSearchResult[] = []
    for (const result of results) {
        const key = resultIdentity(result)
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(result)
    }
    return deduped
}

// Main Service
export class LocationSearchService {
    static async searchLocations(
        query: string
    ): Promise<LocationSearchResult[]> {
        const trimmed = query.trim()
        if (trimmed.length < CONFIG.MIN_QUERY_LENGTH) {
            return []
        }

        try {
            validateApiKey()

            const response = (await opencage.geocode({
                q: trimmed,
                key: CONFIG.API_KEY,
                limit: CONFIG.SEARCH_LIMIT,
            })) as OpenCageResponse

            return dedupeSearchResults(
                response.results.map(transformSearchResult)
            )
        } catch (error) {
            const status = (error as OpenCageRequestError | undefined)?.status
            console.warn('OpenCage search failed', {
                query: trimmed,
                code: status?.code,
                message: status?.message ?? String(error),
            })
            throw new Error(
                openCageErrorMessage(
                    error,
                    'Failed to search locations. Please try again.'
                )
            )
        }
    }

    static async reverseGeocode(
        latitude: number,
        longitude: number
    ): Promise<LocationSearchResult | null> {
        try {
            validateApiKey()

            const response = (await opencage.geocode({
                q: `${latitude},${longitude}`,
                key: CONFIG.API_KEY,
                limit: 1,
            })) as OpenCageResponse

            if (response.results.length === 0) {
                return null
            }

            return transformSearchResult(response.results[0])
        } catch (error) {
            const status = (error as OpenCageRequestError | undefined)?.status
            console.warn('OpenCage reverse geocode failed', {
                code: status?.code,
                message: status?.message ?? String(error),
            })
            throw new Error(
                openCageErrorMessage(
                    error,
                    'Failed to reverse geocode location'
                )
            )
        }
    }
}
