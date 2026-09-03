import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { addKeywordsSchema, listKeywordsSchema, manageKeywordsSchema, setKeywordBidsSchema } from "./schema.js"

const LIST_FIELDS = ["Id", "Keyword", "CampaignId", "AdGroupId", "Status", "State", "Bid", "ContextBid"]

// Ставки ставятся на один уровень целей за вызов; поле тела зависит от уровня.
type BidTarget = { field: string; ids: string[] }

function selectBidTarget(params: z.infer<typeof setKeywordBidsSchema>): BidTarget {
  const targets: BidTarget[] = []
  if (params.keyword_ids?.length) targets.push({ field: "KeywordId", ids: params.keyword_ids })
  if (params.ad_group_ids?.length) targets.push({ field: "AdGroupId", ids: params.ad_group_ids })
  if (params.campaign_ids?.length) targets.push({ field: "CampaignId", ids: params.campaign_ids })

  if (targets.length !== 1) {
    throw new Error("Укажите ровно один уровень целей: keyword_ids ИЛИ ad_group_ids ИЛИ campaign_ids.")
  }
  return targets[0]
}

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
