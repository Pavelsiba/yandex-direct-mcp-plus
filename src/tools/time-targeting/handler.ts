// Временной таргетинг кампании. В API это поле кампании: читается тем же get,
// пишется тем же update. Наружный контракт — правила «дни + часы + коэффициент»,
// внутрь уходят строки из 25 чисел; перевод в обе стороны живёт здесь.
import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { WEEKDAYS } from "#shared/config/enums"
import { HOURS_IN_DAY } from "#shared/config/limits"
import { formatResult } from "#shared/lib/format"
import { apiId } from "#shared/lib/id"
import type { getTimeTargetingSchema, setTimeTargetingSchema } from "./schema.js"

const FIELDS = ["Id", "Name", "TimeZone", "TimeTargeting"]

// День недели в строке Schedule — число: 1 — понедельник, 7 — воскресенье.
const DAY_NUMBERS = new Map(WEEKDAYS.map((day, index) => [day, index + 1]))

type SetParams = z.infer<typeof setTimeTargetingSchema>

// Расписание собирается сразу на все семь дней. Пропустить день нельзя: Директ
// трактует отсутствующий элемент как «круглосуточно 100%», и «показы только в
// будни» молча превратилось бы в показы всю неделю.
function compileSchedule(rules: SetParams["schedule"]): string[] {
  const week = WEEKDAYS.map(() => new Array<number>(HOURS_IN_DAY).fill(0))

  for (const rule of rules) {
    for (const day of rule.days) {
      const hours = week[(DAY_NUMBERS.get(day) as number) - 1]
      for (let hour = rule.start_hour; hour < rule.end_hour; hour++) hours[hour] = rule.bid_percent
    }
  }

  return week.map((hours, index) => [index + 1, ...hours].join(","))
}

function buildHolidaysSchedule(params: SetParams): Record<string, unknown> | undefined {
  const configured =
    params.suspend_on_holidays !== undefined ||
    params.holiday_bid_percent !== undefined ||
    params.holiday_start_hour !== undefined ||
    params.holiday_end_hour !== undefined
  if (!configured) return undefined

  const schedule: Record<string, unknown> = {
    SuspendOnHolidays: params.suspend_on_holidays ? "YES" : "NO"
  }
  if (params.holiday_bid_percent !== undefined) schedule.BidPercent = params.holiday_bid_percent
  if (params.holiday_start_hour !== undefined) schedule.StartHour = params.holiday_start_hour
  if (params.holiday_end_hour !== undefined) schedule.EndHour = params.holiday_end_hour
  return schedule
}

export async function handleSetTimeTargeting(params: SetParams): Promise<string> {
  const timeTargeting: Record<string, unknown> = {
    Schedule: { Items: compileSchedule(params.schedule) },
    ConsiderWorkingWeekends: params.consider_working_weekends ? "YES" : "NO"
  }

  const holidays = buildHolidaysSchedule(params)
  if (holidays) timeTargeting.HolidaysSchedule = holidays

  const campaign: Record<string, unknown> = { Id: apiId(params.campaign_id), TimeTargeting: timeTargeting }
  if (params.time_zone !== undefined) campaign.TimeZone = params.time_zone

  return formatResult(await apiPost("campaigns", "update", { Campaigns: [campaign] }))
}

type Interval = { From: number; To: number; BidPercent: number }
type DaySchedule = { Day: string; Around: string; Intervals: Interval[] }

// Часы с одинаковым коэффициентом сворачиваются в интервал: 24 числа в строке
// модель прочитает, но пересказать пользователю «когда идут показы» по ним сложно.
function toIntervals(hours: number[]): Interval[] {
  const intervals: Interval[] = []

  for (let hour = 0; hour < HOURS_IN_DAY; hour++) {
    const percent = hours[hour]
    if (percent === 0) continue

    const last = intervals[intervals.length - 1]
    if (last && last.To === hour && last.BidPercent === percent) last.To = hour + 1
    else intervals.push({ From: hour, To: hour + 1, BidPercent: percent })
  }

  return intervals
}

function describe(intervals: Interval[]): string {
  if (intervals.length === 0) return "показов нет"
  if (intervals.length === 1 && intervals[0].From === 0 && intervals[0].To === HOURS_IN_DAY) {
    return intervals[0].BidPercent === 100 ? "круглосуточно" : `круглосуточно, ${intervals[0].BidPercent}%`
  }
  return intervals
    .map(({ From, To, BidPercent }) => `${From}–${To}${BidPercent === 100 ? "" : ` (${BidPercent}%)`}`)
    .join(", ")
}

// Отсутствующий в ответе день — круглосуточные показы со 100%: таково правило
// самого Директа, а не наша догадка. Поэтому неделя заполняется сотнями, и уже
// поверх ложатся присланные строки.
function decodeSchedule(items: unknown): DaySchedule[] {
  const week = WEEKDAYS.map(() => new Array<number>(HOURS_IN_DAY).fill(100))

  for (const item of Array.isArray(items) ? items : []) {
    const numbers = String(item)
      .split(",")
      .map((part) => Number(part.trim()))
    const dayNumber = numbers[0]
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > WEEKDAYS.length) continue

    week[dayNumber - 1] = numbers.slice(1, HOURS_IN_DAY + 1).map((percent) => (Number.isFinite(percent) ? percent : 0))
  }

  return week.map((hours, index) => {
    const intervals = toIntervals(hours)
    return { Day: WEEKDAYS[index], Around: describe(intervals), Intervals: intervals }
  })
}

type CampaignItem = {
  Id?: unknown
  Name?: string
  TimeZone?: string
  TimeTargeting?: {
    Schedule?: { Items?: unknown } | unknown[]
    ConsiderWorkingWeekends?: string
    HolidaysSchedule?: Record<string, unknown> | null
  } | null
}

function scheduleItems(targeting: CampaignItem["TimeTargeting"]): unknown {
  const schedule = targeting?.Schedule
  if (Array.isArray(schedule)) return schedule
  return (schedule as { Items?: unknown } | undefined)?.Items
}

export async function handleGetTimeTargeting(params: z.infer<typeof getTimeTargetingSchema>): Promise<string> {
  const data = (await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [apiId(params.campaign_id)] },
    FieldNames: FIELDS
  })) as { result?: { Campaigns?: CampaignItem[] } }

  const campaign = data?.result?.Campaigns?.[0]
  if (!campaign) return formatResult(data, { money: false })

  const items = scheduleItems(campaign.TimeTargeting)
  const note = items === undefined ? "ℹ️ Расписание не задано: показы идут круглосуточно.\n\n" : ""

  return (
    note +
    formatResult(
      {
        CampaignId: campaign.Id,
        Name: campaign.Name,
        TimeZone: campaign.TimeZone ?? "Europe/Moscow",
        ConsiderWorkingWeekends: campaign.TimeTargeting?.ConsiderWorkingWeekends === "YES",
        HolidaysSchedule: campaign.TimeTargeting?.HolidaysSchedule ?? null,
        Schedule: decodeSchedule(items)
      },
      { money: false }
    )
  )
}
