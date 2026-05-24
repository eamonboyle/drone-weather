import opencage from 'opencage-api-client'
import Constants from 'expo-constants'

// Types
export interface LocationSearchResult {
    formatted: string
    latitude: number
    longitude: number
    city?: string
    country?: string
}

interface OpenCageComponents {
    city?: string
    town?: string
    village?: string
    country?: string
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
} as const

// Helper Functions
function validateApiKey(): void {
    if (!CONFIG.API_KEY) {
        throw new Error('OpenCage API key is not configured')
    }
}

function extractCityName(components: OpenCageComponents): string | undefined {
    return components.city || components.town || components.village
}

function transformSearchResult(result: OpenCageResult): LocationSearchResult {
    return {
        formatted: result.formatted,
        latitude: result.geometry.lat,
        longitude: result.geometry.lng,
        city: extractCityName(result.components),
        country: result.components.country,
    }
}

// Main Service
export class LocationSearchService {
    static async searchLocations(
        query: string
    ): Promise<LocationSearchResult[]> {
        try {
            validateApiKey()

            const response = (await opencage.geocode({
                q: query,
                key: CONFIG.API_KEY,
                limit: CONFIG.SEARCH_LIMIT,
            })) as OpenCageResponse

            return response.results.map(transformSearchResult)
        } catch (error) {
            console.error('Error searching locations:', error)
            throw new Error('Failed to search locations')
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
            console.error('Error reverse geocoding:', error)
            throw new Error('Failed to reverse geocode location')
        }
    }
}
