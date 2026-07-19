import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useLocation } from '@/contexts/LocationContext'
import { lightImpactHaptic } from '@/utils/haptics'

interface LocationBarProps {
    locationName: string
}

/**
 * Location chrome only. Weather reload is owned by each screen's
 * useWeatherForLocation effect when GPS coords change — avoid a second
 * loadWeather subscription from this shared bar.
 */
export function LocationBar({ locationName }: LocationBarProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const { refreshLocation } = useLocation()

    const handleSearchPress = () => {
        router.push('/location')
    }

    const handleLocationPress = async () => {
        if (isLoading) return

        setIsLoading(true)
        lightImpactHaptic()
        try {
            await refreshLocation()
        } catch (error) {
            console.error('Error getting location:', error)
            Alert.alert('Error', 'Failed to get current location')
        } finally {
            setIsLoading(false)
        }
    }

    const displayName =
        locationName ||
        (isLoading ? 'Updating location...' : 'Select Location')

    return (
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-white/5 bg-background">
            <Pressable
                onPress={handleSearchPress}
                accessibilityRole="button"
                accessibilityLabel="Search locations"
                className="w-10 h-10 items-center justify-center rounded-lg active:bg-surface/50"
                style={{ minHeight: 44, minWidth: 44 }}
            >
                <Ionicons name="search" size={22} color="#f59e0b" />
            </Pressable>

            <Pressable
                onPress={handleSearchPress}
                accessibilityRole="button"
                accessibilityLabel={`Location ${displayName}. Tap to search.`}
                className="flex-1 items-center px-2 active:opacity-70"
                style={{ minHeight: 44, justifyContent: 'center' }}
            >
                <Text
                    className="text-slate-100 text-lg font-semibold text-center"
                    style={{ fontFamily: 'Outfit-SemiBold' }}
                    numberOfLines={1}
                >
                    {displayName}
                </Text>
            </Pressable>

            <Pressable
                onPress={handleLocationPress}
                accessibilityRole="button"
                accessibilityLabel="Use current GPS location"
                className="w-10 h-10 items-center justify-center rounded-lg active:bg-surface/50"
                style={{ minHeight: 44, minWidth: 44 }}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                    <Ionicons name="locate" size={22} color="#f59e0b" />
                )}
            </Pressable>
        </View>
    )
}
