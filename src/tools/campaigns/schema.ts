// Контракт инструментов кампаний; рубли в микроединицы переводит схема, не хендлер.
import { z } from "zod"
import { API_FIELDS, type FieldOf } from "#shared/config/api-fields"
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
import { MAX_CAMPAIGNS_PER_CALL, MAX_PRIORITY_GOALS } from "#shared/config/limits"
import { dateField } from "#shared/lib/date"
import { fieldsField } from "#shared/lib/fields"
import { idField } from "#shared/lib/id"
import { rublesField } from "#shared/lib/money"
import { pageFields } from "#shared/lib/pagination"

// Узкий набор: кампании идут списком десятками. StatusClarification — единственное место,
// где Директ объясняет, почему кампания отклонена или остановлена.
export const CAMPAIGN_LIST_FIELDS: FieldOf<"campaigns", "CampaignFieldEnum">[] = [
  "Id",
  "Name",
  "Status",
  "StatusClarification",
  "State",
  "DailyBudget",
  "StartDate",
  "Type",
  "Statistics"
]

export const listCampaignsSchema = z.object({
  status: z.literal(CAMPAIGN_STATUSES).optional().meta({ description: "Фильтр по статусу модерации кампании" }),
  types: z.array(z.literal(CAMPAIGN_TYPES)).optional().meta({ description: "Фильтр по типам кампаний" }),
  fields: fieldsField(API_FIELDS.campaigns.CampaignFieldEnum, CAMPAIGN_LIST_FIELDS),
  ...pageFields
})

export const getCampaignSchema = z.object({
  campaign_id: idField("ID рекламной кампании, десятичная строка")
})

// Только непустота: разбор на «ключ=значение» отверг бы подстановки Директа ({keyword} и прочие).
const trackingParamsField = () =>
  z
    .string()
    .check(z.minLength(1, { error: "Разметка не может быть пустой строкой — чтобы снять её, передайте null" }))
    .nullable()
    .optional()
    .meta({
      description:
        "UTM-разметка, дописывается к ссылкам всех объявлений кампании. Без ведущего «?»: utm_source=yandex&utm_campaign={campaign_id}. Допустимы подстановки Директа в фигурных скобках. null снимает разметку"
    })

export const createCampaignSchema = z.object({
  name: z
    .string()
    .check(z.minLength(1, { error: "Название не может быть пустым" }))
    .meta({ description: "Название кампании" }),
  type: z.literal(CAMPAIGN_TYPES_CREATABLE).default("TEXT_CAMPAIGN").meta({
    description:
      "Тип кампании. Через API создаётся только текстово-графическая: смарт-баннеры и динамические объявления Директ через API не создаёт"
  }),
  start_date: dateField("Дата начала показов, YYYY-MM-DD"),
  daily_budget: rublesField("Дневной бюджет в рублях, например 1000 — это 1000 ₽").optional(),
  search_strategy: z
    .literal(SEARCH_STRATEGIES)
    .default("HIGHEST_POSITION")
    .meta({ description: "Стратегия показов на поиске; SERVING_OFF отключает показы на поиске" }),
  network_strategy: z
    .literal(NETWORK_STRATEGIES)
    .default("SERVING_OFF")
    .meta({ description: "Стратегия показов в сетях (РСЯ); SERVING_OFF отключает показы в сетях" }),
  // Не литерал: закрытого списка нет, значения — в справочнике TimeZones.
  time_zone: z
    .string()
    .check(z.minLength(1, { error: "Часовой пояс не может быть пустым" }))
    .optional()
    .meta({
      description:
        "Часовой пояс показов, например Europe/Moscow (по умолчанию). Список — в справочнике list_time_zones; на даты отчётов не влияет, они всегда по Москве"
    }),
  tracking_params: trackingParamsField()
})

export const updateCampaignSchema = z.object({
  campaign_id: idField("ID кампании, десятичная строка"),
  name: z
    .string()
    .check(z.minLength(1, { error: "Название не может быть пустым" }))
    .optional()
    .meta({ description: "Новое название" }),
  daily_budget: rublesField("Новый дневной бюджет в рублях").optional(),
  status: z
    .literal(CAMPAIGN_STATUS_ACTIONS)
    .optional()
    .meta({ description: "Действие со статусом показов: SUSPEND (остановить), RESUME, ARCHIVE, UNARCHIVE" }),
  tracking_params: trackingParamsField()
})

