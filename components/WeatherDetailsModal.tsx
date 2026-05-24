import React from 'react'
import {
    View,
    Text,
    Modal,
    Pressable,
    ScrollView,
    Platform,
    StyleSheet,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { HourlyWeatherData } from '@/types/weather'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { convertSpeed, convertDistance } from '@/utils/unitConversion'
import { API_WIND_UNIT } from '@/constants/weatherUnits'

interface WeatherDetailsModalProps {
    isVisible: boolean
    onClose: () => void
    hourData: HourlyWeatherData | null
}

interface DetailRowProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    label: string
    value: string
    color?: string
    isSafe?: boolean | 'warning'
    subValues?: { label: string; value: string; isSafe?: boolean | 'warning' }[]
}

function DetailRow({
    icon,
    label,
    value,
    color = '#f59e0b',
    isSafe,
    subValues,
}: DetailRowProps) {
    return (
        <View className="py-3 border-b border-white/5">
            <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                    <MaterialCommunityIcons
                        name={icon}
                        size={22}
                        color={color}
                    />
                    <Text
                        className="text-slate-400 ml-3 text-base"
                        style={{ fontFamily: 'DMSans' }}
                    >
                        {label}
                    </Text>
                </View>
                <View className="flex-row items-center">
                    <Text
                        className="text-slate-100 text-base font-medium"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        {value}
                    </Text>
                    {isSafe !== undefined && (
                        <MaterialCommunityIcons
                            name={
                                isSafe === 'warning'
                                    ? 'alert'
                                    : isSafe
                                      ? 'check-circle'
                                      : 'alert-circle'
                            }
                            size={20}
                            color={
                                isSafe === 'warning'
                                    ? '#f59e0b'
                                    : isSafe
                                      ? '#10b981'
                                      : '#ef4444'
                            }
                            style={{ marginLeft: 8 }}
                        />
                    )}
                </View>
            </View>
            {subValues && subValues.length > 0 && (
                <View className="ml-9 mt-2">
                    {subValues.map((subValue, index) => (
                        <View
                            key={index}
                            className="flex-row justify-between items-center py-1"
                        >
                            <Text
                                className="text-slate-500 text-sm"
                                style={{ fontFamily: 'DMSans' }}
                            >
                                {subValue.label}
                            </Text>
                            <View className="flex-row items-center">
                                <Text
                                    className="text-slate-300 text-sm"
                                    style={{ fontFamily: 'DMSans' }}
                                >
                                    {subValue.value}
                                </Text>
                                {subValue.isSafe !== undefined && (
                                    <MaterialCommunityIcons
                                        name={
                                            subValue.isSafe === 'warning'
                                                ? 'alert'
                                                : subValue.isSafe
                                                  ? 'check-circle'
                                                  : 'alert-circle'
                                        }
                                        size={16}
                                        color={
                                            subValue.isSafe === 'warning'
                                                ? '#f59e0b'
                                                : subValue.isSafe
                                                  ? '#10b981'
                                                  : '#ef4444'
                                        }
                                        style={{ marginLeft: 8 }}
                                    />
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}

export function WeatherDetailsModal({
    isVisible,
    onClose,
    hourData,
}: WeatherDetailsModalProps) {
    const { thresholds } = useWeatherConfig()

    if (!hourData) return null

    const flyabilityData = DroneFlyabilityService.checkFlyingConditions(
        hourData,
        thresholds
    )

    // Convert and format temperature
    const temperature =
        thresholds.temperature.unit === 'fahrenheit'
            ? ((hourData.temperature2m * 9) / 5 + 32).toFixed(1) + '°F'
            : hourData.temperature2m.toFixed(1) + '°C'
    const isTempSafe =
        hourData.temperature2m >= thresholds.temperature.min &&
        hourData.temperature2m <= thresholds.temperature.max

    const formatWindSpeed = (speedMph: number) => {
        if (thresholds.windSpeed.unit === 'mph') {
            return `${speedMph.toFixed(1)} mph`
        }
        return `${convertSpeed(speedMph, 'mph', 'kmh').toFixed(1)} km/h`
    }

    const windInThresholdUnit = (speedMph: number) =>
        thresholds.windSpeed.unit === API_WIND_UNIT
            ? speedMph
            : convertSpeed(speedMph, 'mph', 'kmh')

    const windSpeedSubValues = flyabilityData.windSpeedDetails.map(
        (detail) => ({
            label: `At ${detail.height}`,
            value: formatWindSpeed(detail.speed),
            isSafe:
                windInThresholdUnit(detail.speed) <= thresholds.windSpeed.max,
        })
    )

    const windSpeed = formatWindSpeed(hourData.windSpeed10m)
    const windGust = formatWindSpeed(hourData.windGusts10m)
    const isWindSpeedSafe =
        windInThresholdUnit(hourData.windSpeed10m) <= thresholds.windSpeed.max
    const isWindGustSafe =
        windInThresholdUnit(hourData.windGusts10m) <= thresholds.windGust.max

    const visibilityKm = hourData.visibility / 1000
    const minVisibilityKm =
        thresholds.visibility.unit === 'miles'
            ? convertDistance(
                  thresholds.visibility.min,
                  'miles',
                  'kilometers'
              )
            : thresholds.visibility.min
    const visibility =
        thresholds.visibility.unit === 'miles'
            ? `${convertDistance(visibilityKm, 'kilometers', 'miles').toFixed(1)} mi`
            : `${visibilityKm.toFixed(1)} km`
    const isVisibilitySafe = visibilityKm >= minVisibilityKm

    // Format precipitation and cloud cover
    const precipitation = `${hourData.precipitationProbability.toFixed(0)}%`
    const cloudCover = `${hourData.cloudCover.toFixed(0)}%`
    const isPrecipSafe =
        hourData.precipitationProbability <=
        thresholds.weather.maxPrecipitationProbability
    const isCloudSafe = hourData.cloudCover <= thresholds.weather.maxCloudCover

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={styles.backdrop}
                onPress={onClose}
            >
                <Pressable
                    style={styles.modalCard}
                    onPress={(e) => e.stopPropagation()}
                >
                        {/* Header */}
                        <View
                            className="px-6 py-4 border-b"
                            style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                                borderBottomColor: 'rgba(245, 158, 11, 0.25)',
                                borderBottomWidth: 1,
                            }}
                        >
                            <Text
                                className="text-slate-100 text-xl font-bold"
                                style={{ fontFamily: 'Outfit-SemiBold' }}
                            >
                                {format(hourData.time, 'EEEE, MMMM d')}
                            </Text>
                            <Text
                                className="text-slate-500 text-base mt-1"
                                style={{ fontFamily: 'DMSans' }}
                            >
                                {format(hourData.time, 'h:mm a')}
                            </Text>
                        </View>

                        {/* Content */}
                        <ScrollView className="px-6 py-4">
                            {flyabilityData.reasons.length > 0 && (
                                <View
                                    className="mb-4 p-3 rounded-lg"
                                    style={{
                                        backgroundColor: 'rgba(127, 29, 29, 0.35)',
                                    }}
                                >
                                    <Text
                                        className="text-red-400 font-semibold mb-1"
                                        style={{ fontFamily: 'Outfit-SemiBold' }}
                                    >
                                        Unsafe Conditions:
                                    </Text>
                                    {flyabilityData.reasons.map(
                                        (reason, index) => (
                                            <Text
                                                key={index}
                                                className="text-red-300"
                                                style={{ fontFamily: 'DMSans' }}
                                            >
                                                • {reason}
                                            </Text>
                                        )
                                    )}
                                </View>
                            )}
                            <DetailRow
                                icon="thermometer"
                                label="Temperature"
                                value={temperature}
                                isSafe={isTempSafe}
                            />
                            <DetailRow
                                icon="weather-windy"
                                label="Wind Speed"
                                value={windSpeed}
                                isSafe={isWindSpeedSafe}
                                subValues={windSpeedSubValues}
                            />
                            <DetailRow
                                icon="weather-windy-variant"
                                label="Wind Gusts"
                                value={windGust}
                                isSafe={isWindGustSafe}
                            />
                            <DetailRow
                                icon="eye"
                                label="Visibility"
                                value={visibility}
                                isSafe={isVisibilitySafe}
                            />
                            <DetailRow
                                icon="weather-pouring"
                                label="Precipitation"
                                value={precipitation}
                                isSafe={isPrecipSafe}
                            />
                            <DetailRow
                                icon="weather-cloudy"
                                label="Cloud Cover"
                                value={cloudCover}
                                isSafe={isCloudSafe ? true : 'warning'}
                            />
                        </ScrollView>

                        {/* Close Button */}
                        <View className="px-6 py-4 border-t border-white/5">
                            <Pressable
                                onPress={onClose}
                                className="py-3.5 rounded-xl items-center"
                                style={{
                                    backgroundColor: 'rgba(245, 158, 11, 0.25)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(245, 158, 11, 0.4)',
                                }}
                            >
                                <Text
                                    className="text-amber-300 text-base font-semibold"
                                    style={{ fontFamily: 'Outfit-SemiBold' }}
                                >
                                    Close
                                </Text>
                            </Pressable>
                        </View>
                    </Pressable>
            </Pressable>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1f28',
        borderWidth: 2,
        borderColor: 'rgba(245, 158, 11, 0.6)',
        ...Platform.select({
            ios: {
                shadowColor: '#f59e0b',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 24,
            },
            android: {
                elevation: 24,
            },
        }),
    },
})
