import React from 'react'
import { View, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DroneMapView } from '@/components/MapView'
import { LocationBar } from '@/components/LocationBar'
import { useLocation } from '@/contexts/LocationContext'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'
import { Theme } from '@/constants/Theme'
import { MaterialCommunityIcons } from '@expo/vector-icons'

export default function MapScreen() {
    const { locationName, errorMsg } = useLocation()
    const { isOfflineOrStale, error: weatherError } = useWeatherForLocation()

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            <LocationBar locationName={locationName || 'Select Location'} />
            {(errorMsg || (isOfflineOrStale && weatherError)) && (
                <View
                    className="mx-3 mb-2 px-3 py-2 rounded-lg flex-row items-center"
                    style={{
                        backgroundColor: Theme.colors.dangerMuted,
                        minHeight: Theme.touchTarget,
                    }}
                    accessibilityRole="alert"
                >
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={18}
                        color={Theme.colors.danger}
                    />
                    <Text
                        className="text-sm ml-2 flex-1"
                        style={{
                            fontFamily: 'DMSans',
                            color: Theme.colors.danger,
                        }}
                    >
                        {errorMsg ??
                            'Weather refresh failed — map still works offline.'}
                    </Text>
                </View>
            )}
            <View className="flex-1 px-3 pb-3 pt-2">
                <DroneMapView />
            </View>
        </SafeAreaView>
    )
}