export const manageCampaignsSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании, десятичная строка"))
    .check(
      z.minLength(1, { error: "Список кампаний пуст" }),
      z.maxLength(MAX_CAMPAIGNS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_CAMPAIGNS_PER_CALL} кампаний`
      })
    )
    .meta({ description: "ID кампаний, над которыми выполняется действие" }),
  action: z.literal(CAMPAIGN_ACTIONS).meta({
    description: "Действие: suspend, resume, archive, unarchive или delete (необратимо)"
  })
})

export const getStrategySchema = z.object({
  campaign_id: idField("ID текстово-графической кампании")
})

// Настройки общие на обе стороны: автостратегия стоит только на одной, вторая — NETWORK_DEFAULT
// или SERVING_OFF.
export const setStrategySchema = z.object({
  campaign_id: idField("ID текстово-графической кампании"),
  search_type: z.literal(SETTABLE_SEARCH_STRATEGIES).meta({
    description:
      "Стратегия на поиске: HIGHEST_POSITION (ручная), WB_MAXIMUM_CLICKS, WB_MAXIMUM_CONVERSION_RATE (максимум конверсий за недельный бюджет), AVERAGE_CPC, AVERAGE_CPA, PAY_FOR_CONVERSION или SERVING_OFF"
  }),
  network_type: z.literal(SETTABLE_NETWORK_STRATEGIES).meta({
    description:
      "Стратегия в сетях: NETWORK_DEFAULT (по настройкам поиска), MAXIMUM_COVERAGE, WB_MAXIMUM_CLICKS, WB_MAXIMUM_CONVERSION_RATE, AVERAGE_CPC, AVERAGE_CPA, PAY_FOR_CONVERSION или SERVING_OFF"
  }),
  weekly_spend_limit: rublesField(
    "Недельный бюджет в рублях; обязателен для WB_MAXIMUM_CLICKS и WB_MAXIMUM_CONVERSION_RATE, для остальных автостратегий необязателен"
  ).optional(),
  bid_ceiling: rublesField(
    "Максимальная ставка в рублях для WB_MAXIMUM_CLICKS, WB_MAXIMUM_CONVERSION_RATE и AVERAGE_CPA"
  ).optional(),
  average_cpc: rublesField("Средняя цена клика в рублях; обязательна для AVERAGE_CPC").optional(),
  average_cpa: rublesField("Средняя цена конверсии в рублях; обязательна для AVERAGE_CPA").optional(),
  conversion_price: rublesField(
    "Цена конверсии в рублях для PAY_FOR_CONVERSION: списывается за конверсию, а не за клик"
  ).optional(),
  goal_id: idField(
    "ID цели Метрики для AVERAGE_CPA, PAY_FOR_CONVERSION и WB_MAXIMUM_CONVERSION_RATE; для оплаты за конверсию обязателен. " +
      "Для WB_MAXIMUM_CONVERSION_RATE допустимо служебное 13 — оптимизация по ключевым целям кампании (PriorityGoals); " +
      "Директ принимает его, только если в PriorityGoals есть цель, кроме 12 «Вовлечённые сессии»; сами цели задаёт set_priority_goals"
  ).optional(),
  network_limit_percent: z
    .int()
    .check(z.gte(1, { error: "Доля расходов не меньше 1%" }), z.lte(100, { error: "Доля расходов не больше 100%" }))
    .optional()
    .meta({ description: "Доля расходов в сетях для NETWORK_DEFAULT, проценты" })
})

// Цели перезаписываются целиком, поэтому mode обязателен: replace на просьбе «добавь цель»
// молча стёр бы остальные. Ценность необязательна ради remove, для add и replace её требует хендлер.
const priorityGoal = z.object({
  goal_id: idField("ID цели Метрики; служебное 12 — «Вовлечённые сессии». Названия целей есть только в Метрике"),
  value: rublesField(
    "Ценность конверсии по цели в рублях; обязательна при mode=add и replace, при remove не нужна"
  ).optional()
})

export const setPriorityGoalsSchema = z.object({
  campaign_id: idField("ID кампании: текстово-графической, динамической, смарт или единой перфоманс-кампании"),
  goals: z
    .array(priorityGoal)
    .check(z.maxLength(MAX_PRIORITY_GOALS, { error: `У кампании не больше ${MAX_PRIORITY_GOALS} целей стратегии` }))
    .meta({
      description:
        "Цели: при mode=replace — полный новый список взамен прежнего (пустой массив очищает), при add — что добавить или чью ценность поменять, при remove — что убрать"
    }),
  mode: z.literal(["replace", "add", "remove"]).meta({
    description:
      "Обязателен. replace — заменить список целиком (прежние цели теряются), add — добавить цели или поменять ценность уже заданных, remove — убрать перечисленные. Текущий список сервер читает сам, это дополнительный вызов API"
  })
})
