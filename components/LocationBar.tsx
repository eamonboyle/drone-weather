import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useState } from 'react'
import { useLocation } from '@/contexts/LocationContext'
import { useWeatherData } from '@/contexts/WeatherDataContext'
import { WeatherService } from '@/services/weatherService'
import { LocationSearchModal } from './LocationSearchModal'
import React from 'react'

interface LocationBarProps {
    locationName: string
}

export function LocationBar({ locationName }: LocationBarProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false)
    const { updateLocation } = useLocation()
    const { setWeatherData } = useWeatherData()

    const handleSearchPress = () => {
        setIsSearchModalVisible(true)
    }

    const handleLocationPress = async () => {
        if (isLoading) return // Prevent multiple presses while loading

        setIsLoading(true)
        try {
            // Get current device location
            const { status } =
                await Location.requestForegroundPermissionsAsync()

            if (status !== 'granted') {
                Alert.alert('Error', 'Permission to access location was denied')
                return
            }

            const deviceLocation = await Location.getCurrentPositionAsync({})

            // Update location in context
            await updateLocation(deviceLocation)

            // Fetch new weather data for device location
            const weather = await WeatherService.getCurrentWeather(
                deviceLocation.coords.latitude,
                deviceLocation.coords.longitude
            )
            setWeatherData(weather)
        } catch (error) {
            console.error('Error getting location:', error)
            Alert.alert('Error', 'Failed to get current location')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/5 bg-background">
                <Pressable
                    onPress={handleSearchPress}
                    className="w-10 h-10 items-center justify-center rounded-lg active:bg-surface/50"
                >
                    <Ionicons name="search" size={22} color="#f59e0b" />
                </Pressable>

                <View className="flex-1 items-center">
                    <Text
                        className="text-slate-100 text-lg font-semibold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        {locationName}
                    </Text>
                </View>

                <Pressable
                    onPress={handleLocationPress}
                    className="w-10 h-10 items-center justify-center rounded-lg active:bg-surface/50"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#f59e0b" />
                    ) : (
                        <Ionicons name="locate" size={22} color="#f59e0b" />
                    )}
                </Pressable>
            </View>

            <LocationSearchModal
                visible={isSearchModalVisible}
                onClose={() => setIsSearchModalVisible(false)}
            />
        </>
    )
}
