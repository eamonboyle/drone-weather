import React from 'react'
import { View } from 'react-native'
import { Theme } from '@/constants/Theme'

interface OnboardingProgressProps {
    stepCount: number
    currentStep: number
}

export function OnboardingProgress({
    stepCount,
    currentStep,
}: OnboardingProgressProps) {
    return (
        <View
            className="flex-row gap-2"
            accessibilityRole="progressbar"
            accessibilityValue={{
                min: 1,
                max: stepCount,
                now: currentStep + 1,
            }}
            accessibilityLabel={`Step ${currentStep + 1} of ${stepCount}`}
        >
            {Array.from({ length: stepCount }, (_, index) => {
                const isActive = index <= currentStep
                return (
                    <View
                        key={index}
                        className="flex-1 h-1 rounded-full"
                        style={{
                            backgroundColor: isActive
                                ? Theme.colors.accent
                                : Theme.colors.surfaceElevated,
                        }}
                    />
                )
            })}
        </View>
    )
}
