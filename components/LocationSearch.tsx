import React, { useCallback, useEffect, useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Pressable,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
    LocationSearchService,
    LocationSearchResult,
} from '@/services/locationSearchService'
import {
    SavedLocationsService,
    StoredLocation,
} from '@/services/savedLocationsService'
import * as Location from 'expo-location'
import { useLocation } from '@/contexts/LocationContext'

interface LocationSearchProps {
    onLocationSelected?: () => void
}

export function LocationSearch({ onLocationSelected }: LocationSearchProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [results, setResults] = useState<LocationSearchResult[]>([])
    const [recents, setRecents] = useState<StoredLocation[]>([])
    const [favorites, setFavorites] = useState<StoredLocation[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isSelecting, setIsSelecting] = useState(false)
    const [selectingId, setSelectingId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { updateLocation } = useLocation()

    const loadStoredLocations = useCallback(async () => {
        const [recentLocations, favoriteLocations] = await Promise.all([
            SavedLocationsService.getRecentLocations(),
            SavedLocationsService.getFavoriteLocations(),
        ])
        setRecents(recentLocations)
        setFavorites(favoriteLocations)
    }, [])

    useEffect(() => {
        void loadStoredLocations()
    }, [loadStoredLocations])

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setError('Please enter a location to search')
            setResults([])
            return
        }

        setIsSearching(true)
        setError(null)

        try {
            const searchResults = await LocationSearchService.searchLocations(
                searchQuery.trim()
            )
            setResults(searchResults)
        } catch (err) {
            setError('Failed to search locations. Please try again.')
            console.error(err)
        } finally {
            setIsSearching(false)
        }
    }

    const applyLocation = async (result: LocationSearchResult) => {
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
    }

    const handleLocationSelect = async (
        result: LocationSearchResult,
        selectionId: string
    ) => {
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
    }

    const handleToggleFavorite = async (result: LocationSearchResult) => {
        try {
            const { favorites: updatedFavorites } =
                await SavedLocationsService.toggleFavorite(result)
            setFavorites(updatedFavorites)
        } catch (err) {
            setError('Failed to update saved location.')
            console.error(err)
        }
    }

    const handleRemoveRecent = async (id: string) => {
        const updated = await SavedLocationsService.removeRecentLocation(id)
        setRecents(updated)
    }

    const handleRemoveFavorite = async (id: string) => {
        const updated = await SavedLocationsService.removeFavoriteLocation(id)
        setFavorites(updated)
    }

    const handleClearRecents = async () => {
        await SavedLocationsService.clearRecentLocations()
        setRecents([])
    }

    const showStoredSections = results.length === 0 && !isSearching

    return (
        <View className="w-full">
            <View className="flex-row items-center gap-2 p-4">
                <TextInput
                    className="flex-1 h-11 px-4 text-slate-100 rounded-xl"
                    style={{
                        backgroundColor: 'rgba(22, 26, 32, 0.8)',
                        fontFamily: 'DMSans',
                    }}
                    placeholder="Search location..."
                    placeholderTextColor="#64748b"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    editable={!isSelecting}
                />
                <TouchableOpacity
                    onPress={handleSearch}
                    disabled={isSearching || isSelecting}
                    className="bg-amber-500 px-4 h-11 rounded-xl justify-center"
                    style={{ opacity: isSearching || isSelecting ? 0.6 : 1 }}
                >
                    <Text
                        className="text-background font-semibold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Search
                    </Text>
                </TouchableOpacity>
            </View>

            {isSearching && (
                <View className="p-4">
                    <ActivityIndicator size="small" color="#f59e0b" />
                </View>
            )}

            {error && (
                <Text
                    className="text-red-400 px-4 text-sm"
                    style={{ fontFamily: 'DMSans' }}
                >
                    {error}
                </Text>
            )}

            <ScrollView className="max-h-80">
                {showStoredSections && favorites.length > 0 && (
                    <LocationSection
                        title="Saved Locations"
                        locations={favorites}
                        favorites={favorites}
                        selectingId={selectingId}
                        isSelecting={isSelecting}
                        onSelect={handleLocationSelect}
                        onToggleFavorite={handleToggleFavorite}
                        onRemove={handleRemoveFavorite}
                    />
                )}

                {showStoredSections && recents.length > 0 && (
                    <LocationSection
                        title="Recent Locations"
                        locations={recents}
                        favorites={favorites}
                        selectingId={selectingId}
                        isSelecting={isSelecting}
                        onSelect={handleLocationSelect}
                        onToggleFavorite={handleToggleFavorite}
                        onRemove={handleRemoveRecent}
                        headerAction={
                            <Pressable onPress={() => void handleClearRecents()}>
                                <Text
                                    className="text-amber-500 text-xs"
                                    style={{ fontFamily: 'DMSans' }}
                                >
                                    Clear
                                </Text>
                            </Pressable>
                        }
                    />
                )}

                {showStoredSections &&
                    favorites.length === 0 &&
                    recents.length === 0 && (
                        <Text
                            className="text-slate-500 text-center py-6 px-4"
                            style={{ fontFamily: 'DMSans' }}
                        >
                            Search for a launch site to save it here for quick
                            access.
                        </Text>
                    )}

                {results.map((result, index) => {
                    const selectionId = `search-${result.latitude}-${result.longitude}-${index}`
                    const isFavorite = SavedLocationsService.isFavorite(
                        favorites,
                        result.latitude,
                        result.longitude
                    )

                    return (
                        <LocationRow
                            key={selectionId}
                            result={result}
                            selectionId={selectionId}
                            isFavorite={isFavorite}
                            isActiveSelection={selectingId === selectionId}
                            isSelecting={isSelecting}
                            onSelect={handleLocationSelect}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    )
                })}
            </ScrollView>
        </View>
    )
}

