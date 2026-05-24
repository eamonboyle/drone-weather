module.exports = {
    expo: {
        name: 'drone-weather',
        slug: 'drone-weather',
        version: '1.0.0',
        orientation: 'portrait',
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
        },
        android: {
            package: 'com.eamonsdiary.droneweather',
            adaptiveIcon: {
                foregroundImage: './assets/images/adaptive-icon.png',
                backgroundColor: '#08090c',
            },
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/images/favicon.png',
        },
        plugins: [
            'expo-router',
            'expo-font',
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
            opencageApiKey: process.env.OPENCAGE_API_KEY,
            airspaceApiKey: process.env.AIRSPACE_API_KEY,
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
            eas: {
                projectId: 'ec84979d-cb35-482c-9eec-aa21a0afc21a',
            },
        },
    },
}
