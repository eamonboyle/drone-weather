import { View, Text, Pressable } from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { LinearGradient } from 'expo-linear-gradient'
import { Theme } from '@/constants/Theme'

interface StatusBannerProps {
    isSafe: boolean
    safeLabel?: string
    unsafeLabel?: string
    reasons?: string[]
}

export function StatusBanner({
    isSafe,
    safeLabel = 'Safe to Fly',
    unsafeLabel = 'Not Safe to Fly',
    reasons = [],
}: StatusBannerProps) {
    const gradientColors = isSafe
        ? (['#065f46', '#047857'] as const)
        : (['#7f1d1d', '#991b1b'] as const)

    return (
        <View
            className="mb-4"
            accessibilityRole="summary"
            accessibilityLabel={
                isSafe
                    ? safeLabel
                    : `${unsafeLabel}. ${reasons.join('. ')}`
            }
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="p-5 rounded-2xl overflow-hidden"
                style={{
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
            >
                <View className="flex-row items-center justify-center">
                    <MaterialCommunityIcons
                        name={isSafe ? 'airplane' : 'airplane-off'}
                        size={28}
                        color="white"
                        style={{ opacity: 0.95 }}
                    />
                    <Text
                        className="text-xl text-white font-bold ml-3"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        {isSafe ? safeLabel : unsafeLabel}
                    </Text>
                </View>
                {reasons.length > 0 && (
                    <View
                        className="rounded-xl p-4 mt-3"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
                    >
                        {reasons.map((reason, index) => (
                            <View
                                key={index}
                                className="flex-row items-center mb-2 last:mb-0"
                            >
                                <MaterialCommunityIcons
                                    name="alert-circle"
                                    size={16}
                                    color="rgba(255, 255, 255, 0.9)"
                                />
                                <Text
                                    className="text-white/90 ml-2 flex-1 text-sm"
                                    style={{ fontFamily: 'DMSans' }}
                                >
                                    {reason}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </LinearGradient>
        </View>
    )
}

interface EmptyStateProps {
    icon?: keyof typeof MaterialCommunityIcons.glyphMap
    message: string
    actionLabel?: string
    onAction?: () => void
}

export function EmptyState({
    icon = 'cloud-alert',
    message,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <View className="flex-1 justify-center items-center px-6">
            <MaterialCommunityIcons
                name={icon}
                size={48}
                color={Theme.colors.accent}
            />
            <Text
                className="text-slate-300 text-base text-center mt-4"
                style={{ fontFamily: 'DMSans' }}
                accessibilityRole="alert"
            >
                {message}
            </Text>
            {actionLabel && onAction ? (
                <Pressable
                    onPress={onAction}
                    accessibilityRole="button"
                    accessibilityLabel={actionLabel}
                    className="mt-4 px-6 py-3 rounded-xl"
                    style={{
                        backgroundColor: Theme.colors.accent,
                        minHeight: Theme.touchTarget,
                        justifyContent: 'center',
                    }}
                >
                    <Text
                        className="text-background font-semibold"
                        style={{ fontFamily: 'Outfit-SemiBold' }}
                    >
                        {actionLabel}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    )
}
