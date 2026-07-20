import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router/react-navigation'

export function formatFreshnessLabelForTests(
    timestamp: number,
    nowMs: number
): string {
    const ageMin = Math.max(0, Math.floor((nowMs - timestamp) / 60_000))
    if (ageMin < 1) return 'Updated just now'
    if (ageMin === 1) return 'Updated 1 min ago'
    return `Updated ${ageMin} min ago`
}

/**
 * Minute-aligned freshness label that only ticks while the screen is focused.
 * Avoids stale “597 min” labels after backgrounding without timers on inactive tabs.
 */
export function useFocusAwareFreshnessLabel(
    timestamp: number | null | undefined
): string | null {
    const [nowMs, setNowMs] = useState(() => Date.now())
    const [isFocused, setIsFocused] = useState(true)

    useFocusEffect(
        useCallback(() => {
            setIsFocused(true)
            setNowMs(Date.now())
            return () => {
                setIsFocused(false)
            }
        }, [])
    )

    useEffect(() => {
        if (!isFocused) return

        const msToNextMinute = 60_000 - (Date.now() % 60_000)
        let intervalId: ReturnType<typeof setInterval> | null = null

        const timeoutId = setTimeout(() => {
            setNowMs(Date.now())
            intervalId = setInterval(() => {
                setNowMs(Date.now())
            }, 60_000)
        }, msToNextMinute)

        return () => {
            clearTimeout(timeoutId)
            if (intervalId) clearInterval(intervalId)
        }
    }, [isFocused])

    if (timestamp == null) return null
    return formatFreshnessLabelForTests(timestamp, nowMs)
}
