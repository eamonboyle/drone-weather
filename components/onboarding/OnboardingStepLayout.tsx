import React from 'react'
import { View, Text, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { Theme } from '@/constants/Theme'

interface OnboardingStepLayoutProps {
    image: number
    title: string
    body: string
    children?: React.ReactNode
    /** When true, illustration shrinks to leave room for interactive content. */
    compactImage?: boolean
}

export function OnboardingStepLayout({
    image,
    title,
    body,
    children,
    compactImage = false,
}: OnboardingStepLayoutProps) {
    const { width } = useWindowDimensions()
    const imageSize = Math.min(width - 48, compactImage ? 160 : 280)

    return (
        <View className="flex-1">
            <View className="items-center mb-6">
                <Image
                    source={image}
                    style={{
                        width: imageSize,
                        height: imageSize,
                        borderRadius: Theme.borderRadius.lg,
                    }}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                />
            </View>

            <Text
                className="text-slate-100 text-3xl mb-3"
                style={{
                    fontFamily: 'Outfit-SemiBold',
                    letterSpacing: -0.5,
                    lineHeight: 34,
                }}
            >
                {title}
            </Text>
            <Text
                className="text-base mb-6"
                style={{
                    fontFamily: 'DMSans',
                    color: Theme.colors.textSecondary,
                    lineHeight: 24,
                }}
            >
                {body}
            </Text>

            {children}
        </View>
    )
}
