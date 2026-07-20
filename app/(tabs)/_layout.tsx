import { Tabs } from 'expo-router'
import { Platform, StyleSheet } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Theme } from '@/constants/Theme'
import { selectionHaptic } from '@/utils/haptics'
import '@/styles/globals.css'

const tabBarStyle = Platform.select({
    ios: {
        // Near-black chrome with a hairline — reads as instrument bezel, not Material card.
        backgroundColor: 'rgba(8, 9, 12, 0.97)',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(255, 255, 255, 0.12)',
    },
    default: {
        backgroundColor: Theme.colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
    },
})

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: Theme.colors.background,
                },
                headerTintColor: Theme.colors.text,
                tabBarStyle,
                tabBarActiveTintColor: Theme.colors.tabActive,
                tabBarInactiveTintColor: Theme.colors.tabInactive,
                tabBarLabelStyle: {
                    fontFamily: 'DMSans-Medium',
                    fontSize: 11,
                },
                tabBarHideOnKeyboard: Platform.OS === 'android',
            }}
            screenListeners={{
                tabPress: () => {
                    selectionHaptic()
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: 'Map',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons
                            name="map"
                            size={size}
                            color={color}
                        />
                    ),
                    headerShown: false,
                    // Allow blur cleanup to unmount the Google WebView; freeze
                    // would keep the native WebView process alive off-tab.
                    freezeOnBlur: false,
                }}
            />
            <Tabs.Screen
                name="forecast"
                options={{
                    title: 'Forecast',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons
                            name="calendar-month"
                            size={size}
                            color={color}
                        />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons
                            name="cog"
                            size={size}
                            color={color}
                        />
                    ),
                    headerShown: false,
                }}
            />
        </Tabs>
    )
}
