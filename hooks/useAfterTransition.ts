import { useEffect, useState } from 'react'
import { useNavigation } from 'expo-router'

/**
 * Returns true after the current navigation transition ends (when available),
 * then an idle paint handoff (double rAF + setTimeout(0)).
 * Falls back after a short settle window if no transitionEnd fires (e.g. tabs).
 */
export function useAfterTransition() {
    const [ready, setReady] = useState(false)
    const navigation = useNavigation()

    useEffect(() => {
        let cancelled = false
        let settled = false
        let idleTimer: ReturnType<typeof setTimeout> | null = null
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null
        let raf1 = 0
        let raf2 = 0

        const armIdle = () => {
            if (cancelled || settled) return
            settled = true
            raf1 = requestAnimationFrame(() => {
                raf2 = requestAnimationFrame(() => {
                    idleTimer = setTimeout(() => {
                        if (!cancelled) setReady(true)
                    }, 0)
                })
            })
        }

        // Stack pushes emit transitionEnd; subscribe before fallback.
        const unsubscribe = navigation.addListener(
            // Typed loosely: not all navigators declare this event.
            'transitionEnd' as never,
            armIdle
        )

        // If no transition is in flight (or event already passed), settle soon.
        fallbackTimer = setTimeout(armIdle, 320)

        return () => {
            cancelled = true
            unsubscribe()
            if (fallbackTimer) clearTimeout(fallbackTimer)
            if (idleTimer) clearTimeout(idleTimer)
            if (raf1) cancelAnimationFrame(raf1)
            if (raf2) cancelAnimationFrame(raf2)
        }
    }, [navigation])

    return ready
}
