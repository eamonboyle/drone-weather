import React, { useCallback, useEffect, useState } from 'react'
import {
    AccessibilityInfo,
    Pressable,
    View,
    Text,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { Theme } from '@/constants/Theme'
import { useLocation } from '@/contexts/LocationContext'
import { useWeatherConfig } from '@/contexts/WeatherConfigContext'
import { DroneProfile } from '@/types/droneProfiles'
import { DroneProfileList } from '@/components/DroneProfileList'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { OnboardingButton } from '@/components/onboarding/OnboardingButton'
import { OnboardingStepLayout } from '@/components/onboarding/OnboardingStepLayout'
import { useOnboarding } from '@/contexts/OnboardingContext'
import { successHaptic } from '@/utils/haptics'

const STEPS = ['welcome', 'location', 'drone', 'ready'] as const
type StepId = (typeof STEPS)[number]

const ILLUSTRATIONS = {
    welcome: require('@/assets/images/onboarding/welcome.png'),
    location: require('@/assets/images/onboarding/location.png'),
    drone: require('@/assets/images/onboarding/drone.png'),
    ready: require('@/assets/images/onboarding/ready.png'),
} as const

export default function OnboardingScreen() {
    const { updateLocation, locationName, errorMsg, isLocating } =
        useLocation()
    const { selectedProfile, setSelectedProfile } = useWeatherConfig()
    const { completeOnboarding } = useOnboarding()

    const [stepIndex, setStepIndex] = useState(0)
    const [reduceMotion, setReduceMotion] = useState(false)
    const [isRequestingLocation, setIsRequestingLocation] = useState(false)
    const [didRequestLocation, setDidRequestLocation] = useState(false)
    const [isFinishing, setIsFinishing] = useState(false)

    useEffect(() => {
        void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion)
        const sub = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            setReduceMotion
        )
        return () => sub.remove()
    }, [])

    const goToStep = useCallback(
        (nextIndex: number) => {
            if (nextIndex < 0 || nextIndex >= STEPS.length) return
            if (nextIndex === stepIndex) return
            setStepIndex(nextIndex)
        },
        [stepIndex]
    )

    const goNext = useCallback(() => {
        goToStep(stepIndex + 1)
    }, [goToStep, stepIndex])

    const goBack = useCallback(() => {
        goToStep(stepIndex - 1)
    }, [goToStep, stepIndex])

    const handleUseLocation = useCallback(async () => {
        setIsRequestingLocation(true)
        try {
            await updateLocation()
            setDidRequestLocation(true)
            goToStep(stepIndex + 1)
        } finally {
            setIsRequestingLocation(false)
        }
    }, [goToStep, stepIndex, updateLocation])

    const handleSelectProfile = useCallback(
        async (profile: DroneProfile) => {
            await setSelectedProfile(profile)
        },
        [setSelectedProfile]
    )

    const handleFinish = useCallback(async () => {
        if (isFinishing) return
        setIsFinishing(true)
        try {
            await completeOnboarding()
            successHaptic()
            router.replace('/(tabs)')
        } catch (error) {
            console.error('Error completing onboarding:', error)
            setIsFinishing(false)
        }
    }, [completeOnboarding, isFinishing])

    const stepId: StepId = STEPS[stepIndex]
    const locationStatus =
        didRequestLocation && locationName
            ? `Using ${locationName}`
            : didRequestLocation && errorMsg
              ? 'Location unavailable — you can pick a place anytime from Home.'
              : null

    const entering = FadeIn.duration(reduceMotion ? 120 : 220)
    const exiting = FadeOut.duration(reduceMotion ? 80 : 160)

    return (
        <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: Theme.colors.background }}
            edges={['top', 'bottom']}
        >
            <View className="flex-1 px-6 pt-4 pb-3">
                <View className="flex-row items-center gap-3">
                    {stepIndex > 0 ? (
                        <Pressable
                            onPress={goBack}
                            accessibilityRole="button"
                            accessibilityLabel="Back"
                            hitSlop={8}
                            style={{
                                minHeight: Theme.touchTarget,
                                minWidth: Theme.touchTarget,
                                justifyContent: 'center',
                            }}
                        >
                            <MaterialCommunityIcons
                                name="chevron-left"
                                size={28}
                                color={Theme.colors.accent}
                            />
                        </Pressable>
                    ) : null}
                    <View className="flex-1">
                        <OnboardingProgress
                            stepCount={STEPS.length}
                            currentStep={stepIndex}
                        />
                    </View>
                </View>

                <Animated.View
                    key={stepId}
                    entering={entering}
                    exiting={exiting}
                    style={{ flex: 1, marginTop: 28 }}
                >
                    {stepId === 'welcome' ? (
                        <OnboardingStepLayout
                            image={ILLUSTRATIONS.welcome}
                            title="Drone Weather"
                            body="See if it’s safe to fly — wind, gusts, visibility, and rain for your aircraft."
                        />
                    ) : null}

                    {stepId === 'location' ? (
                        <OnboardingStepLayout
                            image={ILLUSTRATIONS.location}
                            title="Your flying area"
                            body="We use your location to load local conditions. You can change it anytime."
                        >
                            {locationStatus ? (
                                <Text
                                    className="text-sm mb-2"
                                    style={{
                                        fontFamily: 'DMSans-Medium',
                                        color: Theme.colors.textSecondary,
                                    }}
                                >
                                    {locationStatus}
                                </Text>
                            ) : null}
                        </OnboardingStepLayout>
                    ) : null}

                    {stepId === 'drone' ? (
                        <OnboardingStepLayout
                            image={ILLUSTRATIONS.drone}
                            title="Choose your drone"
                            body="We’ll match flyability checks to your aircraft. Skip to use balanced defaults."
                            compactImage
                        >
                            <View className="flex-1 min-h-[220px]">
                                <DroneProfileList
                                    selectedProfile={selectedProfile}
                                    onSelectProfile={handleSelectProfile}
                                    contentBottomInset={8}
                                />
                            </View>
                        </OnboardingStepLayout>
                    ) : null}

                    {stepId === 'ready' ? (
                        <OnboardingStepLayout
                            image={ILLUSTRATIONS.ready}
                            title="You’re ready"
                            body={
                                selectedProfile
                                    ? `Checks are tuned for ${selectedProfile.name}. Open Home for today’s go / no-go.`
                                    : 'Open Home for today’s go / no-go. You can set a drone profile anytime in Settings.'
                            }
                        />
                    ) : null}
                </Animated.View>

                <View className="gap-2 pt-3">
                    {stepId === 'welcome' ? (
                        <OnboardingButton label="Continue" onPress={goNext} />
                    ) : null}

                    {stepId === 'location' ? (
                        <>
                            <OnboardingButton
                                label="Use my location"
                                onPress={() => {
                                    void handleUseLocation()
                                }}
                                loading={isRequestingLocation || isLocating}
                            />
                            <OnboardingButton
                                label="Skip for now"
                                onPress={goNext}
                                variant="secondary"
                                disabled={isRequestingLocation}
                            />
                        </>
                    ) : null}

                    {stepId === 'drone' ? (
                        <OnboardingButton
                            label={
                                selectedProfile ? 'Continue' : 'Skip for now'
                            }
                            onPress={goNext}
                        />
                    ) : null}

                    {stepId === 'ready' ? (
                        <OnboardingButton
                            label="Get started"
                            onPress={() => {
                                void handleFinish()
                            }}
                            loading={isFinishing}
                        />
                    ) : null}
                </View>
            </View>
        </SafeAreaView>
    )
}
