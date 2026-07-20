import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react'
import {
    clearHasCompletedOnboarding,
    setHasCompletedOnboarding as persistCompleted,
} from '@/services/onboardingService'

interface OnboardingContextType {
    hasCompletedOnboarding: boolean
    completeOnboarding: () => Promise<void>
    resetOnboarding: () => Promise<void>
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
    undefined
)

export function OnboardingProvider({
    children,
    initialCompleted,
}: {
    children: React.ReactNode
    initialCompleted: boolean
}) {
    const [hasCompletedOnboarding, setHasCompletedOnboarding] =
        useState(initialCompleted)

    const completeOnboarding = useCallback(async () => {
        await persistCompleted()
        setHasCompletedOnboarding(true)
    }, [])

    const resetOnboarding = useCallback(async () => {
        await clearHasCompletedOnboarding()
        setHasCompletedOnboarding(false)
    }, [])

    const value = useMemo(
        () => ({
            hasCompletedOnboarding,
            completeOnboarding,
            resetOnboarding,
        }),
        [completeOnboarding, hasCompletedOnboarding, resetOnboarding]
    )

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    )
}

export function useOnboarding() {
    const context = useContext(OnboardingContext)
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider')
    }
    return context
}
