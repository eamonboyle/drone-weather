import React from 'react'
import { Pressable, Text, ActivityIndicator } from 'react-native'
import { Theme } from '@/constants/Theme'
import { lightImpactHaptic } from '@/utils/haptics'

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
    const isPrimary = variant === 'primary'
    const isDisabled = disabled || loading

    return (
        <Pressable
            onPress={() => {
                if (isDisabled) return
                lightImpactHaptic()
                onPress()
            }}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ disabled: isDisabled, busy: loading }}
            className="rounded-xl items-center justify-center px-5"
            style={({ pressed }) => ({
                minHeight: Theme.touchTarget,
                backgroundColor: isPrimary
                    ? Theme.colors.accent
                    : 'transparent',
                opacity: isDisabled ? 0.5 : 1,
                transform: [
                    { scale: pressed && !isDisabled ? 0.97 : 1 },
                ],
            })}
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
        </Pressable>
    )
}
