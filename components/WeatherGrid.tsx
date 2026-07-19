import { View, Text, Pressable } from 'react-native'
import { WeatherData, DroneFlightConditions, FlyabilityFactor } from '@/types/weather'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { WindDataPopup } from './WindDataPopup'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import {
    findHourlyDataForClockHour,
    getWeatherUtcOffset,
} from '@/utils/weatherHourUtils'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { getCheckStatus } from '@/utils/flyabilityChecks'
import {
    formatNullable,
    formatPercentDisplay,
    formatTemperatureDisplay,
    formatVisibilityDisplay,
    formatWindDisplay,
} from '@/utils/weatherDisplay'
import { Theme } from '@/constants/Theme'

interface WeatherGridProps {
    weatherData: WeatherData
    selectedClockHour: number
}

interface WindPopupState {
    isVisible: boolean
    data: { height: string; speed: number | null }[]
    title: string
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    type: 'speed' | 'gusts'
}

type MetricSafety = 'safe' | 'unsafe' | 'unavailable' | 'neutral'

const LABEL_TO_FACTOR: Record<string, FlyabilityFactor | null> = {
    Temperature: 'temperature',
    'Wind Speed': 'windSpeed',
    'Wind Gusts': 'windGust',
    Visibility: 'visibility',
    'Rain Chance': 'precipitation',
    'Cloud Cover': null,
    'Wind Direction': null,
    Precipitation: null,
    Humidity: null,
}

