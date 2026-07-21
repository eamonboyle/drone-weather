/** Default finger movement (pt) before a map touch is treated as a pan, not a tap. */
export const MAP_TAP_SLOP_PT = 10

/** True when movement from the touch origin exceeds the tap slop. */
export function exceedsTapSlop(
    dx: number,
    dy: number,
    slop: number = MAP_TAP_SLOP_PT
): boolean {
    return dx * dx + dy * dy > slop * slop
}
