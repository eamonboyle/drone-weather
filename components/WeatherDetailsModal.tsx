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
import { HourlyWeatherData } from '@/types/weather'
import {
    formatLocationFullDate,
    formatLocationTime,
} from '@/utils/locationTime'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { DroneFlyabilityService } from '@/services/droneFlyabilityService'
import { convertSpeed } from '@/utils/unitConversion'
import { API_WIND_UNIT } from '@/constants/weatherUnits'
import {
    checkStatusToBooleanSafe,
    getCheckStatus,
} from '@/utils/flyabilityChecks'
import {
    formatPercentDisplay,
    formatTemperatureDisplay,
    formatVisibilityDisplay,
    formatWindDisplay,
} from '@/utils/weatherDisplay'
import { Theme } from '@/constants/Theme'

interface WeatherDetailsModalProps {
    isVisible: boolean
    onClose: () => void
    hourData: HourlyWeatherData | null
    utcOffsetSeconds?: number
}

interface DetailRowProps {
    icon: keyof typeof MaterialCommunityIcons.glyphMap
    label: string
    value: string
    color?: string
    isSafe?: boolean | 'warning' | 'unavailable'
    subValues?: {
        label: string
        value: string
        isSafe?: boolean | 'warning' | 'unavailable'
    }[]
}

