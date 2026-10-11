const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function validateWeekStartDate(value, weekStartsOn) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new TypeError('week_start_date must use YYYY-MM-DD format')
  }
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new TypeError('week_start_date must be a valid calendar date')
  }
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) {
    throw new TypeError('week_starts_on must be a day from 0 through 6')
  }
  if (parsed.getUTCDay() !== weekStartsOn) {
    throw new TypeError('week_start_date must match your configured week start day')
  }
  return value
}

export function shiftCalendarDate(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function getWeekRangeForDate(today, weekStartsOn) {
  const parsedToday = new Date(`${today}T00:00:00.000Z`)
  const daysSinceStart = (parsedToday.getUTCDay() - weekStartsOn + 7) % 7
  const weekStartDate = shiftCalendarDate(today, -daysSinceStart)
  return {
    week_start_date: weekStartDate,
    week_end_date: shiftCalendarDate(weekStartDate, 6),
  }
}