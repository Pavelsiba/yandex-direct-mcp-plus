// Сценарии кампаний. Деньги сюда приезжают уже в микроединицах (конвертирует схема),
// ошибки разбирает shared/api — здесь только последовательность вызовов.
import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import type { FieldOf } from "#shared/config/api-fields"
import { type CampaignSettingsKey, getCampaignSettingsKey } from "#shared/lib/campaign-type"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type {
  createCampaignSchema,
  getCampaignSchema,
  getStrategySchema,
  listCampaignsSchema,
  manageCampaignsSchema,
  setStrategySchema,
  updateCampaignSchema
} from "./schema.js"
import { CAMPAIGN_LIST_FIELDS } from "./schema.js"

// Набор по умолчанию объявлен в контракте: его перечисляет описание параметра fields.
const DETAIL_FIELDS: FieldOf<"campaigns", "CampaignFieldEnum">[] = [...CAMPAIGN_LIST_FIELDS, "EndDate"]

// Цели, счётчики и модель атрибуции лежат не в BiddingStrategy, а рядом с ней: у кампании
// на максимум конверсий в стратегии стоит служебный GoalId 13 («ключевые цели»), и без
// PriorityGoals кампания выглядит как «цель не настроена».
//
// Пересечение трёх перечислений — это ровно «поле, которое есть у всех трёх типов»: TS
// сводит пересечение строковых объединений к общим членам. Смарт-кампании стоят отдельно,
// потому что счётчик у них называется CounterId, в единственном числе, и общий набор им
// не подходит: пробой 13.09.2026 множественное отбито ошибкой 8000. Теперь то же самое
// отбивает компилятор.
type SettingsField = FieldOf<"campaigns", "TextCampaignFieldEnum"> &
  FieldOf<"campaigns", "DynamicTextCampaignFieldEnum"> &
  FieldOf<"campaigns", "UnifiedCampaignFieldEnum">

const SETTINGS_FIELDS: SettingsField[] = [
  "TrackingParams",
  "PriorityGoals",
  "CounterIds",
  "AttributionModel",
  "Settings"
]
const SMART_SETTINGS_FIELDS: FieldOf<"campaigns", "SmartCampaignFieldEnum">[] = [
  "TrackingParams",
  "PriorityGoals",
  "CounterId",
  "AttributionModel",
  "Settings"
]

// TrackingParams поддерживают не все типы: сверено с WSDL campaigns 05.09.2026 — поле есть
// в Text, DynamicText, Smart и Unified, но не в MobileApp и не в CpmBanner. Набор не тот
// же, что у общих наборов минус-фраз, поэтому список свой, а не общий.
const TRACKING_PARAMS_TYPES = ["TEXT_CAMPAIGN", "DYNAMIC_TEXT_CAMPAIGN", "SMART_CAMPAIGN", "UNIFIED_CAMPAIGN"]

async function readTrackingParamsKey(campaignId: string): Promise<CampaignSettingsKey> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [apiId(campaignId)] },
    FieldNames: ["Id", "Type"] satisfies FieldOf<"campaigns", "CampaignFieldEnum">[]
  })

  const campaign = (data as { result?: { Campaigns?: { Type?: string }[] } }).result?.Campaigns?.[0]
  if (!campaign) throw new Error(`Кампания ${campaignId} не найдена или недоступна.`)

  const type = campaign.Type
  const settingsKey = type && TRACKING_PARAMS_TYPES.includes(type) ? getCampaignSettingsKey(type) : undefined
  if (!settingsKey) {
    throw new Error(
      `Кампания ${campaignId} имеет тип ${type ?? "неизвестный"}, а UTM-разметку поддерживают только ${TRACKING_PARAMS_TYPES.join(", ")}.`
    )
  }

  return settingsKey
}

// Действие со статусом — отдельный метод API, а не поле update.
const STATUS_METHODS: Record<string, string> = {
  SUSPEND: "suspend",
  RESUME: "resume",
  ARCHIVE: "archive",
  UNARCHIVE: "unarchive"
}

export async function handleListCampaigns(params: z.infer<typeof listCampaignsSchema>): Promise<string> {
  const selectionCriteria: Record<string, unknown> = {}
  if (params.status) selectionCriteria.Statuses = [params.status]
  if (params.types) selectionCriteria.Types = params.types

  const requestParams: Record<string, unknown> = {
    SelectionCriteria: selectionCriteria,
    FieldNames: params.fields ?? CAMPAIGN_LIST_FIELDS
  }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  return formatResult(await apiPost("campaigns", "get", requestParams))
}

