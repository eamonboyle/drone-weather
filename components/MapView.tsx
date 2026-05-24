import React from 'react'
import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { useLocation } from '@/contexts/LocationContext'

export function DroneMapView() {
    const { location } = useLocation()

    // Google My Maps embed URL
    const mapUrl = `https://www.google.com/maps/d/embed?mid=1BktWMPYNuh6N5_IPngyq8jW80nAWXI8d&femb=1&ll=${location?.coords.latitude || 53.969343189733976},${location?.coords.longitude || -7.362310992457914}&z=12`

    return (
        <View style={styles.container}>
            <WebView
                source={{ uri: mapUrl }}
                style={styles.map}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
        borderRadius: 16,
        backgroundColor: '#0f1115',
    },
    map: {
        flex: 1,
    },
})
