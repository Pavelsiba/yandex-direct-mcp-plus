// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleGetTimeTargeting, handleSetTimeTargeting } from "./handler.js"
import { setTimeTargetingSchema } from "./schema.js"

installFetchMock()

const updated = { result: { UpdateResults: [{ Id: 1 }] } }

function lastBody() {
  return JSON.parse(lastRawBody())
}

function lastTimeTargeting() {
  return lastBody().params.Campaigns[0].TimeTargeting
}

// Расписание «будни с 9 до 21» в правилах схемы.
const weekdaysNineToNine = {
  campaign_id: "1915016273214320641",
  schedule: [{ days: ["MON", "TUE", "WED", "THU", "FRI"], start_hour: 9, end_hour: 21 }]
}

describe("set_time_targeting", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(okResponse(updated))
  })

  it("собирает строку из 25 чисел: день недели и коэффициент на каждый час", async () => {
    await handleSetTimeTargeting(setTimeTargetingSchema.parse(weekdaysNineToNine))

    const items = lastTimeTargeting().Schedule.Items
    expect(items).toHaveLength(7)
    expect(items[0]).toBe(`1,${[...Array(9).fill(0), ...Array(12).fill(100), ...Array(3).fill(0)].join(",")}`)
  })

  // Директ трактует отсутствующий день как круглосуточные показы со 100%,
  // поэтому «только будни» без явных нулей на выходные стало бы показами всю неделю.
  it("отправляет все семь дней, а непокрытые правилами часы обнуляет", async () => {
    await handleSetTimeTargeting(setTimeTargetingSchema.parse(weekdaysNineToNine))

    const items = lastTimeTargeting().Schedule.Items
    expect(items[5]).toBe(`6,${Array(24).fill(0).join(",")}`)
    expect(items[6]).toBe(`7,${Array(24).fill(0).join(",")}`)
  })

  it("применяет правила по порядку: последнее переопределяет предыдущие", async () => {
    await handleSetTimeTargeting(
      setTimeTargetingSchema.parse({
        campaign_id: "1915016273214320641",
        schedule: [
          { days: ["MON"], start_hour: 9, end_hour: 21 },
          { days: ["MON"], start_hour: 18, end_hour: 21, bid_percent: 150 }
        ]
      })
    )

    const hours = lastTimeTargeting().Schedule.Items[0].split(",").map(Number)
    expect(hours[1 + 17]).toBe(100)
    expect(hours[1 + 18]).toBe(150)
  })

  it("переводит булевы флаги в YES/NO, как их ждёт API", async () => {
    await handleSetTimeTargeting(
      setTimeTargetingSchema.parse({ ...weekdaysNineToNine, consider_working_weekends: false })
    )

    expect(lastTimeTargeting().ConsiderWorkingWeekends).toBe("NO")
  })

  it("не отправляет HolidaysSchedule, когда праздники не настраивали", async () => {
    await handleSetTimeTargeting(setTimeTargetingSchema.parse(weekdaysNineToNine))

    expect(lastTimeTargeting().HolidaysSchedule).toBeUndefined()
    expect(lastTimeTargeting().ConsiderWorkingWeekends).toBe("YES")
  })

  it("собирает HolidaysSchedule из праздничных полей", async () => {
    await handleSetTimeTargeting(
      setTimeTargetingSchema.parse({
        ...weekdaysNineToNine,
        suspend_on_holidays: false,
        holiday_bid_percent: 50,
        holiday_start_hour: 10,
        holiday_end_hour: 18
      })
    )

    expect(lastTimeTargeting().HolidaysSchedule).toEqual({
      SuspendOnHolidays: "NO",
      BidPercent: 50,
      StartHour: 10,
      EndHour: 18
    })
  })

  it("отправляет 19-значный ID числом без потери точности", async () => {
    await handleSetTimeTargeting(setTimeTargetingSchema.parse(weekdaysNineToNine))

    expect(lastRawBody()).toContain('"Id":1915016273214320641')
  })

  it("передаёт часовой пояс только когда он задан", async () => {
    await handleSetTimeTargeting(setTimeTargetingSchema.parse(weekdaysNineToNine))
    expect(lastBody().params.Campaigns[0].TimeZone).toBeUndefined()

    await handleSetTimeTargeting(
      setTimeTargetingSchema.parse({ ...weekdaysNineToNine, time_zone: "Asia/Yekaterinburg" })
    )
    expect(lastBody().params.Campaigns[0].TimeZone).toBe("Asia/Yekaterinburg")
  })
})

