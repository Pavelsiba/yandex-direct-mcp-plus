import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS, type FieldOf } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type {
  addKeywordsSchema,
  getKeywordAuctionSchema,
  listKeywordsSchema,
  manageKeywordsSchema,
  setAutoKeywordBidsSchema,
  setKeywordBidsSchema,
  updateKeywordsSchema
} from "./schema.js"
import { KEYWORD_LIST_FIELDS } from "./schema.js"

// Две формы имени: запись ставки — KeywordId, чтение аукциона — KeywordIds.
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

// StrategyPriority не запрашивается: Директ его больше не использует, а в выдаче он читался бы
// как рычаг автостратегии.
const AUCTION_FIELDS: FieldOf<"keywordbids", "KeywordBidFieldEnum">[] = [
  "KeywordId",
  "AdGroupId",
  "CampaignId",
  "ServingStatus"
]

// Поля площадки запрашиваются только для выбранных: AuctionBids и Coverage справка запрещает
// спрашивать у кампании, где показы на этой площадке выключены.
const PLACEMENT_FIELDS = {
  search: { key: "SearchFieldNames", fields: API_FIELDS.keywordbids.KeywordBidSearchFieldEnum },
  network: { key: "NetworkFieldNames", fields: API_FIELDS.keywordbids.KeywordBidNetworkFieldEnum }
} as const

export async function handleListKeywords(params: z.infer<typeof listKeywordsSchema>): Promise<string> {
  const requestParams: Record<string, unknown> = {
    SelectionCriteria: { AdGroupIds: apiIds(params.ad_group_ids) },
    FieldNames: params.fields ?? KEYWORD_LIST_FIELDS
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

// null значит «очистить», поэтому сравнение с undefined, а не проверка на falsy.
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

function buildBidValues(params: z.infer<typeof setKeywordBidsSchema>): Record<string, unknown> {
  const { search_bid, network_bid, autotargeting_auto_bid } = params
  const values: Record<string, unknown> = {}
  if (search_bid !== undefined) values.SearchBid = search_bid
  if (network_bid !== undefined) values.NetworkBid = network_bid
  if (autotargeting_auto_bid !== undefined) values.AutotargetingSearchBidIsAuto = autotargeting_auto_bid ? "YES" : "NO"

  if (Object.keys(values).length === 0) {
    throw new Error("Укажите search_bid, network_bid (в рублях) и/или autotargeting_auto_bid.")
  }
  return values
}

export async function handleSetKeywordBids(params: z.infer<typeof setKeywordBidsSchema>): Promise<string> {
  const target = selectBidTarget(params)
  const values = buildBidValues(params)

  const bids = target.ids.map((id) => ({ [target.field]: apiId(id), ...values }))
  return formatResult(await apiPost("keywordbids", "set", { KeywordBids: bids }))
}

type AutoBidRule = { increase_percent?: number; bid_ceiling?: number }

// Необязательные части правила не отправляются вовсе: пропущенная надбавка у Директа значит «без надбавки».
function ruleExtras({ increase_percent, bid_ceiling }: AutoBidRule): Record<string, number> {
  const extras: Record<string, number> = {}
  if (increase_percent !== undefined) extras.IncreasePercent = increase_percent
  if (bid_ceiling !== undefined) extras.BidCeiling = bid_ceiling
  return extras
}

function buildBiddingRule(params: z.infer<typeof setAutoKeywordBidsSchema>): Record<string, unknown> {
  const { search, network } = params
  const rule: Record<string, unknown> = {}
  if (search) rule.SearchByTrafficVolume = { TargetTrafficVolume: search.traffic_volume, ...ruleExtras(search) }
  if (network) rule.NetworkByCoverage = { TargetCoverage: network.coverage, ...ruleExtras(network) }

  if (Object.keys(rule).length === 0) {
    throw new Error("Укажите правило search и/или network.")
  }
  return rule
}

export async function handleSetAutoKeywordBids(params: z.infer<typeof setAutoKeywordBidsSchema>): Promise<string> {
  const target = selectBidTarget(params)
  const rule = buildBiddingRule(params)

  const bids = target.ids.map((id) => ({ [target.field]: apiId(id), BiddingRule: rule }))
  return formatResult(await apiPost("keywordbids", "setAuto", { KeywordBids: bids }))
}

export async function handleGetKeywordAuction(params: z.infer<typeof getKeywordAuctionSchema>): Promise<string> {
  const target = selectBidTarget(params)

  const requestParams: Record<string, unknown> = {
    SelectionCriteria: { [target.criterion]: apiIds(target.ids) },
    FieldNames: AUCTION_FIELDS
  }
  for (const placement of params.placements) {
    const { key, fields } = PLACEMENT_FIELDS[placement]
    requestParams[key] = [...fields]
  }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  return formatResult(await apiPost("keywordbids", "get", requestParams))
}
