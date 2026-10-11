import test from 'node:test'
import assert from 'node:assert/strict'
import { getWeekRangeForDate, shiftCalendarDate, validateWeekStartDate } from '../src/services/weeklyReviewCalendar.js'

test('calculates the current and previous configured week boundaries', () => {
  const current = getWeekRangeForDate('2026-10-11', 1)
  assert.deepEqual(current, { week_start_date: '2026-10-05', week_end_date: '2026-10-11' })
  assert.equal(shiftCalendarDate(current.week_start_date, -7), '2026-09-28')
  assert.equal(shiftCalendarDate(current.week_start_date, 7), '2026-10-12')
})

test('supports Sunday and Saturday configured week starts', () => {
  assert.deepEqual(getWeekRangeForDate('2026-10-11', 0), {
    week_start_date: '2026-10-11', week_end_date: '2026-10-17',
  })
  assert.deepEqual(getWeekRangeForDate('2026-10-11', 6), {
    week_start_date: '2026-10-10', week_end_date: '2026-10-16',
  })
  assert.equal(validateWeekStartDate('2026-10-10', 6), '2026-10-10')
})

test('rejects malformed, impossible, and misaligned week start dates', () => {
  assert.throws(() => validateWeekStartDate('2026-02-30', 1), /valid calendar date/)
  assert.throws(() => validateWeekStartDate('2026-10-11', 1), /configured week start day/)
  assert.throws(() => validateWeekStartDate('2026-1-05', 1), /YYYY-MM-DD/)
})