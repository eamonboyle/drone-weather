import {
    DroneFlightConditions,
    FlyabilityCheck,
    FlyabilityCheckStatus,
    FlyabilityFactor,
} from '@/types/weather'

export function getFlyabilityCheck(
    conditions: DroneFlightConditions,
    factor: FlyabilityFactor
): FlyabilityCheck | undefined {
    return conditions.checks.find((check) => check.factor === factor)
}

export function getCheckStatus(
    conditions: DroneFlightConditions,
    factor: FlyabilityFactor
): FlyabilityCheckStatus {
    return getFlyabilityCheck(conditions, factor)?.status ?? 'unavailable'
}

/** Map structured status to legacy boolean / neutral cell styling */
export function checkStatusToCellSafe(
    status: FlyabilityCheckStatus
): boolean | 'neutral' {
    if (status === 'safe') return true
    if (status === 'unavailable') return false
    return false
}

export function checkStatusToMetricSafety(
    status: FlyabilityCheckStatus
): 'safe' | 'unsafe' | 'unavailable' | 'neutral' {
    return status
}

export function checkStatusToBooleanSafe(
    status: FlyabilityCheckStatus
): boolean {
    return status === 'safe'
}
