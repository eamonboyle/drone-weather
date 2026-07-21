// Load OPENCAGE_API_KEY (and other vars) from a local .env — never commit .env.
require('dotenv').config()

module.exports = {
    expo: {
        name: 'drone-weather',
        slug: 'drone-weather',
        version: '1.0.0',
        orientation: 'default',
        icon: './assets/images/icon.png',
        scheme: 'myapp',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        splash: {
            image: './assets/images/splash-icon.png',
            resizeMode: 'contain',
            backgroundColor: '#08090c',
        },
        assetBundlePatterns: ['**/*'],
        ios: {
            supportsTablet: true,
            bundleIdentifier: 'com.eamonsdiary.droneweather',
            infoPlist: {
                NSLocationWhenInUseUsageDescription:
                    'Drone Weather uses your location to show local flying conditions and forecasts.',
            },
        },
        android: {
            package: 'com.eamonsdiary.droneweather',
            adaptiveIcon: {
                foregroundImage: './assets/images/adaptive-icon.png',
                backgroundColor: '#08090c',
            },
            permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/favicon.png',
        },
        plugins: [
            'expo-router',
            'expo-font',
            'expo-image',
            'expo-web-browser',
            'expo-status-bar',
            '@maplibre/maplibre-react-native',
            [
                'expo-location',
                {
                    locationWhenInUsePermission:
                        'Allow Drone Weather to use your location to show local flying conditions and forecasts.',
                },
            ],
            [
                'expo-splash-screen',
                {
                    image: './assets/images/splash-icon.png',
                    imageWidth: 200,
                    resizeMode: 'contain',
                    backgroundColor: '#08090c',
                },
            ],
        ],
        experiments: {
            typedRoutes: true,
        },
        extra: {
            // Public client configuration only — never put secrets here.
            opencageApiKey: process.env.OPENCAGE_API_KEY,
            mapStyleUrl: 'https://tiles.openfreemap.org/styles/liberty',
            eas: {
                projectId: 'ec84979d-cb35-482c-9eec-aa21a0afc21a',
            },
        },
    },
}
