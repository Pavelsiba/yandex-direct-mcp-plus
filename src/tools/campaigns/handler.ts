// Сценарии кампаний: деньги приезжают уже в микроединицах, ошибки разбирает shared/api.
import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import type { FieldOf } from "#shared/config/api-fields"
import { MAX_PRIORITY_GOALS } from "#shared/config/limits"
import { type CampaignSettingsKey, getCampaignSettingsKey } from "#shared/lib/campaign-type"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import { mergePriorityGoals, type PriorityGoal } from "./priority-goals.js"
import type {
  createCampaignSchema,
  getCampaignSchema,
  getStrategySchema,
  listCampaignsSchema,
  manageCampaignsSchema,
  setPriorityGoalsSchema,
  setStrategySchema,
  updateCampaignSchema
} from "./schema.js"
import { CAMPAIGN_LIST_FIELDS } from "./schema.js"

const DETAIL_FIELDS: FieldOf<"campaigns", "CampaignFieldEnum">[] = [...CAMPAIGN_LIST_FIELDS, "EndDate"]

// Пересечение — поля, общие для трёх типов. Смарт отдельно: счётчик у него CounterId,
// в единственном числе, CounterIds Директ отбивает ошибкой 8000.
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

// По WSDL: у MobileApp и CpmBanner поля TrackingParams нет.
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

// Тип заранее неизвестен, поэтому настройки просятся для всех типов: лишние
// *CampaignFieldNames безвредны, Директ заполняет только объект реального типа.
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
  const settings: Record<string, unknown> = { BiddingStrategy: biddingStrategy }
  if (params.tracking_params !== undefined) settings.TrackingParams = params.tracking_params

  campaign.TextCampaign = settings

  return formatResult(await apiPost("campaigns", "add", { Campaigns: [campaign] }))
}

// Статус и поля — два разных метода API; при заданных обоих выполняются оба, иначе
// правка полей молча терялась бы.
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
    // Имя объекта настроек зависит от типа, а тип в запросе не передаётся — читаем.
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

// PriorityGoals — вторая половина стратегии: при GoalId 13 («ключевые цели») сами цели
// лежат здесь, и без поля стратегия читается как «цель не выбрана».
const STRATEGY_FIELDS: FieldOf<"campaigns", "TextCampaignFieldEnum">[] = [
  "BiddingStrategy",
  "PriorityGoals",
  "CounterIds",
  "AttributionModel"
]

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

function required(value: number | undefined, field: string, type: StrategyType): number {
  if (value === undefined) throw new Error(`${field} обязателен для стратегии ${type}.`)
  return value
}

// Пустое поле Директ трактует как «сбросить», поэтому незаданные не отправляются.
function withOptional(settings: Record<string, unknown>, params: StrategyParams): Record<string, unknown> {
  if (params.weekly_spend_limit !== undefined) settings.WeeklySpendLimit = params.weekly_spend_limit
  if (params.goal_id !== undefined) settings.GoalId = apiId(params.goal_id)
  return settings
}

