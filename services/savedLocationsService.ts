import AsyncStorage from '@react-native-async-storage/async-storage'
import { LocationSearchResult } from '@/services/locationSearchService'

export interface StoredLocation extends LocationSearchResult {
    id: string
    savedAt: number
}

const CONFIG = {
    RECENTS_KEY: 'location_recents',
    FAVORITES_KEY: 'location_favorites',
    MAX_RECENTS: 12,
} as const

function locationId(latitude: number, longitude: number): string {
    return `${latitude.toFixed(4)},${longitude.toFixed(4)}`
}

function toStoredLocation(result: LocationSearchResult): StoredLocation {
    return {
        ...result,
        id: locationId(result.latitude, result.longitude),
        savedAt: Date.now(),
    }
}

async function readList(key: string): Promise<StoredLocation[]> {
    try {
        const raw = await AsyncStorage.getItem(key)
        return raw ? JSON.parse(raw) : []
    } catch (error) {
        console.error(`Error reading ${key}:`, error)
        return []
    }
}

async function writeList(
    key: string,
    locations: StoredLocation[]
): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(locations))
}

function upsertLocation(
    locations: StoredLocation[],
    next: StoredLocation,
    maxItems: number
): StoredLocation[] {
    const withoutDuplicate = locations.filter((item) => item.id !== next.id)
    return [next, ...withoutDuplicate].slice(0, maxItems)
}

export class SavedLocationsService {
    static async getRecentLocations(): Promise<StoredLocation[]> {
        return readList(CONFIG.RECENTS_KEY)
    }

    static async getFavoriteLocations(): Promise<StoredLocation[]> {
        return readList(CONFIG.FAVORITES_KEY)
    }

    static async addRecentLocation(
        result: LocationSearchResult
    ): Promise<StoredLocation[]> {
        const stored = toStoredLocation(result)
        const recents = await readList(CONFIG.RECENTS_KEY)
        const updated = upsertLocation(
            recents,
            stored,
            CONFIG.MAX_RECENTS
        )
        await writeList(CONFIG.RECENTS_KEY, updated)
        return updated
    }

    static async toggleFavorite(
        result: LocationSearchResult
    ): Promise<{ favorites: StoredLocation[]; isFavorite: boolean }> {
        const stored = toStoredLocation(result)
        const favorites = await readList(CONFIG.FAVORITES_KEY)
        const exists = favorites.some((item) => item.id === stored.id)

        const updated = exists
            ? favorites.filter((item) => item.id !== stored.id)
            : upsertLocation(favorites, stored, CONFIG.MAX_RECENTS)

        await writeList(CONFIG.FAVORITES_KEY, updated)
        return { favorites: updated, isFavorite: !exists }
    }

    static async removeRecentLocation(id: string): Promise<StoredLocation[]> {
        const recents = await readList(CONFIG.RECENTS_KEY)
        const updated = recents.filter((item) => item.id !== id)
        await writeList(CONFIG.RECENTS_KEY, updated)
        return updated
    }

    static async removeFavoriteLocation(id: string): Promise<StoredLocation[]> {
        const favorites = await readList(CONFIG.FAVORITES_KEY)
        const updated = favorites.filter((item) => item.id !== id)
        await writeList(CONFIG.FAVORITES_KEY, updated)
        return updated
    }

    static async clearRecentLocations(): Promise<void> {
        await AsyncStorage.removeItem(CONFIG.RECENTS_KEY)
    }

    static isFavorite(
        favorites: StoredLocation[],
        latitude: number,
        longitude: number
    ): boolean {
        const id = locationId(latitude, longitude)
        return favorites.some((item) => item.id === id)
    }
}
