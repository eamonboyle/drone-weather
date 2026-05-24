import { View, Text, Pressable } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { format, isToday, isTomorrow } from 'date-fns'
import { SafeFlyingWindow } from '@/services/droneFlyabilityService'

interface NextFlyWindowProps {
    window: SafeFlyingWindow
    onSelectWindow?: (startHour: number) => void
}

function formatDayLabel(date: Date): string {
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEE, MMM d')
}

function formatTimeRange(start: Date, end: Date): string {
    return `${format(start, 'h a')} – ${format(end, 'h a')}`
}

export function NextFlyWindow({ window, onSelectWindow }: NextFlyWindowProps) {
    if (window.type === 'none') {
        return (
            <View
                className="rounded-xl p-4 mb-4 flex-row items-center"
                style={{
                    backgroundColor: 'rgba(22, 26, 32, 0.6)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.06)',
                }}
            >
                <MaterialCommunityIcons
                    name="calendar-remove"
                    size={22}
                    color="#64748b"
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
                backgroundColor: 'rgba(22, 26, 32, 0.6)',
                borderWidth: 1,
                borderColor:
                    window.type === 'now'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(245, 158, 11, 0.3)',
            }}
        >
            <MaterialCommunityIcons
                name={window.type === 'now' ? 'clock-check' : 'clock-outline'}
                size={22}
                color={window.type === 'now' ? '#10b981' : '#f59e0b'}
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
                        : `${formatDayLabel(startTime)} · ${formatTimeRange(startTime, endTime)} (${durationHours} hr${durationHours === 1 ? '' : 's'})`}
                </Text>
            </View>
            {isPressable && (
                <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color="#64748b"
                />
            )}
        </View>
    )

    if (isPressable) {
        return (
            <Pressable
                onPress={() =>
                    onSelectWindow?.(startTime.getHours())
                }
            >
                {content}
            </Pressable>
        )
    }

    return content
}
