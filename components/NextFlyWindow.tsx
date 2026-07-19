import { View, Text, Pressable } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeFlyingWindow } from '@/services/droneFlyabilityService'
import {
    formatLocationDayLabel,
    formatLocationTimeRange,
    getLocationHours,
} from '@/utils/locationTime'
import { Theme } from '@/constants/Theme'

interface NextFlyWindowProps {
    window: SafeFlyingWindow
    onSelectWindow?: (startHour: number) => void
    utcOffsetSeconds?: number
}

export function NextFlyWindow({
    window,
    onSelectWindow,
    utcOffsetSeconds = 0,
}: NextFlyWindowProps) {
    if (window.type === 'none') {
        return (
            <View
                className="rounded-xl p-4 mb-4 flex-row items-center"
                style={{
                    backgroundColor: Theme.colors.surfaceElevated,
                    borderWidth: 1,
                    borderColor: Theme.colors.border,
                    opacity: 0.9,
                }}
            >
                <MaterialCommunityIcons
                    name="calendar-remove"
                    size={22}
                    color={Theme.colors.textMuted}
                />
                <Text
                    className="text-slate-400 text-sm ml-3 flex-1"
                    style={{ fontFamily: 'DMSans' }}
                >
                    No safe flying window in the next 48 hours
                </Text>
            </View>
        )
    }

    const { startTime, endTime, durationHours } = window
    if (!startTime || !endTime || !durationHours) return null

    const isPressable = window.type === 'upcoming' && onSelectWindow

    const content = (
        <View
            className="rounded-xl p-4 mb-4 flex-row items-center"
            style={{
                backgroundColor: Theme.colors.surfaceElevated,
                borderWidth: 1,
                borderColor:
                    window.type === 'now'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(245, 158, 11, 0.3)',
                opacity: 0.9,
            }}
        >
            <MaterialCommunityIcons
                name={window.type === 'now' ? 'clock-check' : 'clock-outline'}
                size={22}
                color={
                    window.type === 'now'
                        ? Theme.colors.safe
                        : Theme.colors.warning
                }
            />
            <View className="ml-3 flex-1">
                <Text
                    className="text-slate-100 text-sm font-semibold"
                    style={{ fontFamily: 'Outfit-SemiBold' }}
                >
                    {window.type === 'now'
                        ? 'Conditions look good now'
                        : 'Next safe window'}
                </Text>
                <Text
                    className="text-slate-400 text-sm mt-0.5"
                    style={{ fontFamily: 'DMSans' }}
                >
                    {window.type === 'now'
                        ? `${durationHours} hr${durationHours === 1 ? '' : 's'} of flyable conditions ahead`
                        : `${formatLocationDayLabel(startTime, utcOffsetSeconds)} · ${formatLocationTimeRange(startTime, endTime, utcOffsetSeconds)} (${durationHours} hr${durationHours === 1 ? '' : 's'})`}
                </Text>
            </View>
            {isPressable && (
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={Theme.colors.textMuted}
                />
            )}
        </View>
    )

    if (isPressable) {
        return (
            <Pressable
                onPress={() =>
                    onSelectWindow?.(
                        getLocationHours(startTime, utcOffsetSeconds)
                    )
                }
                accessibilityRole="button"
                accessibilityLabel={`Jump to next safe window starting ${formatLocationDayLabel(startTime, utcOffsetSeconds)}`}
                style={{ minHeight: Theme.touchTarget }}
            >
                {content}
            </Pressable>
        )
    }

    return content
}
