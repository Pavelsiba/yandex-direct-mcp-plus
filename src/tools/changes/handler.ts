import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import type { FieldOf } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import type { getChangesSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

type Params = z.infer<typeof getChangesSchema>

type CheckField = FieldOf<"changes", "CheckFieldEnum">

// Директ требует ровно один тип селектора: смешивать кампании, группы и объявления нельзя.
function selectedScope(params: Params): CheckField {
  const scopes = [
    params.campaign_ids?.length ? "CampaignIds" : undefined,
    params.ad_group_ids?.length ? "AdGroupIds" : undefined,
    params.ad_ids?.length ? "AdIds" : undefined
  ].filter((scope): scope is CheckField => scope !== undefined)

  if (scopes.length !== 1) {
    throw new Error("Для mode=objects передайте ровно один из campaign_ids/ad_group_ids/ad_ids.")
  }
  return scopes[0]
}

// Момент отсчёта обязателен везде, кроме справочников: там его отсутствие — законный
// запрос «сколько сейчас на сервере Директа», а не забытый параметр.
function requiredTimestamp(params: Params): string {
  if (params.timestamp === undefined) throw new Error(`Для mode=${params.mode} передайте timestamp.`)
  return params.timestamp
}

export async function handleGetChanges(params: Params): Promise<string> {
  if (params.mode === "dictionaries") {
    const request = params.timestamp === undefined ? {} : { Timestamp: params.timestamp }
    return formatResult(await apiPost("changes", "checkDictionaries", request), NO_MONEY)
  }

  if (params.mode === "campaigns") {
    return formatResult(await apiPost("changes", "checkCampaigns", { Timestamp: requiredTimestamp(params) }), NO_MONEY)
  }

  const scope = selectedScope(params)
  const request: Record<string, unknown> = {
    Timestamp: requiredTimestamp(params),
    FieldNames: params.field_names ?? [scope]
  }
  if (params.campaign_ids?.length) request.CampaignIds = apiIds(params.campaign_ids)
  if (params.ad_group_ids?.length) request.AdGroupIds = apiIds(params.ad_group_ids)
  if (params.ad_ids?.length) request.AdIds = apiIds(params.ad_ids)

  return formatResult(await apiPost("changes", "check", request), NO_MONEY)
}
