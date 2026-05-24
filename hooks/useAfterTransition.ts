import { useEffect, useState } from 'react'
import { InteractionManager } from 'react-native'

/**
 * Returns true once the current navigation transition and interactions have
 * finished. Use to defer autofocus, network fetches, and other heavy work so
 * stack push/pop animations stay on the native thread.
 */
export function useAfterTransition() {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const handle = InteractionManager.runAfterInteractions(() => {
            setReady(true)
        })

        return () => handle.cancel()
    }, [])

    return ready
}
