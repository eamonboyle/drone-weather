import React from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'

interface LoadingSpinnerProps {
    size?: 'small' | 'large'
    color?: string
    text?: string
    fullscreen?: boolean
}

export function LoadingSpinner({
    size = 'large',
    color = '#f59e0b',
    text = 'Loading...',
    fullscreen = false,
}: LoadingSpinnerProps) {
    const containerStyle = [styles.container, fullscreen && styles.fullscreen]

    return (
        <View style={containerStyle}>
            <ActivityIndicator size={size} color={color} />
            {text ? (
                <Text style={[styles.text, { color }]}>{text}</Text>
            ) : null}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    fullscreen: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    text: {
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'DMSans-Medium',
    },
})