export function WeatherGrid({ weatherData, selectedClockHour }: WeatherGridProps) {
    const [windPopupState, setWindPopupState] = useState<WindPopupState>({
        isVisible: false,
        data: [],
        title: '',
        icon: 'weather-windy',
        type: 'speed',
    })
    const { thresholds } = useWeatherConfig()

    const hourData = useMemo(
        () =>
            findHourlyDataForClockHour(
                weatherData.hourlyData,
                selectedClockHour,
                { utcOffsetSeconds: getWeatherUtcOffset(weatherData) }
            ),
        [weatherData, selectedClockHour]
    )

    const flyabilityData: DroneFlightConditions | null = useMemo(() => {
        if (!hourData || !thresholds) return null
        return DroneFlyabilityService.checkFlyingConditions(hourData, thresholds)
    }, [hourData, thresholds])

    const handleWindPress = (type: 'speed' | 'gusts') => {
        if (!flyabilityData) return

        const config = {
            speed: {
                data: flyabilityData.windSpeedDetails,
                title: 'Wind Speed Details',
                icon: 'weather-windy' as const,
                type: 'speed' as const,
            },
            gusts: {
                data: flyabilityData.windGustDetails,
                title: 'Wind Gusts Details',
                icon: 'weather-windy-variant' as const,
                type: 'gusts' as const,
            },
        }

        setWindPopupState({
            isVisible: true,
            ...config[type],
        })
    }

    function metricSafety(label: string): MetricSafety {
        if (!flyabilityData) return 'unavailable'
        const factor = LABEL_TO_FACTOR[label]
        if (factor === null || factor === undefined) return 'neutral'
        return getCheckStatus(flyabilityData, factor)
    }

    if (!thresholds || !flyabilityData || !hourData) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-white text-lg">
                    {!hourData
                        ? 'No weather data for selected hour'
                        : 'Loading weather data...'}
                </Text>
            </View>
        )
    }

    const getCardStyles = (safety: MetricSafety) => {
        if (safety === 'neutral' || safety === 'unavailable') {
            return {
                borderColor: 'rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(22, 26, 32, 0.6)',
            }
        }
        const borderColor =
            safety === 'safe'
                ? 'rgba(16, 185, 129, 0.35)'
                : 'rgba(239, 68, 68, 0.35)'
        const backgroundColor =
            safety === 'safe'
                ? 'rgba(6, 95, 70, 0.4)'
                : 'rgba(127, 29, 29, 0.4)'
        return { borderColor, backgroundColor }
    }

    const weatherItems = [
        {
            label: 'Temperature',
            value: formatTemperatureDisplay(
                hourData.temperature2m,
                thresholds.temperature.unit
            ),
            icon: 'thermometer',
        },
        {
            label: 'Wind Speed',
            value: formatWindDisplay(
                hourData.windSpeed10m,
                thresholds.windSpeed.unit
            ),
            icon: 'weather-windy',
            onPress: () => handleWindPress('speed'),
        },
        {
            label: 'Wind Gusts',
            value: formatWindDisplay(
                hourData.windGusts10m,
                thresholds.windSpeed.unit
            ),
            icon: 'weather-windy-variant',
            onPress: () => handleWindPress('gusts'),
        },
        {
            label: 'Wind Direction',
            value: formatNullable(
                hourData.windDirection10m,
                (n) => `${n.toFixed(0)}°`
            ),
            icon: 'compass',
        },
        {
            label: 'Precipitation',
            value: formatNullable(
                hourData.precipitation,
                (n) => `${n.toFixed(2)} mm`
            ),
            icon: 'water',
        },
        {
            label: 'Cloud Cover',
            value: formatPercentDisplay(hourData.cloudCover),
            icon: 'weather-cloudy',
        },
        {
            label: 'Visibility',
            value: formatVisibilityDisplay(
                hourData.visibility,
                thresholds.visibility.unit
            ),
            icon: 'eye',
        },
        {
            label: 'Humidity',
            value: formatPercentDisplay(hourData.relativeHumidity2m),
            icon: 'water-percent',
        },
        {
            label: 'Rain Chance',
            value: formatPercentDisplay(hourData.precipitationProbability),
            icon: 'weather-pouring',
        },
    ]

    return (
        <>
            <View className="flex-row flex-wrap gap-3">
                {weatherItems.map((item) => {
                    const safety = metricSafety(item.label)
                    const cardStyles = getCardStyles(safety)
                    const iconColor =
                        safety === 'neutral' || safety === 'unavailable'
                            ? Theme.colors.textSecondary
                            : safety === 'safe'
                              ? Theme.colors.safe
                              : Theme.colors.danger

                    const statusLabel =
                        safety === 'safe'
                            ? 'Safe'
                            : safety === 'unsafe'
                              ? 'Unsafe'
                              : safety === 'unavailable'
                                ? 'Unavailable'
                                : 'Informational'

                    const handlePress = () => {
                        if (item.label === 'Wind Speed') {
                            handleWindPress('speed')
                        } else if (item.label === 'Wind Gusts') {
                            handleWindPress('gusts')
                        }
                    }

                    return (
                        <Pressable
                            key={item.label}
                            onPress={handlePress}
                            accessibilityRole="button"
                            accessibilityLabel={`${item.label} ${item.value}, ${statusLabel}`}
                            accessibilityHint={
                                item.label === 'Wind Speed' ||
                                item.label === 'Wind Gusts'
                                    ? 'Shows altitude details'
                                    : undefined
                            }
                            className="p-4 flex-1 min-w-[30%] rounded-xl overflow-hidden"
                            style={{
                                borderWidth: 1,
                                borderColor: cardStyles.borderColor,
                                backgroundColor: cardStyles.backgroundColor,
                                minHeight: 44,
                            }}
                        >
                            <View className="items-center">
                                <MaterialCommunityIcons
                                    name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                                    size={22}
                                    color={iconColor}
                                />
                                <Text
                                    className="text-slate-400 text-xs mt-1.5"
                                    style={{ fontFamily: 'DMSans' }}
                                >
                                    {item.label}
                                </Text>
                            </View>
                            <Text
                                className="text-white text-base font-semibold mt-2 text-center"
                                style={{ fontFamily: 'Outfit-SemiBold' }}
                            >
                                {item.value}
                            </Text>
                            {safety !== 'neutral' && (
                                <Text
                                    className="text-[10px] mt-1 text-center"
                                    style={{
                                        fontFamily: 'DMSans',
                                        color: iconColor,
                                    }}
                                >
                                    {statusLabel}
                                </Text>
                            )}
                        </Pressable>
                    )
                })}
            </View>

            <WindDataPopup
                {...windPopupState}
                onClose={() =>
                    setWindPopupState((prev) => ({ ...prev, isVisible: false }))
                }
            />
        </>
    )
}
