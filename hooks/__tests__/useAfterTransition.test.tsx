import React from 'react'
import renderer, { act, ReactTestRenderer } from 'react-test-renderer'
import { useAfterTransition } from '@/hooks/useAfterTransition'

const listeners: Record<string, Array<() => void>> = {}

jest.mock('expo-router', () => ({
    useNavigation: () => ({
        addListener: (event: string, cb: () => void) => {
            if (!listeners[event]) listeners[event] = []
            listeners[event].push(cb)
            return () => {
                listeners[event] = (listeners[event] ?? []).filter(
                    (item) => item !== cb
                )
            }
        },
    }),
}))

function Probe({ onReady }: { onReady: (ready: boolean) => void }) {
    const ready = useAfterTransition()
    onReady(ready)
    return null
}

describe('useAfterTransition', () => {
    beforeEach(() => {
        Object.keys(listeners).forEach((key) => {
            delete listeners[key]
        })
        jest.useFakeTimers()
        jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
            (cb: FrameRequestCallback) => {
                return setTimeout(
                    () => cb(performance.now()),
                    0
                ) as unknown as number
            }
        )
        jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(
            (id: number | null | undefined) => {
                if (id == null) return
                clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
            }
        )
    })

    afterEach(() => {
        jest.restoreAllMocks()
        jest.useRealTimers()
    })

    it('becomes ready after transitionEnd then idle handoff', () => {
        let ready = false
        let tree: ReactTestRenderer

        act(() => {
            tree = renderer.create(
                <Probe
                    onReady={(value) => {
                        ready = value
                    }}
                />
            )
        })

        expect(ready).toBe(false)
        expect(listeners.transitionEnd?.length).toBe(1)

        act(() => {
            listeners.transitionEnd.forEach((cb) => cb())
            jest.runAllTimers()
        })

        expect(ready).toBe(true)

        act(() => {
            tree!.unmount()
        })
    })

    it('becomes ready via fallback when no transitionEnd fires', () => {
        let ready = false
        let tree: ReactTestRenderer

        act(() => {
            tree = renderer.create(
                <Probe
                    onReady={(value) => {
                        ready = value
                    }}
                />
            )
        })

        expect(ready).toBe(false)

        act(() => {
            jest.advanceTimersByTime(320)
            jest.runAllTimers()
        })

        expect(ready).toBe(true)

        act(() => {
            tree!.unmount()
        })
    })
})