interface LocationSectionProps {
    title: string
    locations: StoredLocation[]
    favorites: StoredLocation[]
    selectingId: string | null
    isSelecting: boolean
    onSelect: (result: LocationSearchResult, selectionId: string) => void
    onToggleFavorite: (result: LocationSearchResult) => void
    onRemove: (id: string) => void
    headerAction?: React.ReactNode
}

function LocationSection({
    title,
    locations,
    favorites,
    selectingId,
    isSelecting,
    onSelect,
    onToggleFavorite,
    onRemove,
    headerAction,
}: LocationSectionProps) {
    return (
        <View className="px-4 pb-2">
            <View className="flex-row items-center justify-between mb-2">
                <Text
                    className="text-amber-500 text-xs uppercase tracking-wide"
                    style={{ fontFamily: 'Outfit-SemiBold' }}
                >
                    {title}
                </Text>
                {headerAction}
            </View>
            {locations.map((location) => (
                <LocationRow
                    key={location.id}
                    result={location}
                    selectionId={location.id}
                    isFavorite={SavedLocationsService.isFavorite(
                        favorites,
                        location.latitude,
                        location.longitude
                    )}
                    isActiveSelection={selectingId === location.id}
                    isSelecting={isSelecting}
                    onSelect={onSelect}
                    onToggleFavorite={onToggleFavorite}
                    onRemove={() => onRemove(location.id)}
                />
            ))}
        </View>
    )
}

interface LocationRowProps {
    result: LocationSearchResult
    selectionId: string
    isFavorite: boolean
    isActiveSelection: boolean
    isSelecting: boolean
    onSelect: (result: LocationSearchResult, selectionId: string) => void
    onToggleFavorite: (result: LocationSearchResult) => void
    onRemove?: () => void
}

function LocationRow({
    result,
    selectionId,
    isFavorite,
    isActiveSelection,
    isSelecting,
    onSelect,
    onToggleFavorite,
    onRemove,
}: LocationRowProps) {
    return (
        <Pressable
            onPress={() => onSelect(result, selectionId)}
            disabled={isSelecting}
            className="p-3 mb-2 rounded-xl border border-white/5 active:bg-white/5"
            style={{
                backgroundColor: 'rgba(22, 26, 32, 0.5)',
                opacity: isSelecting && !isActiveSelection ? 0.5 : 1,
            }}
        >
            <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                    <Text
                        className="text-slate-100 text-base"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {result.formatted}
                    </Text>
                    {(result.city || result.country) && (
                        <Text
                            className="text-slate-500 text-sm mt-0.5"
                            style={{ fontFamily: 'DMSans' }}
                        >
                            {[result.city, result.country]
                                .filter(Boolean)
                                .join(', ')}
                        </Text>
                    )}
                </View>
                <View className="flex-row items-center gap-2">
                    {isActiveSelection ? (
                        <ActivityIndicator size="small" color="#f59e0b" />
                    ) : (
                        <>
                            <Pressable
                                onPress={(event) => {
                                    event.stopPropagation()
                                    onToggleFavorite(result)
                                }}
                                className="p-1"
                            >
                                <MaterialCommunityIcons
                                    name={
                                        isFavorite ? 'star' : 'star-outline'
                                    }
                                    size={20}
                                    color="#f59e0b"
                                />
                            </Pressable>
                            {onRemove && (
                                <Pressable
                                    onPress={(event) => {
                                        event.stopPropagation()
                                        onRemove()
                                    }}
                                    className="p-1"
                                >
                                    <MaterialCommunityIcons
                                        name="close"
                                        size={18}
                                        color="#64748b"
                                    />
                                </Pressable>
                            )}
                        </>
                    )}
                </View>
            </View>
        </Pressable>
    )
}