// Настройки кампании лежат внутри объекта, имя которого зависит от типа, поэтому в общий
// FieldNames не попадают — их запрашивают отдельным type-specific параметром. Заранее тип
// неизвестен, но лишние *CampaignFieldNames безвредны: Директ наполняет тот объект, который
// соответствует реальному типу кампании, а остальные просто не возвращает.
export async function handleGetCampaign(params: z.infer<typeof getCampaignSchema>): Promise<string> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [apiId(params.campaign_id)] },
    FieldNames: DETAIL_FIELDS,
    TextCampaignFieldNames: SETTINGS_FIELDS,
    DynamicTextCampaignFieldNames: SETTINGS_FIELDS,
    SmartCampaignFieldNames: SMART_SETTINGS_FIELDS,
    UnifiedCampaignFieldNames: SETTINGS_FIELDS
  })
  return formatResult(data)
}

export async function handleCreateCampaign(params: z.infer<typeof createCampaignSchema>): Promise<string> {
  const campaign: Record<string, unknown> = { Name: params.name, StartDate: params.start_date }
  if (params.daily_budget !== undefined) {
    campaign.DailyBudget = { Amount: params.daily_budget, Mode: "STANDARD" }
  }
  if (params.time_zone !== undefined) campaign.TimeZone = params.time_zone

  const biddingStrategy = {
    Search: { BiddingStrategyType: params.search_strategy },
    Network: { BiddingStrategyType: params.network_strategy }
  }
  // TrackingParams живёт в том же объекте настроек, что и стратегия, поэтому собирается
  // вместе с ним. На создании тип известен из параметров, читать его неоткуда и не нужно.
  const settings: Record<string, unknown> = { BiddingStrategy: biddingStrategy }
  if (params.tracking_params !== undefined) settings.TrackingParams = params.tracking_params

  if (params.type === "DYNAMIC_TEXT_CAMPAIGN") {
    campaign.DynamicTextCampaign = settings
  } else {
    campaign.TextCampaign = settings
  }

  return formatResult(await apiPost("campaigns", "add", { Campaigns: [campaign] }))
}

// Действие со статусом и правка полей — два разных вызова API. Выполняются оба,
// если заданы оба: иначе при наличии status поля name/daily_budget молча терялись бы.
// Каждый ответ форматируется отдельно, чтобы per-item ошибки не потерялись.
export async function handleUpdateCampaign(params: z.infer<typeof updateCampaignSchema>): Promise<string> {
  const sections: string[] = []

  if (params.status) {
    const method = STATUS_METHODS[params.status]
    const data = await apiPost("campaigns", method, { SelectionCriteria: { Ids: [apiId(params.campaign_id)] } })
    sections.push(formatResult(data))
  }

  const changesSettings = params.tracking_params !== undefined
  if (params.name !== undefined || params.daily_budget !== undefined || changesSettings) {
    const campaign: Record<string, unknown> = { Id: apiId(params.campaign_id) }
    if (params.name !== undefined) campaign.Name = params.name
    if (params.daily_budget !== undefined) {
      campaign.DailyBudget = { Amount: params.daily_budget, Mode: "STANDARD" }
    }
    // Имя объекта настроек зависит от типа кампании, а в запросе тип не передаётся —
    // приходится прочитать. Лишний вызов только там, где разметка правда меняется.
    if (changesSettings) {
      const settingsKey = await readTrackingParamsKey(params.campaign_id)
      campaign[settingsKey] = { TrackingParams: params.tracking_params }
    }

    sections.push(formatResult(await apiPost("campaigns", "update", { Campaigns: [campaign] })))
  }

  if (sections.length === 0) {
    throw new Error("Нечего обновлять: укажите status и/или name/daily_budget/tracking_params.")
  }
  return sections.join("\n\n")
}

export async function handleManageCampaigns(params: z.infer<typeof manageCampaignsSchema>): Promise<string> {
  const data = await apiPost("campaigns", params.action, {
    SelectionCriteria: { Ids: apiIds(params.campaign_ids) }
  })
  return formatResult(data)
}

// PriorityGoals — не украшение, а вторая половина стратегии: в BiddingStrategy у
// максимума конверсий стоит служебный GoalId 13 — «оптимизировать по ключевым целям», а
// сами цели с их ценностью лежат здесь. Без этого поля ответ читается как «цель не
// выбрана» (проба 12.09.2026).
const STRATEGY_FIELDS: FieldOf<"campaigns", "TextCampaignFieldEnum">[] = [
  "BiddingStrategy",
  "PriorityGoals",
  "CounterIds",
  "AttributionModel"
]

