import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

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
    return (
        <View className="px-4 pb-4">
            <Pressable
                onPress={onPress}
                disabled={isLoading}
                className="rounded-2xl border border-amber-500/20 active:opacity-80 overflow-hidden"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)' }}
            >
                <View className="flex-row items-center p-4">
                    <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                    >
                        {isLoading ? (
                            <ActivityIndicator size="small" color="#f59e0b" />
                        ) : (
                            <MaterialCommunityIcons
                                name="crosshairs-gps"
                                size={20}
                                color="#f59e0b"
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
                            {isLoading
                                ? 'Getting your location...'
                                : locationName ||
                                  'Tap to use your phone location'}
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color="#f59e0b"
                    />
                </View>
            </Pressable>
        </View>
    )
}
