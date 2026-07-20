import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

/** Light selection tick — preferred on iOS instrument-panel interactions. */
export function selectionHaptic(): void {
    if (Platform.OS !== 'ios') return
    void Haptics.selectionAsync()
}

/** Soft impact for primary actions (locate, confirm). */
export function lightImpactHaptic(): void {
    if (Platform.OS !== 'ios') return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

/** Success notification for completing a meaningful flow. */
export function successHaptic(): void {
    if (Platform.OS !== 'ios') return
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
}
