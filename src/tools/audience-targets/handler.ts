import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { listAudienceTargetsSchema, setAudienceTargetsSchema } from "./schema.js"

const LIST_FIELDS = [
  "Id",
  "AdGroupId",
  "CampaignId",
  "RetargetingListId",
  "InterestId",
  "ContextBid",
  "StrategyPriority",
  "State"
]

type Params = z.infer<typeof setAudienceTargetsSchema>
type Target = NonNullable<Params["targets"]>[number]
type Bid = NonNullable<Params["bids"]>[number]

export async function handleListAudienceTargets(params: z.infer<typeof listAudienceTargetsSchema>): Promise<string> {
  const selection: Record<string, unknown> = {}
  if (params.audience_target_ids?.length) selection.Ids = apiIds(params.audience_target_ids)
  if (params.ad_group_ids?.length) selection.AdGroupIds = apiIds(params.ad_group_ids)
  if (params.campaign_ids?.length) selection.CampaignIds = apiIds(params.campaign_ids)
  if (params.retargeting_list_ids?.length) selection.RetargetingListIds = apiIds(params.retargeting_list_ids)
  if (params.interest_ids?.length) selection.InterestIds = apiIds(params.interest_ids)
  if (params.states?.length) selection.States = params.states

  // States сам по себе выборку не задаёт: Директ требует хотя бы один фильтр по ID.
  if (!Object.keys(selection).some((key) => key !== "States")) {
    throw new Error("Укажите хотя бы один фильтр ID для list_audience_targets.")
  }

  const request: Record<string, unknown> = { SelectionCriteria: selection, FieldNames: LIST_FIELDS }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("audiencetargets", "get", request))
}

function buildTarget(target: Target): Record<string, unknown> {
  const sources = [target.retargeting_list_id, target.interest_id].filter(Boolean)
  if (sources.length !== 1) {
    throw new Error("Каждая цель должна содержать ровно одно из retargeting_list_id/interest_id.")
  }

  const item: Record<string, unknown> = { AdGroupId: apiId(target.ad_group_id) }
  if (target.retargeting_list_id) item.RetargetingListId = apiId(target.retargeting_list_id)
  if (target.interest_id) item.InterestId = apiId(target.interest_id)
  if (target.context_bid !== undefined) item.ContextBid = target.context_bid
  if (target.strategy_priority) item.StrategyPriority = target.strategy_priority
  return item
}

function buildBid(bid: Bid): Record<string, unknown> {
  const selectors = [bid.audience_target_id, bid.ad_group_id, bid.campaign_id].filter(Boolean)
  if (selectors.length !== 1) {
    throw new Error("Каждая ставка должна содержать ровно один ID цели, группы или кампании.")
  }
  if (bid.context_bid === undefined && bid.strategy_priority === undefined) {
    throw new Error("Для каждой ставки укажите context_bid и/или strategy_priority.")
  }

  const item: Record<string, unknown> = {}
  if (bid.audience_target_id) item.Id = apiId(bid.audience_target_id)
  if (bid.ad_group_id) item.AdGroupId = apiId(bid.ad_group_id)
  if (bid.campaign_id) item.CampaignId = apiId(bid.campaign_id)
  if (bid.context_bid !== undefined) item.ContextBid = bid.context_bid
  if (bid.strategy_priority) item.StrategyPriority = bid.strategy_priority
  return item
}

export async function handleSetAudienceTargets(params: Params): Promise<string> {
  if (params.action === "add") {
    if (!params.targets?.length) throw new Error("Для action=add передайте targets.")

    const targets = params.targets.map(buildTarget)
    return formatResult(await apiPost("audiencetargets", "add", { AudienceTargets: targets }))
  }

  if (params.action === "set_bids") {
    if (!params.bids?.length) throw new Error("Для action=set_bids передайте bids.")

    const bids = params.bids.map(buildBid)
    return formatResult(await apiPost("audiencetargets", "setBids", { Bids: bids }))
  }

  if (!params.audience_target_ids?.length) {
    throw new Error(`Для action=${params.action} передайте audience_target_ids.`)
  }

  const data = await apiPost("audiencetargets", params.action, {
    SelectionCriteria: { Ids: apiIds(params.audience_target_ids) }
  })
  return formatResult(data)
}