function DetailRow({
    icon,
    label,
    value,
    color = Theme.colors.accent,
    isSafe,
    subValues,
}: DetailRowProps) {
    const statusIcon =
        isSafe === 'warning' || isSafe === 'unavailable'
            ? 'alert'
            : isSafe
              ? 'check-circle'
              : isSafe === false
                ? 'alert-circle'
                : undefined

    const statusColor =
        isSafe === 'warning' || isSafe === 'unavailable'
            ? Theme.colors.warning
            : isSafe
              ? Theme.colors.safe
              : Theme.colors.danger

    const statusLabel =
        isSafe === true
            ? 'Safe'
            : isSafe === false
              ? 'Unsafe'
              : isSafe === 'unavailable'
                ? 'Unavailable'
                : isSafe === 'warning'
                  ? 'Warning'
                  : undefined

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
                        accessibilityLabel={`${label}${statusLabel ? `, ${statusLabel}` : ''}`}
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
                    {statusIcon && (
                        <MaterialCommunityIcons
                            name={statusIcon}
                            size={20}
                            color={statusColor}
                            style={{ marginLeft: 8 }}
                            accessibilityLabel={statusLabel}
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
                                            subValue.isSafe === 'warning' ||
                                            subValue.isSafe === 'unavailable'
                                                ? 'alert'
                                                : subValue.isSafe
                                                  ? 'check-circle'
                                                  : 'alert-circle'
                                        }
                                        size={16}
                                        color={
                                            subValue.isSafe === 'warning' ||
                                            subValue.isSafe === 'unavailable'
                                                ? Theme.colors.warning
                                                : subValue.isSafe
                                                  ? Theme.colors.safe
                                                  : Theme.colors.danger
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

function statusToRowSafe(
    status: ReturnType<typeof getCheckStatus>
): boolean | 'unavailable' {
    if (status === 'unavailable') return 'unavailable'
    return checkStatusToBooleanSafe(status)
}

export function WeatherDetailsModal({
    isVisible,
    onClose,
    hourData,
    utcOffsetSeconds = 0,
}: WeatherDetailsModalProps) {
    const { thresholds } = useWeatherConfig()

    if (!hourData) return null

    const flyabilityData = DroneFlyabilityService.checkFlyingConditions(
        hourData,
        thresholds
    )

    const temperature = formatTemperatureDisplay(
        hourData.temperature2m,
        thresholds.temperature.unit
    )

    const formatWindSpeed = (speedMph: number | null) =>
        formatWindDisplay(speedMph, thresholds.windSpeed.unit)

    const windInThresholdUnit = (speedMph: number) =>
        thresholds.windSpeed.unit === API_WIND_UNIT
            ? speedMph
            : convertSpeed(speedMph, 'mph', 'kmh')

    const windSpeedSubValues = flyabilityData.windSpeedDetails.map(
        (detail) => ({
            label: `At ${detail.height}`,
            value: formatWindSpeed(detail.speed),
            isSafe:
                detail.speed === null
                    ? ('unavailable' as const)
                    : windInThresholdUnit(detail.speed) <=
                      thresholds.windSpeed.max,
        })
    )

    const windSpeed = formatWindSpeed(hourData.windSpeed10m)
    const windGust = formatWindSpeed(hourData.windGusts10m)
    const visibility = formatVisibilityDisplay(
        hourData.visibility,
        thresholds.visibility.unit
    )
    const precipitation = formatPercentDisplay(
        hourData.precipitationProbability
    )
    const cloudCover = formatPercentDisplay(hourData.cloudCover)

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
            accessibilityViewIsModal
        >
            <Pressable
                style={styles.backdrop}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Dismiss weather details"
            >
                <Pressable
                    style={styles.modalCard}
                    onPress={(e) => e.stopPropagation()}
                    accessibilityLabel="Weather details"
                >
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
                            {formatLocationFullDate(
                                hourData.time,
                                utcOffsetSeconds
                            )}
                        </Text>
                        <Text
                            className="text-slate-500 text-base mt-1"
                            style={{ fontFamily: 'DMSans' }}
                        >
                            {formatLocationTime(hourData.time, utcOffsetSeconds, {
                                hour12: true,
                            })}
                        </Text>
                    </View>

                    <ScrollView className="px-6 py-4">
                        {flyabilityData.reasons.length > 0 && (
                            <View
                                className="mb-4 p-3 rounded-lg"
                                style={{
                                    backgroundColor: 'rgba(127, 29, 29, 0.35)',
                                }}
                                accessibilityRole="summary"
                            >
                                <Text
                                    className="text-red-400 font-semibold mb-1"
                                    style={{ fontFamily: 'Outfit-SemiBold' }}
                                >
                                    {flyabilityData.isSuitable
                                        ? 'Notes:'
                                        : 'Unsafe Conditions:'}
                                </Text>
                                {flyabilityData.reasons.map((reason, index) => (
                                    <Text
                                        key={index}
                                        className="text-red-300"
                                        style={{ fontFamily: 'DMSans' }}
                                    >
                                        • {reason}
                                    </Text>
                                ))}
                            </View>
                        )}
                        <DetailRow
                            icon="thermometer"
                            label="Temperature"
                            value={temperature}
                            isSafe={statusToRowSafe(
                                getCheckStatus(flyabilityData, 'temperature')
                            )}
                        />
                        <DetailRow
                            icon="weather-windy"
                            label="Wind Speed"
                            value={windSpeed}
                            isSafe={statusToRowSafe(
                                getCheckStatus(flyabilityData, 'windSpeed')
                            )}
                            subValues={windSpeedSubValues}
                        />
                        <DetailRow
                            icon="weather-windy-variant"
                            label="Wind Gusts"
                            value={windGust}
                            isSafe={statusToRowSafe(
                                getCheckStatus(flyabilityData, 'windGust')
                            )}
                        />
                        <DetailRow
                            icon="eye"
                            label="Visibility"
                            value={visibility}
                            isSafe={statusToRowSafe(
                                getCheckStatus(flyabilityData, 'visibility')
                            )}
                        />
                        <DetailRow
                            icon="weather-pouring"
                            label="Precipitation"
                            value={precipitation}
                            isSafe={statusToRowSafe(
                                getCheckStatus(flyabilityData, 'precipitation')
                            )}
                        />
                        <DetailRow
                            icon="weather-cloudy"
                            label="Cloud Cover"
                            value={cloudCover}
                        />
                    </ScrollView>

                    <View className="px-6 py-4 border-t border-white/5">
                        <Pressable
                            onPress={onClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close weather details"
                            className="py-3.5 rounded-xl items-center"
                            style={{
                                backgroundColor: 'rgba(245, 158, 11, 0.25)',
                                borderWidth: 1,
                                borderColor: 'rgba(245, 158, 11, 0.4)',
                                minHeight: 44,
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
        backgroundColor: Theme.colors.surfaceElevated,
        borderWidth: 2,
        borderColor: 'rgba(245, 158, 11, 0.6)',
        ...Platform.select({
            ios: {
                shadowColor: Theme.colors.accent,
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
