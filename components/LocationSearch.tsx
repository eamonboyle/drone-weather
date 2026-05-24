import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
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
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { updateLocation } = useLocation()
    const { setWeatherData } = useWeatherData()

    const handleSearch = async () => {
        // If search is empty, just show warning and return
        if (!searchQuery.trim()) {
            setError('Please enter a location to search')
            setResults([])
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const searchResults = await LocationSearchService.searchLocations(searchQuery.trim())
            setResults(searchResults)
        } catch (err) {
            setError('Failed to search locations. Please try again.')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLocationSelect = async (result: LocationSearchResult) => {
        try {
            // Create a mock location object that matches the structure expected by the app
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

            // Close the modal immediately
            onLocationSelected?.()

            // Then update the location and fetch weather data
            await updateLocation(mockLocation)
            const weather = await WeatherService.getCurrentWeather(
                result.latitude,
                result.longitude
            )
            setWeatherData(weather)

            // Clear the search results
            setResults([])
            setSearchQuery('')
        } catch (err) {
            setError('Failed to update location. Please try again.')
            console.error(err)
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
                />
                <TouchableOpacity
                    onPress={handleSearch}
                    className="bg-amber-500 px-4 h-11 rounded-xl justify-center"
                >
                    <Text
                        className="text-background font-semibold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        Search
                    </Text>
                </TouchableOpacity>
            </View>

            {isLoading && (
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
                {results.map((result, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => handleLocationSelect(result)}
                        className="p-4 border-b border-white/5 active:bg-white/5"
                    >
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
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    )
}
