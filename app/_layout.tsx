import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { enableFreeze } from 'react-native-screens'
import { LocationProvider } from '@/contexts/LocationContext'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import {
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
} from '@expo-google-fonts/outfit'
import {
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans'

import { WeatherConfigProvider } from '@/contexts/WeatherConfigContext'
import { WeatherDataProvider } from '@/contexts/WeatherDataContext'

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
    // Ensure that reloading on `/modal` keeps a back button present.
    initialRouteName: '(tabs)',
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

enableFreeze(true)

export default function RootLayout() {
    const [loaded, error] = useFonts({
        Outfit: Outfit_400Regular,
        'Outfit-Medium': Outfit_500Medium,
        'Outfit-SemiBold': Outfit_600SemiBold,
        'Outfit-Bold': Outfit_700Bold,
        DMSans: DMSans_400Regular,
        'DMSans-Medium': DMSans_500Medium,
        'DMSans-SemiBold': DMSans_600SemiBold,
        ...FontAwesome.font,
    })

    // Expo Router uses Error Boundaries to catch errors in the navigation tree.
    useEffect(() => {
        if (error) throw error
    }, [error])

    useEffect(() => {
        if (loaded) {
            SplashScreen.hideAsync()
        }
    }, [loaded])

    if (!loaded) {
        return null
    }

    return (
        <ThemeProvider value={DarkTheme}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <WeatherConfigProvider>
                        <WeatherDataProvider>
                            <LocationProvider>
                                <Stack
                                    screenOptions={{
                                        headerShown: false,
                                        contentStyle: { backgroundColor: '#08090c' },
                                        animation: 'default',
                                        freezeOnBlur: true,
                                    }}
                                >
                                    <Stack.Screen
                                        name="(tabs)"
                                        options={{ headerShown: false }}
                                    />
                                    <Stack.Screen
                                        name="location"
                                        options={{
                                            headerShown: false,
                                            animation: 'simple_push',
                                            presentation: 'card',
                                            freezeOnBlur: true,
                                        }}
                                    />
                                </Stack>
                                <StatusBar style="light" />
                            </LocationProvider>
                        </WeatherDataProvider>
                    </WeatherConfigProvider>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </ThemeProvider>
    )
}
