import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { listDynamicTargetsSchema, manageDynamicTargetsSchema } from "./schema.js"

const LIST_FIELDS = [
  "Id",
  "AdGroupId",
  "CampaignId",
  "Name",
  "Bid",
  "ContextBid",
  "StrategyPriority",
  "State",
  "StatusClarification",
  "Conditions",
  "ConditionType"
]

type Params = z.infer<typeof manageDynamicTargetsSchema>
type Target = NonNullable<Params["targets"]>[number]
type Bid = NonNullable<Params["bids"]>[number]

export async function handleListDynamicTargets(params: z.infer<typeof listDynamicTargetsSchema>): Promise<string> {
  const selection: Record<string, unknown> = {}
  if (params.dynamic_target_ids?.length) selection.Ids = apiIds(params.dynamic_target_ids)
  if (params.ad_group_ids?.length) selection.AdGroupIds = apiIds(params.ad_group_ids)
  if (params.campaign_ids?.length) selection.CampaignIds = apiIds(params.campaign_ids)
  if (params.states?.length) selection.States = params.states

  const request: Record<string, unknown> = { SelectionCriteria: selection, FieldNames: LIST_FIELDS }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("dynamictextadtargets", "get", request))
}

function buildTarget(target: Target): Record<string, unknown> {
  const item: Record<string, unknown> = {
    AdGroupId: apiId(target.ad_group_id),
    Name: target.name,
    Conditions: target.conditions.map((condition) => ({
      Operand: condition.operand,
      Operator: condition.operator,
      Arguments: condition.arguments
    }))
  }
  if (target.bid !== undefined) item.Bid = target.bid
  if (target.context_bid !== undefined) item.ContextBid = target.context_bid
  if (target.strategy_priority) item.StrategyPriority = target.strategy_priority
  return item
}

function buildBid(bid: Bid): Record<string, unknown> {
  const selectors = [bid.dynamic_target_id, bid.ad_group_id, bid.campaign_id].filter(Boolean)
  if (selectors.length !== 1) {
    throw new Error("Каждая ставка должна содержать ровно один ID цели, группы или кампании.")
  }
  if (bid.bid === undefined && bid.context_bid === undefined && bid.strategy_priority === undefined) {
    throw new Error("Для каждой ставки укажите bid, context_bid и/или strategy_priority.")
  }

  const item: Record<string, unknown> = {}
  if (bid.dynamic_target_id) item.Id = apiId(bid.dynamic_target_id)
  if (bid.ad_group_id) item.AdGroupId = apiId(bid.ad_group_id)
  if (bid.campaign_id) item.CampaignId = apiId(bid.campaign_id)
  if (bid.bid !== undefined) item.Bid = bid.bid
  if (bid.context_bid !== undefined) item.ContextBid = bid.context_bid
  if (bid.strategy_priority) item.StrategyPriority = bid.strategy_priority
  return item
}

export async function handleManageDynamicTargets(params: Params): Promise<string> {
  if (params.action === "add") {
    if (!params.targets?.length) throw new Error("Для action=add передайте targets.")

    // Динамические цели в API называются Webpages — имя поля тела повторяет справочник.
    const webpages = params.targets.map(buildTarget)
    return formatResult(await apiPost("dynamictextadtargets", "add", { Webpages: webpages }))
  }

  if (params.action === "set_bids") {
    if (!params.bids?.length) throw new Error("Для action=set_bids передайте bids.")

    const bids = params.bids.map(buildBid)
    return formatResult(await apiPost("dynamictextadtargets", "setBids", { Bids: bids }))
  }

  if (!params.dynamic_target_ids?.length) {
    throw new Error(`Для action=${params.action} передайте dynamic_target_ids.`)
  }

  const data = await apiPost("dynamictextadtargets", params.action, {
    SelectionCriteria: { Ids: apiIds(params.dynamic_target_ids) }
  })
  return formatResult(data)
}
