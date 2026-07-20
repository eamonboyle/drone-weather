import React from 'react'
import { Pressable, Text, ActivityIndicator } from 'react-native'
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated'
import { Theme } from '@/constants/Theme'
import { lightImpactHaptic } from '@/utils/haptics'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

interface OnboardingButtonProps {
    label: string
    onPress: () => void
    variant?: 'primary' | 'secondary'
    disabled?: boolean
    loading?: boolean
    accessibilityHint?: string
}

export function OnboardingButton({
    label,
    onPress,
    variant = 'primary',
    disabled = false,
    loading = false,
    accessibilityHint,
}: OnboardingButtonProps) {
    const scale = useSharedValue(1)
    const isPrimary = variant === 'primary'
    const isDisabled = disabled || loading

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }))

    return (
        <AnimatedPressable
            onPress={() => {
                if (isDisabled) return
                lightImpactHaptic()
                onPress()
            }}
            onPressIn={() => {
                if (isDisabled) return
                scale.value = withSpring(0.97, {
                    damping: 24,
                    stiffness: 400,
                })
            }}
            onPressOut={() => {
                scale.value = withSpring(1, {
                    damping: 24,
                    stiffness: 400,
                })
            }}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            className="rounded-xl items-center justify-center px-5"
            style={[
                animatedStyle,
                {
                    minHeight: Theme.touchTarget,
                    backgroundColor: isPrimary
                        ? Theme.colors.accent
                        : 'transparent',
                    opacity: isDisabled ? 0.5 : 1,
                },
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    color={
                        isPrimary
                            ? Theme.colors.textInverse
                            : Theme.colors.accent
                    }
                />
            ) : (
                <Text
                    style={{
                        fontFamily: 'Outfit-SemiBold',
                        fontSize: 16,
                        color: isPrimary
                            ? Theme.colors.textInverse
                            : Theme.colors.textSecondary,
                    }}
                >
                    {label}
                </Text>
            )}
        </AnimatedPressable>
    )
}
