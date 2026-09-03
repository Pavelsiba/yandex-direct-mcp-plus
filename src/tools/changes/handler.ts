import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import type { getChangesSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

type Params = z.infer<typeof getChangesSchema>

// Директ требует ровно один тип селектора: смешивать кампании, группы и объявления нельзя.
function selectedScope(params: Params): string {
  const scopes = [
    params.campaign_ids?.length ? "CampaignIds" : undefined,
    params.ad_group_ids?.length ? "AdGroupIds" : undefined,
    params.ad_ids?.length ? "AdIds" : undefined
  ].filter((scope): scope is string => scope !== undefined)

  if (scopes.length !== 1) {
    throw new Error("Для mode=objects передайте ровно один из campaign_ids/ad_group_ids/ad_ids.")
  }
  return scopes[0]
}

export async function handleGetChanges(params: Params): Promise<string> {
  if (params.mode === "campaigns") {
    return formatResult(await apiPost("changes", "checkCampaigns", { Timestamp: params.timestamp }), NO_MONEY)
  }

  const scope = selectedScope(params)
  const request: Record<string, unknown> = {
    Timestamp: params.timestamp,
    FieldNames: params.field_names ?? [scope]
  }
  if (params.campaign_ids?.length) request.CampaignIds = apiIds(params.campaign_ids)
  if (params.ad_group_ids?.length) request.AdGroupIds = apiIds(params.ad_group_ids)
  if (params.ad_ids?.length) request.AdIds = apiIds(params.ad_ids)

  return formatResult(await apiPost("changes", "check", request), NO_MONEY)
}
