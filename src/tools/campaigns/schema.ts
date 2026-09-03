// Контракт инструментов кампаний. Здесь же граница snake_case → camelCase
// и конвертация рублей в микроединицы: хендлер получает готовые значения.
import { z } from "zod"
import {
  CAMPAIGN_ACTIONS,
  CAMPAIGN_STATUS_ACTIONS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  CAMPAIGN_TYPES_CREATABLE,
  NETWORK_STRATEGIES,
  SEARCH_STRATEGIES,
  SETTABLE_NETWORK_STRATEGIES,
  SETTABLE_SEARCH_STRATEGIES
} from "#shared/config/enums"
import { idField } from "#shared/lib/id"
import { rublesField } from "#shared/lib/money"
import { pageFields } from "#shared/lib/pagination"

export const listCampaignsSchema = z.object({
  status: z.literal(CAMPAIGN_STATUSES).optional().meta({ description: "Фильтр по статусу модерации кампании" }),
  types: z.array(z.literal(CAMPAIGN_TYPES)).optional().meta({ description: "Фильтр по типам кампаний" }),
  ...pageFields
})

export const getCampaignSchema = z.object({
  campaign_id: idField("ID рекламной кампании, десятичная строка")
})

export const createCampaignSchema = z.object({
  name: z.string().min(1, { error: "Название не может быть пустым" }).meta({ description: "Название кампании" }),
  type: z
    .literal(CAMPAIGN_TYPES_CREATABLE)
    .default("TEXT_CAMPAIGN")
    .meta({ description: "Тип кампании: текстово-графическая или динамические объявления" }),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Формат даты YYYY-MM-DD" })
    .meta({ description: "Дата начала показов, YYYY-MM-DD" }),
  daily_budget: rublesField("Дневной бюджет в рублях, например 1000 — это 1000 ₽").optional(),
  search_strategy: z
    .literal(SEARCH_STRATEGIES)
    .default("HIGHEST_POSITION")
    .meta({ description: "Стратегия показов на поиске; SERVING_OFF отключает показы на поиске" }),
  network_strategy: z
    .literal(NETWORK_STRATEGIES)
    .default("SERVING_OFF")
    .meta({ description: "Стратегия показов в сетях (РСЯ); SERVING_OFF отключает показы в сетях" }),
  // Не литерал: в WSDL это xsd:string, закрытого списка нет — значения живут
  // в справочнике TimeZones, его отдаёт list_time_zones.
  time_zone: z
    .string()
    .check(z.minLength(1, { error: "Часовой пояс не может быть пустым" }))
    .optional()
    .meta({
      description:
        "Часовой пояс показов, например Europe/Moscow (по умолчанию). Список — в справочнике list_time_zones; на даты отчётов не влияет, они всегда по Москве"
    })
})

export const updateCampaignSchema = z.object({
  campaign_id: idField("ID кампании, десятичная строка"),
  name: z
    .string()
    .min(1, { error: "Название не может быть пустым" })
    .optional()
    .meta({ description: "Новое название" }),
  daily_budget: rublesField("Новый дневной бюджет в рублях").optional(),
  status: z
    .literal(CAMPAIGN_STATUS_ACTIONS)
    .optional()
    .meta({ description: "Действие со статусом показов: SUSPEND (остановить), RESUME, ARCHIVE, UNARCHIVE" })
})

export const manageCampaignsSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании, десятичная строка"))
    .min(1, { error: "Список кампаний пуст" })
    .max(1000, { error: "За один вызов допустимо не больше 1000 кампаний" })
    .meta({ description: "ID кампаний, над которыми выполняется действие" }),
  action: z.literal(CAMPAIGN_ACTIONS).meta({ description: "Действие: suspend, resume, archive, unarchive" })
})

export const getStrategySchema = z.object({
  campaign_id: idField("ID текстово-графической кампании")
})

// Набор уже, чем SEARCH_STRATEGIES: хендлер умеет собрать настройки только этих трёх.
// Расширение — задача P1 из roadmap, а не побочный эффект перекладки.
export const setStrategySchema = z.object({
  campaign_id: idField("ID текстово-графической кампании"),
  search_type: z
    .literal(SETTABLE_SEARCH_STRATEGIES)
    .meta({ description: "Стратегия на поиске: ручная, максимум кликов или показы отключены" }),
  network_type: z
    .literal(SETTABLE_NETWORK_STRATEGIES)
    .meta({ description: "Стратегия в сетях: по умолчанию, максимум кликов или показы отключены" }),
  weekly_spend_limit: rublesField("Недельный бюджет в рублях; обязателен для WB_MAXIMUM_CLICKS").optional(),
  bid_ceiling: rublesField("Максимальная ставка в рублях для WB_MAXIMUM_CLICKS").optional(),
  network_limit_percent: z
    .number()
    .int()
    .min(1, { error: "Доля расходов не меньше 1%" })
    .max(100, { error: "Доля расходов не больше 100%" })
    .optional()
    .meta({ description: "Доля расходов в сетях для NETWORK_DEFAULT, проценты" })
})
