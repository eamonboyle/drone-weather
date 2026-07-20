import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Platform } from 'react-native'
// Required by NativeWind / react-native-css-interop (and Reanimated babel plugin).
import 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { enableFreeze } from 'react-native-screens'
import { LocationProvider } from '@/contexts/LocationContext'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Outfit_400Regular } from '@expo-google-fonts/outfit/400Regular'
import { Outfit_600SemiBold } from '@expo-google-fonts/outfit/600SemiBold'
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular'
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium'
import Ionicons from '@expo/vector-icons/Ionicons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

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
    // Only faces referenced via fontFamily + icon fonts used in tabs/chrome.
    const [loaded, error] = useFonts({
        Outfit: Outfit_400Regular,
        'Outfit-SemiBold': Outfit_600SemiBold,
        DMSans: DMSans_400Regular,
        'DMSans-Medium': DMSans_500Medium,
        ...Ionicons.font,
        ...MaterialCommunityIcons.font,
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

    // Mount data providers immediately so GPS / cache / weather can start while
    // fonts finish loading. Only gate the navigator (and splash) on fonts.
    return (
        <ThemeProvider value={DarkTheme}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaProvider>
                    <WeatherConfigProvider>
                        <WeatherDataProvider>
                            <LocationProvider>
                                {loaded ? (
                                    <>
                                        <Stack
                                            screenOptions={{
                                                headerShown: false,
                                                contentStyle: {
                                                    backgroundColor: '#08090c',
                                                },
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
                                                    // iOS sheet feels native for location search; Android keeps a card.
                                                    presentation:
                                                        Platform.OS === 'ios'
                                                            ? 'modal'
                                                            : 'card',
                                                    freezeOnBlur: true,
                                                }}
                                            />
                                        </Stack>
                                        <StatusBar style="light" />
                                    </>
                                ) : null}
                            </LocationProvider>
                        </WeatherDataProvider>
                    </WeatherConfigProvider>
                </SafeAreaProvider>
            </GestureHandlerRootView>
        </ThemeProvider>
    )
}
