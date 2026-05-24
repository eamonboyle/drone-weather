import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { DroneMapView } from '@/components/MapView'
import { LocationBar } from '@/components/LocationBar'
import { useLocation } from '@/contexts/LocationContext'

export default function MapScreen() {
    const { locationName } = useLocation()

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName} />
            <DroneMapView />
        </SafeAreaView>
    )
} 