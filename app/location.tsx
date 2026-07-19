import { useCallback, useMemo, useState } from 'react'
import {
    View,
    Text,
    ScrollView,
    Pressable,
    Keyboard,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useLocation } from '@/contexts/LocationContext'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'
import { useLocationSearch } from '@/hooks/useLocationSearch'
import {
    FlyabilityLocation,
    useLocationFlyability,
} from '@/hooks/useLocationFlyability'
import { useAfterTransition } from '@/hooks/useAfterTransition'
import { useDeviceLocationPreview } from '@/hooks/useDeviceLocationPreview'
import { LocationSearchBar } from '@/components/location/LocationSearchBar'
import { LocationSection } from '@/components/location/LocationSection'
import { CurrentLocationCard } from '@/components/location/CurrentLocationCard'

export default function LocationScreen() {
    const router = useRouter()
    const transitionReady = useAfterTransition()
    const { refreshLocation } = useLocation()
    const deviceLocation = useDeviceLocationPreview(transitionReady)
    const { refetch } = useWeatherForLocation()
    const [isRefreshingGps, setIsRefreshingGps] = useState(false)

    const navigateBack = useCallback(() => {
        Keyboard.dismiss()
        requestAnimationFrame(() => {
            router.back()
        })
    }, [router])

    const search = useLocationSearch({
        onLocationSelected: navigateBack,
        enabled: transitionReady,
    })

    const flyabilityLocations = useMemo((): FlyabilityLocation[] => {
        const items: FlyabilityLocation[] = []
        const seen = new Set<string>()

        const add = (id: string, latitude: number, longitude: number) => {
            const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`
            if (seen.has(key)) return
            seen.add(key)
            items.push({ id, latitude, longitude })
        }

        search.results.forEach((result, index) => {
            add(
                `search-${result.latitude}-${result.longitude}-${index}`,
                result.latitude,
                result.longitude
            )
        })

        search.favorites.forEach((favorite) => {
            add(favorite.id, favorite.latitude, favorite.longitude)
        })

        search.dedupedRecents.forEach((recent) => {
            add(recent.id, recent.latitude, recent.longitude)
        })

        return items
    }, [search.results, search.favorites, search.dedupedRecents])

    const { getStatus } = useLocationFlyability(flyabilityLocations, {
        enabled: transitionReady,
    })

    const handleBack = useCallback(() => {
        navigateBack()
    }, [navigateBack])

    const handleUseCurrentLocation = useCallback(async () => {
        if (isRefreshingGps) return

        setIsRefreshingGps(true)
        try {
            await refreshLocation()
            await refetch()
            navigateBack()
        } catch (error) {
            console.error('Error refreshing location:', error)
        } finally {
            setIsRefreshingGps(false)
        }
    }, [isRefreshingGps, refreshLocation, refetch, navigateBack])

    const hasSearchQuery = search.searchQuery.trim().length > 0
    const showEmptyBrowse =
        !hasSearchQuery &&
        search.favorites.length === 0 &&
        search.dedupedRecents.length === 0

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/5">
                    <Pressable
                        onPress={handleBack}
                        className="w-10 h-10 items-center justify-center rounded-lg active:bg-surface/50"
                        hitSlop={8}
                    >
                        <MaterialCommunityIcons
                            name="arrow-left"
                            size={24}
                            color="#f59e0b"
                        />
                    </Pressable>
                    <Text
                        className="text-slate-100 text-lg"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Locations
                    </Text>
                    <View className="w-10" />
                </View>

                <LocationSearchBar
                    value={search.searchQuery}
                    onChangeText={search.setSearchQuery}
                    onClear={search.handleClearSearch}
                    isSearching={search.isSearching}
                    disabled={search.isSelecting}
                    autoFocus={transitionReady}
                />

                <ScrollView
                    className="flex-1"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <CurrentLocationCard
                        locationName={deviceLocation.name}
                        isLoading={
                            deviceLocation.isLoading || isRefreshingGps
                        }
                        onPress={() => void handleUseCurrentLocation()}
                    />

                    {search.error ? (
                        <Text
                            className="text-red-400 px-4 pb-3 text-sm"
                            style={{ fontFamily: 'DMSans' }}
                        >
                            {search.error}
                        </Text>
                    ) : null}

                    {hasSearchQuery ? (
                        <LocationSection
                            title={`Results for "${search.searchQuery.trim()}"`}
                            locations={search.results}
                            favorites={search.favorites}
                            selectingId={search.selectingId}
                            isSelecting={search.isSelecting}
                            getFlyabilityStatus={getStatus}
                            showFlyability={transitionReady}
                            isActiveLocation={search.isActiveLocation}
                            onSelect={search.handleLocationSelect}
                            onToggleFavorite={search.handleToggleFavorite}
                            emptyMessage={
                                search.isSearching
                                    ? 'Searching...'
                                    : search.results.length === 0
                                      ? 'No locations found. Try a different search.'
                                      : undefined
                            }
                        />
                    ) : null}

                    <LocationSection
                        title="Saved Spaces"
                        locations={search.favorites}
                        favorites={search.favorites}
                        selectingId={search.selectingId}
                        isSelecting={search.isSelecting}
                        getFlyabilityStatus={getStatus}
                        showFlyability={transitionReady}
                        isActiveLocation={search.isActiveLocation}
                        onSelect={search.handleLocationSelect}
                        onToggleFavorite={search.handleToggleFavorite}
                        onRemove={(id) => void search.handleRemoveFavorite(id)}
                        emptyMessage={
                            showEmptyBrowse
                                ? 'No saved launch sites yet. Star a location to pin it here for quick access.'
                                : 'No saved launch sites yet. Star a location to pin it here.'
                        }
                    />

                    <LocationSection
                        title="Recent"
                        locations={search.dedupedRecents}
                        favorites={search.favorites}
                        selectingId={search.selectingId}
                        isSelecting={search.isSelecting}
                        getFlyabilityStatus={getStatus}
                        showFlyability={transitionReady}
                        isActiveLocation={search.isActiveLocation}
                        onSelect={search.handleLocationSelect}
                        onToggleFavorite={search.handleToggleFavorite}
                        onRemove={(id) => void search.handleRemoveRecent(id)}
                        headerAction={
                            search.dedupedRecents.length > 0 ? (
                                <Pressable
                                    onPress={() =>
                                        void search.handleClearRecents()
                                    }
                                    hitSlop={8}
                                >
                                    <Text
                                        className="text-amber-500 text-xs"
                                        style={{ fontFamily: 'DMSans' }}
                                    >
                                        Clear
                                    </Text>
                                </Pressable>
                            ) : undefined
                        }
                    />
                </ScrollView>
        </SafeAreaView>
    )
}