describe("схема set_time_targeting", () => {
  it("отклоняет интервал, у которого конец не позже начала", () => {
    const result = setTimeTargetingSchema.safeParse({
      campaign_id: "1",
      schedule: [{ days: ["MON"], start_hour: 21, end_hour: 9 }]
    })

    expect(result.success).toBe(false)
  })

  it("отклоняет коэффициент не кратный десяти", () => {
    const result = setTimeTargetingSchema.safeParse({
      campaign_id: "1",
      schedule: [{ days: ["MON"], start_hour: 9, end_hour: 21, bid_percent: 55 }]
    })

    expect(result.success).toBe(false)
  })

  // Директ отклоняет такой запрос сам, но ошибка приходит после вызова —
  // схема сообщает о противоречии до похода в API.
  it("не даёт задать часы праздников вместе с полной остановкой в праздники", () => {
    const result = setTimeTargetingSchema.safeParse({
      campaign_id: "1",
      schedule: [{ days: ["MON"], start_hour: 9, end_hour: 21 }],
      suspend_on_holidays: true,
      holiday_start_hour: 10
    })

    expect(result.success).toBe(false)
  })

  it("не принимает пустое расписание", () => {
    const result = setTimeTargetingSchema.safeParse({ campaign_id: "1", schedule: [] })

    expect(result.success).toBe(false)
  })
})

describe("get_time_targeting", () => {
  beforeEach(() => mockFetch.mockReset())

  it("сворачивает часы в интервалы и переводит дни в буквенные коды", async () => {
    const monday = `1,${[...Array(9).fill(0), ...Array(12).fill(100), ...Array(3).fill(0)].join(",")}`
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          Campaigns: [
            {
              Id: 1,
              Name: "Улов",
              TimeZone: "Europe/Moscow",
              TimeTargeting: { Schedule: { Items: [monday] }, ConsiderWorkingWeekends: "YES" }
            }
          ]
        }
      })
    )

    const output = JSON.parse(await handleGetTimeTargeting({ campaign_id: "1" }))

    expect(output.ConsiderWorkingWeekends).toBe(true)
    expect(output.Schedule[0]).toEqual({
      Day: "MON",
      Around: "9–21",
      Intervals: [{ From: 9, To: 21, BidPercent: 100 }]
    })
  })

  // Правило самого Директа: день, которого нет в ответе, работает круглосуточно.
  it("считает не пришедший день круглосуточным", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          Campaigns: [{ Id: 1, TimeTargeting: { Schedule: { Items: [`1,${Array(24).fill(0).join(",")}`] } } }]
        }
      })
    )

    const output = JSON.parse(await handleGetTimeTargeting({ campaign_id: "1" }))

    expect(output.Schedule[0].Around).toBe("показов нет")
    expect(output.Schedule[6].Around).toBe("круглосуточно")
  })

  it("предупреждает, когда расписание не задано вовсе", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 1, Name: "Улов" }] } }))

    const output = await handleGetTimeTargeting({ campaign_id: "1" })

    expect(output).toContain("Расписание не задано")
  })

  it("запрашивает поля TimeZone и TimeTargeting", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Campaigns: [] } }))

    await handleGetTimeTargeting({ campaign_id: "1" })

    expect(lastBody().params.FieldNames).toContain("TimeTargeting")
    expect(lastBody().params.FieldNames).toContain("TimeZone")
  })
})
