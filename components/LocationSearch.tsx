import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Pressable,
} from 'react-native'
import {
    LocationSearchService,
    LocationSearchResult,
} from '@/services/locationSearchService'
import * as Location from 'expo-location'
import { useWeatherData } from '@/contexts/WeatherDataContext'
import { WeatherService } from '@/services/weatherService'
import { useLocation } from '@/contexts/LocationContext'

interface LocationSearchProps {
    onLocationSelected?: () => void
}

export function LocationSearch({ onLocationSelected }: LocationSearchProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [results, setResults] = useState<LocationSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [isSelecting, setIsSelecting] = useState(false)
    const [selectingIndex, setSelectingIndex] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { updateLocation } = useLocation()
    const { setWeatherData } = useWeatherData()

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

    const handleLocationSelect = async (
        result: LocationSearchResult,
        index: number
    ) => {
        if (isSelecting) return

        setIsSelecting(true)
        setSelectingIndex(index)
        setError(null)

        try {
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
            const weather = await WeatherService.getCurrentWeather(
                result.latitude,
                result.longitude
            )
            setWeatherData(weather)

            setResults([])
            setSearchQuery('')
            onLocationSelected?.()
        } catch (err) {
            setError('Failed to update location. Please try again.')
            console.error(err)
        } finally {
            setIsSelecting(false)
            setSelectingIndex(null)
        }
    }

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

            <ScrollView className="max-h-60">
                {results.map((result, index) => {
                    const isActiveSelection = selectingIndex === index

                    return (
                        <Pressable
                            key={`${result.latitude}-${result.longitude}-${index}`}
                            onPress={() => handleLocationSelect(result, index)}
                            disabled={isSelecting}
                            className="p-4 border-b border-white/5 active:bg-white/5"
                            style={{ opacity: isSelecting && !isActiveSelection ? 0.5 : 1 }}
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
                                {isActiveSelection && (
                                    <ActivityIndicator
                                        size="small"
                                        color="#f59e0b"
                                    />
                                )}
                            </View>
                        </Pressable>
                    )
                })}
            </ScrollView>
        </View>
    )
}