// Настройки лежат в объекте, названном по стратегии; BiddingStrategyType его лишь дублирует.
function strategySettings(type: StrategyType, params: StrategyParams): Record<string, unknown> | undefined {
  switch (type) {
    case "WB_MAXIMUM_CLICKS": {
      const settings: Record<string, unknown> = {
        WeeklySpendLimit: required(params.weekly_spend_limit, "weekly_spend_limit", type)
      }
      if (params.bid_ceiling !== undefined) settings.BidCeiling = params.bid_ceiling
      return { WbMaximumClicks: settings }
    }

    // GoalId — цель Метрики или служебное 13: оптимизация по PriorityGoals, где должна быть
    // цель кроме 12 «Вовлечённые сессии».
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

    // У HIGHEST_POSITION, MAXIMUM_COVERAGE и SERVING_OFF структуры настроек нет.
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

// По WSDL: у MobileApp и CpmBanner поля PriorityGoals нет.
const PRIORITY_GOALS_TYPES = ["TEXT_CAMPAIGN", "DYNAMIC_TEXT_CAMPAIGN", "SMART_CAMPAIGN", "UNIFIED_CAMPAIGN"]

const PRIORITY_GOALS_FIELDS: (SettingsField & FieldOf<"campaigns", "SmartCampaignFieldEnum">)[] = ["PriorityGoals"]

type ApiPriorityGoal = { GoalId: number | string; Value: number; IsMetrikaSourceOfValue?: string }
type CampaignGoals = { Type?: string } & Partial<
  Record<CampaignSettingsKey, { PriorityGoals?: { Items?: ApiPriorityGoal[] } | null }>
>

// Читается и при replace: там не с чем сливать, но нужен тип — от него имя объекта настроек.
async function readPriorityGoals(
  campaignId: string
): Promise<{ settingsKey: CampaignSettingsKey; goals: PriorityGoal[] }> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [apiId(campaignId)] },
    FieldNames: ["Id", "Type"] satisfies FieldOf<"campaigns", "CampaignFieldEnum">[],
    TextCampaignFieldNames: PRIORITY_GOALS_FIELDS,
    DynamicTextCampaignFieldNames: PRIORITY_GOALS_FIELDS,
    SmartCampaignFieldNames: PRIORITY_GOALS_FIELDS,
    UnifiedCampaignFieldNames: PRIORITY_GOALS_FIELDS
  })

  const campaign = (data as { result?: { Campaigns?: CampaignGoals[] } }).result?.Campaigns?.[0]
  if (!campaign) throw new Error(`Кампания ${campaignId} не найдена или недоступна — объединять цели не с чем.`)

  const { Type: type } = campaign
  const settingsKey = type && PRIORITY_GOALS_TYPES.includes(type) ? getCampaignSettingsKey(type) : undefined
  if (!settingsKey) {
    throw new Error(
      `Кампания ${campaignId} имеет тип ${type ?? "неизвестный"}, а цели стратегии поддерживают только ${PRIORITY_GOALS_TYPES.join(", ")}.`
    )
  }

  const items = campaign[settingsKey]?.PriorityGoals?.Items ?? []
  const goals = items.map((item) => ({
    goalId: String(item.GoalId),
    value: item.Value,
    isMetrikaSourceOfValue: item.IsMetrikaSourceOfValue
  }))
  return { settingsKey, goals }
}

type PriorityGoalsParams = z.infer<typeof setPriorityGoalsSchema>

// До чтения из API: без ценности add и replace бессмысленны, вызов тратить незачем.
function toIncomingGoals({ goals, mode }: PriorityGoalsParams): PriorityGoal[] {
  return goals.map((goal) => {
    if (mode !== "remove" && goal.value === undefined) {
      throw new Error(`value обязателен для цели ${goal.goal_id} при mode=${mode}.`)
    }
    return { goalId: goal.goal_id, value: goal.value ?? 0 }
  })
}

// Operation обязателен и принимает только SET.
function toApiGoal(goal: PriorityGoal): Record<string, unknown> {
  const item: Record<string, unknown> = { GoalId: apiId(goal.goalId), Value: goal.value, Operation: "SET" }
  if (goal.isMetrikaSourceOfValue !== undefined) item.IsMetrikaSourceOfValue = goal.isMetrikaSourceOfValue
  return item
}

// Пустой список уходит null: PriorityGoals nillable, а пустой Items запрещён (minOccurs=1).
export async function handleSetPriorityGoals(params: PriorityGoalsParams): Promise<string> {
  const incoming = toIncomingGoals(params)
  const { settingsKey, goals } = await readPriorityGoals(params.campaign_id)

  const merged = mergePriorityGoals(goals, incoming, params.mode)
  if (merged.length > MAX_PRIORITY_GOALS) {
    throw new Error(`У кампании не больше ${MAX_PRIORITY_GOALS} целей стратегии, после слияния их ${merged.length}.`)
  }

  const priorityGoals = merged.length > 0 ? { Items: merged.map(toApiGoal) } : null
  const data = await apiPost("campaigns", "update", {
    Campaigns: [{ Id: apiId(params.campaign_id), [settingsKey]: { PriorityGoals: priorityGoals } }]
  })
  return formatResult(data)
}
