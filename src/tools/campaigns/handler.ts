// Сценарии кампаний. Деньги сюда приезжают уже в микроединицах (конвертирует схема),
// ошибки разбирает shared/api — здесь только последовательность вызовов.
import type { z } from "zod"
import { apiPost } from "#shared/api/client"
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

const LIST_FIELDS = ["Id", "Name", "Status", "State", "DailyBudget", "StartDate", "Type", "Statistics"]
const DETAIL_FIELDS = [...LIST_FIELDS, "EndDate"]

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

  const requestParams: Record<string, unknown> = { SelectionCriteria: selectionCriteria, FieldNames: LIST_FIELDS }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  return formatResult(await apiPost("campaigns", "get", requestParams))
}

export async function handleGetCampaign(params: z.infer<typeof getCampaignSchema>): Promise<string> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [apiId(params.campaign_id)] },
    FieldNames: DETAIL_FIELDS
  })
  return formatResult(data)
}

export async function handleCreateCampaign(params: z.infer<typeof createCampaignSchema>): Promise<string> {
  const campaign: Record<string, unknown> = { Name: params.name, StartDate: params.start_date }
  if (params.daily_budget !== undefined) {
    campaign.DailyBudget = { Amount: params.daily_budget, Mode: "STANDARD" }
  }

  const biddingStrategy = {
    Search: { BiddingStrategyType: params.search_strategy },
    Network: { BiddingStrategyType: params.network_strategy }
  }
  if (params.type === "DYNAMIC_TEXT_CAMPAIGN") {
    campaign.DynamicTextCampaign = { BiddingStrategy: biddingStrategy }
  } else {
    campaign.TextCampaign = { BiddingStrategy: biddingStrategy }
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

  if (params.name !== undefined || params.daily_budget !== undefined) {
    const campaign: Record<string, unknown> = { Id: apiId(params.campaign_id) }
    if (params.name !== undefined) campaign.Name = params.name
    if (params.daily_budget !== undefined) {
      campaign.DailyBudget = { Amount: params.daily_budget, Mode: "STANDARD" }
    }
    sections.push(formatResult(await apiPost("campaigns", "update", { Campaigns: [campaign] })))
  }

  if (sections.length === 0) {
    throw new Error("Нечего обновлять: укажите status и/или name/daily_budget.")
  }
  return sections.join("\n\n")
}

export async function handleManageCampaigns(params: z.infer<typeof manageCampaignsSchema>): Promise<string> {
  const data = await apiPost("campaigns", params.action, {
    SelectionCriteria: { Ids: apiIds(params.campaign_ids) }
  })
  return formatResult(data)
}

// Стратегия — часть кампании: читается тем же get, пишется тем же update.
export async function handleGetStrategy(params: z.infer<typeof getStrategySchema>): Promise<string> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: [apiId(params.campaign_id)] },
    FieldNames: ["Id", "Name", "Type"],
    TextCampaignFieldNames: ["BiddingStrategy"]
  })
  return formatResult(data)
}

type StrategyParams = z.infer<typeof setStrategySchema>
type StrategyType = StrategyParams["search_type"] | StrategyParams["network_type"]

// Настройки лежат не рядом с типом, а во вложенном объекте, названном по стратегии.
function strategyPart(type: StrategyType, params: StrategyParams): Record<string, unknown> {
  const part: Record<string, unknown> = { BiddingStrategyType: type }

  if (type === "WB_MAXIMUM_CLICKS") {
    if (params.weekly_spend_limit === undefined) {
      throw new Error("weekly_spend_limit обязателен для стратегии WB_MAXIMUM_CLICKS.")
    }
    const settings: Record<string, number> = { WeeklySpendLimit: params.weekly_spend_limit }
    if (params.bid_ceiling !== undefined) settings.BidCeiling = params.bid_ceiling
    part.WbMaximumClicks = settings
  }

  if (type === "NETWORK_DEFAULT") {
    part.NetworkDefault =
      params.network_limit_percent === undefined ? {} : { LimitPercent: params.network_limit_percent }
  }

  return part
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
