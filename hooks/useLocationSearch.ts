import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import * as Location from 'expo-location'
import {
    LocationSearchService,
    LocationSearchResult,
} from '@/services/locationSearchService'
import {
    SavedLocationsService,
    StoredLocation,
} from '@/services/savedLocationsService'
import { useLocation } from '@/contexts/LocationContext'

const SEARCH_DEBOUNCE_MS = 300

interface UseLocationSearchOptions {
    onLocationSelected?: () => void
    enabled?: boolean
}

function coordsMatch(
    a: { latitude: number; longitude: number },
    b: { latitude: number; longitude: number }
): boolean {
    return (
        a.latitude.toFixed(4) === b.latitude.toFixed(4) &&
        a.longitude.toFixed(4) === b.longitude.toFixed(4)
    )
}

export function useLocationSearch({
    onLocationSelected,
    enabled = true,
}: UseLocationSearchOptions = {}) {
    const [searchQuery, setSearchQuery] = useState('')
    const [results, setResults] = useState<LocationSearchResult[]>([])
    const [recents, setRecents] = useState<StoredLocation[]>([])
    const [favorites, setFavorites] = useState<StoredLocation[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isSelecting, setIsSelecting] = useState(false)
    const [selectingId, setSelectingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { updateLocation, location } = useLocation()
    const searchRequestRef = useRef(0)

    const loadStoredLocations = useCallback(async () => {
        const [recentLocations, favoriteLocations] = await Promise.all([
            SavedLocationsService.getRecentLocations(),
            SavedLocationsService.getFavoriteLocations(),
        ])
        setRecents(recentLocations)
        setFavorites(favoriteLocations)
    }, [])

    useFocusEffect(
        useCallback(() => {
            if (!enabled) return
            void loadStoredLocations()
        }, [loadStoredLocations, enabled])
    )

    const runSearch = useCallback(async (query: string, requestId: number) => {
        setIsSearching(true)
        setError(null)

        try {
            const searchResults =
                await LocationSearchService.searchLocations(query)
            if (searchRequestRef.current === requestId) {
                setResults(searchResults)
            }
        } catch (err) {
            if (searchRequestRef.current === requestId) {
                setError('Failed to search locations. Please try again.')
                setResults([])
            }
            console.error(err)
        } finally {
            if (searchRequestRef.current === requestId) {
                setIsSearching(false)
            }
        }
    }, [])

    useEffect(() => {
        const query = searchQuery.trim()
        if (!query) {
            setResults([])
            setError(null)
            setIsSearching(false)
            return
        }

        const requestId = ++searchRequestRef.current
        const timer = setTimeout(() => {
            void runSearch(query, requestId)
        }, SEARCH_DEBOUNCE_MS)

        return () => clearTimeout(timer)
    }, [searchQuery, runSearch])

    const applyLocation = useCallback(
        async (result: LocationSearchResult) => {
            const mockLocation: Location.LocationObject = {
                coords: {
                    latitude: result.latitude,
                    longitude: result.longitude,
                    altitude: null,
                    accuracy: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null,
                },
                timestamp: Date.now(),
            }

            await updateLocation(mockLocation)
            const updatedRecents =
                await SavedLocationsService.addRecentLocation(result)
            setRecents(updatedRecents)
            setResults([])
            setSearchQuery('')
            onLocationSelected?.()
        },
        [updateLocation, onLocationSelected]
    )

    const handleLocationSelect = useCallback(
        async (result: LocationSearchResult, selectionId: string) => {
            if (isSelecting) return

            setIsSelecting(true)
            setSelectingId(selectionId)
            setError(null)

            try {
                await applyLocation(result)
            } catch (err) {
                setError('Failed to update location. Please try again.')
                console.error(err)
            } finally {
                setIsSelecting(false)
                setSelectingId(null)
            }
        },
        [isSelecting, applyLocation]
    )

    const handleToggleFavorite = useCallback(
        async (result: LocationSearchResult) => {
            try {
                const { favorites: updatedFavorites } =
                    await SavedLocationsService.toggleFavorite(result)
                setFavorites(updatedFavorites)
            } catch (err) {
                setError('Failed to update saved location.')
                console.error(err)
            }
        },
        []
    )

    const handleRemoveRecent = useCallback(async (id: string) => {
        const updated = await SavedLocationsService.removeRecentLocation(id)
        setRecents(updated)
    }, [])

    const handleRemoveFavorite = useCallback(async (id: string) => {
        const updated = await SavedLocationsService.removeFavoriteLocation(id)
        setFavorites(updated)
    }, [])

    const handleClearRecents = useCallback(async () => {
        await SavedLocationsService.clearRecentLocations()
        setRecents([])
    }, [])

    const handleClearSearch = useCallback(() => {
        setSearchQuery('')
        setResults([])
        setError(null)
    }, [])

    const dedupedRecents = useMemo(
        () =>
            recents.filter(
                (recent) =>
                    !favorites.some((favorite) => favorite.id === recent.id)
            ),
        [recents, favorites]
    )

    const isActiveLocation = useCallback(
        (result: LocationSearchResult) => {
            if (!location) return false
            return coordsMatch(location.coords, result)
        },
        [location]
    )

    return {
        searchQuery,
        setSearchQuery,
        results,
        favorites,
        dedupedRecents,
        isSearching,
        isSelecting,
        selectingId,
        error,
        handleLocationSelect,
        handleToggleFavorite,
        handleRemoveRecent,
        handleRemoveFavorite,
        handleClearRecents,
        handleClearSearch,
        isActiveLocation,
    }
}
