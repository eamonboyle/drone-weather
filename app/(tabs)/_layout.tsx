import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Theme } from '@/constants/Theme'
import '@/styles/globals.css'

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: {
                    backgroundColor: Theme.colors.background,
                },
                headerTintColor: Theme.colors.text,
                tabBarStyle: {
                    backgroundColor: Theme.colors.tabBar,
                    borderTopWidth: 1,
                    borderTopColor: Theme.colors.border,
                },
                tabBarActiveTintColor: Theme.colors.tabActive,
                tabBarInactiveTintColor: Theme.colors.tabInactive,
                tabBarLabelStyle: {
                    fontFamily: 'DMSans-Medium',
                    fontSize: 11,
                },
                tabBarHideOnKeyboard: Platform.OS === 'android',
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
