import { useEffect, useRef } from 'react'
import { Animated } from 'react-native'
import { WeekView } from '@/components/WeekView'
import { LocationBar } from '@/components/LocationBar'
import { useLocation } from '@/contexts/LocationContext'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useWeatherForLocation } from '@/hooks/useWeatherForLocation'

export default function WeekScreen() {
    const { locationName } = useLocation()
    const { weatherData, isBootstrapping } = useWeatherForLocation()
    const fadeAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (!isBootstrapping) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }
    }, [isBootstrapping])

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName} />
            {isBootstrapping ? (
                <LoadingSpinner />
            ) : weatherData ? (
                <Animated.View
                    style={[
                        {
                            flex: 1,
                            opacity: fadeAnim,
                        },
                    ]}
                >
                    <WeekView weatherData={weatherData} />
                </Animated.View>
            ) : null}
        </SafeAreaView>
    )
}
