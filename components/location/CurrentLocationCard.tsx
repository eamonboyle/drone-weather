import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Theme } from '@/constants/Theme'

interface CurrentLocationCardProps {
    locationName: string
    isLoading: boolean
    onPress: () => void
}

export function CurrentLocationCard({
    locationName,
    isLoading,
    onPress,
}: CurrentLocationCardProps) {
    const statusLabel = isLoading
        ? 'Getting your location'
        : locationName || 'Tap to use your phone location'

    return (
        <View className="px-4 pb-4">
            <Pressable
                onPress={onPress}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={`Use current location. ${statusLabel}`}
                accessibilityHint="Uses GPS to set the weather location to where you are now"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
                className="rounded-2xl border border-amber-500/20 active:opacity-80 overflow-hidden"
                style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    minHeight: Theme.touchTarget,
                    opacity: isLoading ? 0.7 : 1,
                }}
            >
                <View className="flex-row items-center p-4">
                    <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                    >
                        {isLoading ? (
                            <ActivityIndicator
                                size="small"
                                color={Theme.colors.accent}
                            />
                        ) : (
                            <MaterialCommunityIcons
                                name="crosshairs-gps"
                                size={20}
                                color={Theme.colors.accent}
                            />
                        )}
                    </View>
                    <View className="flex-1">
                        <Text
                            className="text-amber-500 text-xs uppercase tracking-wide mb-0.5"
                            style={{ fontFamily: 'Outfit-SemiBold' }}
                        >
                            Use current location
                        </Text>
                        <Text
                            className="text-slate-100 text-base"
                            style={{ fontFamily: 'DMSans' }}
                            numberOfLines={2}
                        >
                            {statusLabel}
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={Theme.colors.accent}
                    />
                </View>
            </Pressable>
        </View>
    )
}
