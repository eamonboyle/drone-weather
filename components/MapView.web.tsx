import { View, Text, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Theme } from '@/constants/Theme'

const EMPTY_WEATHER_IMAGE = require('@/assets/images/empty/weather.png')

/**
 * Web stub — MapLibre native is unavailable in the browser.
 * Keeps Expo web usable for UI iteration on Home / Forecast / Settings.
 */
export function DroneMapView() {
    return (
        <View style={styles.container} accessibilityRole="summary">
            <Image
                source={EMPTY_WEATHER_IMAGE}
                style={styles.image}
                contentFit="cover"
                accessibilityIgnoresInvertColors
            />
            <View style={styles.card}>
                <MaterialCommunityIcons
                    name="map-outline"
                    size={28}
                    color={Theme.colors.accent}
                />
                <Text style={styles.title}>Map is native-only</Text>
                <Text style={styles.body}>
                    Airspace layers run on iOS and Android. Use the simulator or
                    a device to explore the map.
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Theme.spacing.xl,
    },
    image: {
        width: 160,
        height: 160,
        borderRadius: Theme.borderRadius.xl,
        marginBottom: Theme.spacing.xl,
        opacity: 0.9,
    },
    card: {
        alignItems: 'center',
        maxWidth: 320,
        gap: Theme.spacing.sm,
    },
    title: {
        color: Theme.colors.text,
        fontFamily: 'Outfit-SemiBold',
        fontSize: Theme.typography.sizes.lg,
        marginTop: Theme.spacing.sm,
    },
    body: {
        color: Theme.colors.textSecondary,
        fontFamily: 'DMSans',
        fontSize: Theme.typography.sizes.sm,
        textAlign: 'center',
        lineHeight: 20,
    },
})
