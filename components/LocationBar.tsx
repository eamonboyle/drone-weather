import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { useLocation } from '@/contexts/LocationContext'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'
import { LocationSearchModal } from './LocationSearchModal'

interface LocationBarProps {
    locationName: string
}

export function LocationBar({ locationName }: LocationBarProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isSearchModalVisible, setIsSearchModalVisible] = useState(false)
    const { refreshLocation } = useLocation()
    const { refetch } = useWeatherForLocation()

    const handleSearchPress = () => {
        setIsSearchModalVisible(true)
    }

    const handleLocationPress = async () => {
        if (isLoading) return

        setIsLoading(true)
        try {
            await refreshLocation()
            await refetch()
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
                        {displayName}
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
