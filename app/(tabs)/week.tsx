import { useState, useEffect } from 'react'
import { View, Alert, Animated } from 'react-native'
import { WeekView } from '@/components/WeekView'
import { LocationBar } from '@/components/LocationBar'
import { WeatherService } from '@/services/weatherService'
import { WeatherData } from '@/types/weather'
import { useLocation } from '@/contexts/LocationContext'
import * as Location from 'expo-location'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRef } from 'react'

export default function WeekScreen() {
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
    const [selectedHour, setSelectedHour] = useState(24)
    const [isLoading, setIsLoading] = useState(true)
    const { location, locationName, updateLocation } = useLocation()
    const isFirstLoad = useRef(true)
    const lastLocation = useRef<Location.LocationObject | null>(null)

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current

    // Animate content when loading completes
    useEffect(() => {
        if (!isLoading) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }
    }, [isLoading])

    // Update weather data when location changes
    useEffect(() => {
        if (location) {
            // Check if this is a significant location change
            const shouldUpdate =
                !lastLocation.current ||
                Math.abs(
                    location.coords.latitude -
                        lastLocation.current.coords.latitude
                ) > 0.01 ||
                Math.abs(
                    location.coords.longitude -
                        lastLocation.current.coords.longitude
                ) > 0.01

            if (shouldUpdate || isFirstLoad.current) {
                handleLocationUpdate(location)
                lastLocation.current = location
                isFirstLoad.current = false
            }
        }
    }, [location])

    const handleLocationUpdate = async (location: Location.LocationObject) => {
        try {
            // Only show loading spinner on first load
            if (isFirstLoad.current) {
                setIsLoading(true)
            }

            const weather = await WeatherService.getCurrentWeather(
                location.coords.latitude,
                location.coords.longitude
            )
            setWeatherData(weather)
        } catch (error) {
            console.error('Error fetching weather data:', error)
            Alert.alert(
                'Error',
                'Failed to fetch weather data. Please try again.'
            )
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <LocationBar locationName={locationName} />
            {isLoading && isFirstLoad.current ? (
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
                    <WeekView
                        weatherData={weatherData}
                        onHourSelect={setSelectedHour}
                    />
                </Animated.View>
            ) : null}
        </SafeAreaView>
    )
}
