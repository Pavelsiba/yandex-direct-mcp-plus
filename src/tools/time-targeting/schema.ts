import { z } from "zod"
import { WEEKDAYS } from "#shared/config/enums"
import { HOLIDAY_BID_RANGE, HOURLY_BID_RANGE } from "#shared/config/limits"
import { idField } from "#shared/lib/id"

export const getTimeTargetingSchema = z.object({
  campaign_id: idField("ID кампании, десятичная строка")
})

// Час — это z.int(), а не z.number().int(): в zod v4 целое есть отдельным типом,
// и границы задаются проверками, а не цепочкой методов v3.
const startHour = (description: string) =>
  z
    .int()
    .check(z.gte(0, { error: "Час начала не меньше 0" }), z.lte(23, { error: "Час начала не больше 23" }))
    .meta({ description })

const endHour = (description: string) =>
  z
    .int()
    .check(z.gte(1, { error: "Час окончания не меньше 1" }), z.lte(24, { error: "Час окончания не больше 24" }))
    .meta({ description })

const bidPercent = (range: typeof HOURLY_BID_RANGE | typeof HOLIDAY_BID_RANGE, description: string) =>
  z
    .int()
    .check(
      z.gte(range.min, { error: `Коэффициент не меньше ${range.min}%` }),
      z.lte(range.max, { error: `Коэффициент не больше ${range.max}%` }),
      z.multipleOf(range.step, { error: `Коэффициент кратен ${range.step}` })
    )
    .meta({ description })

// Наружу расписание задаётся правилами «дни + интервал часов + коэффициент», а не
// строками из 25 чисел, как в API: собрать такую строку модель обязана без ошибок,
// а проверить её глазами нельзя. Компиляцию правил в строки делает хендлер.
const scheduleRule = z
  .object({
    days: z
      .array(z.literal(WEEKDAYS))
      .check(z.minLength(1, { error: "Укажите хотя бы один день недели" }))
      .meta({ description: "Дни недели, на которые распространяется правило: MON, TUE, WED, THU, FRI, SAT, SUN" }),
    start_hour: startHour("Час начала показов включительно, 0–23"),
    end_hour: endHour("Час окончания показов, не включая его: end_hour=21 — показы идут до 20:59. 1–24"),
    bid_percent: bidPercent(
      HOURLY_BID_RANGE,
      `Коэффициент к ставке в эти часы, % от текущей: ${HOURLY_BID_RANGE.min}–${HOURLY_BID_RANGE.max} с шагом ${HOURLY_BID_RANGE.step}, 100 — без изменений`
    ).default(100)
  })
  .refine((rule) => rule.end_hour > rule.start_hour, {
    error: "end_hour должен быть больше start_hour: интервал 9–21 — это start_hour=9, end_hour=21"
  })

export const setTimeTargetingSchema = z
  .object({
    campaign_id: idField("ID кампании, десятичная строка"),
    schedule: z
      .array(scheduleRule)
      .check(z.minLength(1, { error: "Расписание пустое: без единого правила показов не будет вовсе" }))
      .meta({
        description:
          "Правила показов. Часы, не покрытые ни одним правилом, показов не получают — расписание задаётся целиком, а не дополняется. Правила применяются по порядку, последнее переопределяет предыдущие"
      }),
    consider_working_weekends: z.boolean().default(true).meta({
      description:
        "Показывать ли в рабочие выходные по расписанию переносимого буднего дня; false — по расписанию выходного"
    }),
    suspend_on_holidays: z.boolean().optional().meta({
      description:
        "true — в праздники показов нет; false — идут по правилам holiday_*. Не задан — праздники отдельно не настраиваются"
    }),
    holiday_bid_percent: bidPercent(
      HOLIDAY_BID_RANGE,
      `Коэффициент к ставке в праздники, % от текущей: ${HOLIDAY_BID_RANGE.min}–${HOLIDAY_BID_RANGE.max} с шагом ${HOLIDAY_BID_RANGE.step}. Ноль запрещён — показы отключает suspend_on_holidays`
    ).optional(),
    holiday_start_hour: startHour("Час начала показов в праздники включительно, 0–23").optional(),
    holiday_end_hour: endHour("Час окончания показов в праздники, не включая его, 1–24").optional(),
    time_zone: z
      .string()
      .check(z.minLength(1, { error: "Часовой пояс не может быть пустым" }))
      .optional()
      .meta({
        description:
          "Часовой пояс кампании, например Europe/Moscow. Допустимые значения — в справочнике list_time_zones. Не задан — остаётся прежним"
      })
  })
  // Директ отклоняет часы и коэффициент праздников при SuspendOnHolidays=YES.
  // Ловим это схемой: иначе модель отправит взаимоисключающие настройки и получит
  // ошибку API вместо подсказки.
  .refine(
    (params) =>
      params.suspend_on_holidays !== true ||
      (params.holiday_bid_percent === undefined &&
        params.holiday_start_hour === undefined &&
        params.holiday_end_hour === undefined),
    { error: "При suspend_on_holidays=true часы и коэффициент праздников задавать нельзя: показов не будет вовсе" }
  )
  .refine(
    (params) =>
      params.holiday_start_hour === undefined ||
      params.holiday_end_hour === undefined ||
      params.holiday_end_hour > params.holiday_start_hour,
    { error: "holiday_end_hour должен быть больше holiday_start_hour" }
  )
