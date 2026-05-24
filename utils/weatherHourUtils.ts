import { HourlyWeatherData } from '@/types/weather'

function isSameDay(dateA: Date, dateB: Date): boolean {
    return dateA.toDateString() === dateB.toDateString()
}

export function findHourlyDataForClockHour(
    hourlyData: HourlyWeatherData[],
    clockHour: number,
    date: Date = new Date()
): HourlyWeatherData | undefined {
    const match = hourlyData.find(
        (data) =>
            isSameDay(new Date(data.time), date) &&
            new Date(data.time).getHours() === clockHour
    )

    if (match) return match

    const todayData = hourlyData.filter((data) =>
        isSameDay(new Date(data.time), date)
    )

    const futureHour = todayData.find(
        (data) => new Date(data.time).getHours() >= clockHour
    )
    if (futureHour) return futureHour

    return todayData[0] ?? hourlyData[0]
}

export function getHourlyIndexForClockHour(
    hourlyData: HourlyWeatherData[],
    clockHour: number,
    date: Date = new Date()
): number {
    const hourData = findHourlyDataForClockHour(hourlyData, clockHour, date)
    if (!hourData) return -1

    return hourlyData.findIndex(
        (data) => data.time.getTime() === hourData.time.getTime()
    )
}

export function getTodayHourlyData(
    hourlyData: HourlyWeatherData[],
    date: Date = new Date()
): HourlyWeatherData[] {
    return hourlyData.filter((data) => isSameDay(new Date(data.time), date))
}
