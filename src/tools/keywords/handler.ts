import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import type { FieldOf } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type {
  addKeywordsSchema,
  getKeywordAuctionSchema,
  listKeywordsSchema,
  manageKeywordsSchema,
  setKeywordBidsSchema,
  updateKeywordsSchema
} from "./schema.js"

const LIST_FIELDS: FieldOf<"keywords", "KeywordFieldEnum">[] = [
  "Id",
  "Keyword",
  "CampaignId",
  "AdGroupId",
  "Status",
  "State",
  "Bid",
  "ContextBid"
]

// Ставки ставятся на один уровень целей за вызов; поле тела зависит от уровня.
// Чтение аукциона отбирает те же уровни, но именем множественного числа — отсюда две
// формы имени у одной цели.
type BidTarget = { field: string; criterion: string; ids: string[] }
type BidTargetParams = { keyword_ids?: string[]; ad_group_ids?: string[]; campaign_ids?: string[] }

function selectBidTarget(params: BidTargetParams): BidTarget {
  const targets: BidTarget[] = []
  if (params.keyword_ids?.length) targets.push({ field: "KeywordId", criterion: "KeywordIds", ids: params.keyword_ids })
  if (params.ad_group_ids?.length)
    targets.push({ field: "AdGroupId", criterion: "AdGroupIds", ids: params.ad_group_ids })
  if (params.campaign_ids?.length)
    targets.push({ field: "CampaignId", criterion: "CampaignIds", ids: params.campaign_ids })

  if (targets.length !== 1) {
    throw new Error("Укажите ровно один уровень целей: keyword_ids ИЛИ ad_group_ids ИЛИ campaign_ids.")
  }
  return targets[0]
}

// Позиции аукциона Директ отдаёт двумя наборами имён: AuctionBids — кодами P11–P24,
// SearchPrices — словами (PREMIUMFIRST, FOOTERBLOCK). Проба 12.09.2026: приходят оба,
// а CurrentSearchPrice и ContextCoverage бывают null у фразы без показов.
const AUCTION_FIELDS: FieldOf<"bids", "BidFieldEnum">[] = [
  "KeywordId",
  "CampaignId",
  "AdGroupId",
  "Bid",
  "ContextBid",
  "CurrentSearchPrice",
  "MinSearchPrice",
  "AuctionBids",
  "CompetitorsBids",
  "SearchPrices",
  "ContextCoverage",
  "ServingStatus",
  "StrategyPriority"
]

export async function handleListKeywords(params: z.infer<typeof listKeywordsSchema>): Promise<string> {
  const requestParams: Record<string, unknown> = {
    SelectionCriteria: { AdGroupIds: apiIds(params.ad_group_ids) },
    FieldNames: LIST_FIELDS
  }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  return formatResult(await apiPost("keywords", "get", requestParams))
}

export async function handleAddKeywords(params: z.infer<typeof addKeywordsSchema>): Promise<string> {
  const data = await apiPost("keywords", "add", {
    Keywords: params.keywords.map((keyword) => ({ AdGroupId: apiId(params.ad_group_id), Keyword: keyword }))
  })
  return formatResult(data)
}

type KeywordUpdate = z.infer<typeof updateKeywordsSchema>["keywords"][number]

// null у подстановочной переменной значит «очистить», поэтому от прочих значений
// его отличает только undefined — сравнение именно с ним, а не проверка на falsy.
function buildKeywordUpdate(update: KeywordUpdate): Record<string, unknown> {
  const item: Record<string, unknown> = { Id: apiId(update.keyword_id) }
  if (update.keyword !== undefined) item.Keyword = update.keyword
  if (update.user_param1 !== undefined) item.UserParam1 = update.user_param1
  if (update.user_param2 !== undefined) item.UserParam2 = update.user_param2

  if (Object.keys(item).length === 1) {
    throw new Error(`Для фразы ${update.keyword_id} не передано ни одного изменения.`)
  }
  return item
}

export async function handleUpdateKeywords(params: z.infer<typeof updateKeywordsSchema>): Promise<string> {
  const data = await apiPost("keywords", "update", { Keywords: params.keywords.map(buildKeywordUpdate) })
  return formatResult(data)
}

export async function handleManageKeywords(params: z.infer<typeof manageKeywordsSchema>): Promise<string> {
  const data = await apiPost("keywords", params.action, {
    SelectionCriteria: { Ids: apiIds(params.keyword_ids) }
  })
  return formatResult(data)
}

export async function handleSetKeywordBids(params: z.infer<typeof setKeywordBidsSchema>): Promise<string> {
  const target = selectBidTarget(params)

  if (params.bid === undefined && params.context_bid === undefined) {
    throw new Error("Укажите bid и/или context_bid (в рублях).")
  }

  const amounts: Record<string, number> = {}
  if (params.bid !== undefined) amounts.Bid = params.bid
  if (params.context_bid !== undefined) amounts.ContextBid = params.context_bid

  const bids = target.ids.map((id) => ({ [target.field]: apiId(id), ...amounts }))
  return formatResult(await apiPost("bids", "set", { Bids: bids }))
}

export async function handleGetKeywordAuction(params: z.infer<typeof getKeywordAuctionSchema>): Promise<string> {
  const target = selectBidTarget(params)

  const requestParams: Record<string, unknown> = {
    SelectionCriteria: { [target.criterion]: apiIds(target.ids) },
    FieldNames: AUCTION_FIELDS
  }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  return formatResult(await apiPost("bids", "get", requestParams))
}