// Стратегия — часть кампании: читается тем же get, пишется тем же update.
export async function handleGetStrategy(params: z.infer<typeof getStrategySchema>): Promise<string> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [apiId(params.campaign_id)] },
    FieldNames: ["Id", "Name", "Type"] satisfies FieldOf<"campaigns", "CampaignFieldEnum">[],
    TextCampaignFieldNames: STRATEGY_FIELDS
  })
  return formatResult(data)
}

type StrategyParams = z.infer<typeof setStrategySchema>
type StrategyType = StrategyParams["search_type"] | StrategyParams["network_type"]

// Цену стратегии, без которой она не имеет смысла, требуем сами: Директ вернул бы
// ту же ошибку, но после запроса и на своём языке.
function required(value: number | undefined, field: string, type: StrategyType): number {
  if (value === undefined) throw new Error(`${field} обязателен для стратегии ${type}.`)
  return value
}

// Необязательные поля добавляются только когда заданы: пустое поле в запросе Директ
// трактует как «сбросить», а не «оставить как есть».
function withOptional(settings: Record<string, unknown>, params: StrategyParams): Record<string, unknown> {
  if (params.weekly_spend_limit !== undefined) settings.WeeklySpendLimit = params.weekly_spend_limit
  if (params.goal_id !== undefined) settings.GoalId = apiId(params.goal_id)
  return settings
}

// Настройки лежат не рядом с типом, а во вложенном объекте, названном по стратегии:
// имя объекта и есть переключатель, а BiddingStrategyType только дублирует его.
function strategySettings(type: StrategyType, params: StrategyParams): Record<string, unknown> | undefined {
  switch (type) {
    case "WB_MAXIMUM_CLICKS": {
      const settings: Record<string, unknown> = {
        WeeklySpendLimit: required(params.weekly_spend_limit, "weekly_spend_limit", type)
      }
      if (params.bid_ceiling !== undefined) settings.BidCeiling = params.bid_ceiling
      return { WbMaximumClicks: settings }
    }

    // Максимум конверсий за недельный бюджет. GoalId здесь — либо цель Метрики, либо
    // служебное 13 «ключевые цели»: оптимизация по PriorityGoals, допустимая, если там есть
    // цель кроме 12 «Вовлечённые сессии» (справочник campaigns/update, StrategyMaximumConversionRate).
    // Проба 12.09.2026 видела 13 у кампании с заполненными PriorityGoals.
    case "WB_MAXIMUM_CONVERSION_RATE": {
      const settings = withOptional(
        { WeeklySpendLimit: required(params.weekly_spend_limit, "weekly_spend_limit", type) },
        params
      )
      if (params.bid_ceiling !== undefined) settings.BidCeiling = params.bid_ceiling
      return { WbMaximumConversionRate: settings }
    }

    case "AVERAGE_CPC":
      return { AverageCpc: withOptional({ AverageCpc: required(params.average_cpc, "average_cpc", type) }, params) }

    case "AVERAGE_CPA": {
      const settings = withOptional({ AverageCpa: required(params.average_cpa, "average_cpa", type) }, params)
      if (params.bid_ceiling !== undefined) settings.BidCeiling = params.bid_ceiling
      return { AverageCpa: settings }
    }

    // Cpa, а не AverageCpa: у оплаты за конверсию это фиксированная цена конверсии.
    case "PAY_FOR_CONVERSION":
      return {
        PayForConversion: withOptional({ Cpa: required(params.conversion_price, "conversion_price", type) }, params)
      }

    case "NETWORK_DEFAULT":
      return {
        NetworkDefault: params.network_limit_percent === undefined ? {} : { LimitPercent: params.network_limit_percent }
      }

    // HIGHEST_POSITION, MAXIMUM_COVERAGE и SERVING_OFF настроек не имеют:
    // в TextCampaignStrategyBase структуры под них нет вовсе.
    default:
      return undefined
  }
}

function strategyPart(type: StrategyType, params: StrategyParams): Record<string, unknown> {
  return { BiddingStrategyType: type, ...strategySettings(type, params) }
}

export async function handleSetStrategy(params: StrategyParams): Promise<string> {
  const data = await apiPost("campaigns", "update", {
    Campaigns: [
      {
        Id: apiId(params.campaign_id),
        TextCampaign: {
          BiddingStrategy: {
            Search: strategyPart(params.search_type, params),
            Network: strategyPart(params.network_type, params)
          }
        }
      }
    ]
  })
  return formatResult(data)
}
