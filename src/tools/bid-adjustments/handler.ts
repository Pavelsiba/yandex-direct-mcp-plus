import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { getBidAdjustmentsSchema, setBidAdjustmentsSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

// Значения корректировок лежат в отдельных полях на каждый тип, поэтому запрашиваются
// все наборы сразу: иначе ответ придёт без самих коэффициентов.
const FIELD_NAMES = {
  FieldNames: ["Id", "CampaignId", "AdGroupId", "Level", "Type"],
  MobileAdjustmentFieldNames: ["BidModifier", "OperatingSystemType"],
  TabletAdjustmentFieldNames: ["BidModifier", "OperatingSystemType"],
  DesktopAdjustmentFieldNames: ["BidModifier"],
  DesktopOnlyAdjustmentFieldNames: ["BidModifier"],
  DemographicsAdjustmentFieldNames: ["Gender", "Age", "BidModifier", "Enabled"]
}

export async function handleGetBidAdjustments(params: z.infer<typeof getBidAdjustmentsSchema>): Promise<string> {
  if (!params.campaign_ids && !params.ad_group_ids && !params.adjustment_ids) {
    throw new Error("Укажите campaign_ids, ad_group_ids или adjustment_ids.")
  }

  const selection: Record<string, unknown> = { Levels: params.levels }
  if (params.campaign_ids) selection.CampaignIds = apiIds(params.campaign_ids)
  if (params.ad_group_ids) selection.AdGroupIds = apiIds(params.ad_group_ids)
  if (params.adjustment_ids) selection.Ids = apiIds(params.adjustment_ids)
  if (params.types) selection.Types = params.types

  const request: Record<string, unknown> = { SelectionCriteria: selection, ...FIELD_NAMES }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("bidmodifiers", "get", request), NO_MONEY)
}

export async function handleSetBidAdjustments(params: z.infer<typeof setBidAdjustmentsSchema>): Promise<string> {
  const data = await apiPost("bidmodifiers", "set", {
    BidModifiers: params.adjustments.map((adjustment) => ({
      Id: apiId(adjustment.adjustment_id),
      BidModifier: adjustment.bid_modifier
    }))
  })
  return formatResult(data, NO_MONEY)
}
