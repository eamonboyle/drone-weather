import { View, Text, ActivityIndicator } from 'react-native'
import { FlyabilityStatus } from '@/hooks/useLocationFlyability'

interface FlyabilityChipProps {
    status: FlyabilityStatus
}

export function FlyabilityChip({ status }: FlyabilityChipProps) {
    if (status === 'unavailable') {
        return null
    }

    if (status === 'loading') {
        return (
            <View className="px-2 py-0.5 rounded-full bg-white/5">
                <ActivityIndicator size="small" color="#64748b" />
            </View>
        )
    }

    const isSafe = status === 'safe'

    return (
        <View
            className="px-2 py-0.5 rounded-full"
            style={{
                backgroundColor: isSafe
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
            }}
        >
            <Text
                className="text-xs"
                style={{
                    fontFamily: 'DMSans-Medium',
                    color: isSafe ? '#10b981' : '#ef4444',
                }}
            >
                {isSafe ? 'Safe to fly' : 'Not flyable'}
            </Text>
        </View>
    )
}
