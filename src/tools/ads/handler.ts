import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type {
  createTextAdSchema,
  listAdsSchema,
  manageAdsSchema,
  moderateAdsSchema,
  updateTextAdSchema
} from "./schema.js"

const LIST_FIELDS = ["Id", "CampaignId", "AdGroupId", "State", "Status"]
const TEXT_AD_FIELDS = ["Title", "Title2", "Text", "Href", "DisplayDomain"]

export async function handleListAds(params: z.infer<typeof listAdsSchema>): Promise<string> {
  const requestParams: Record<string, unknown> = {
    SelectionCriteria: { AdGroupIds: apiIds(params.ad_group_ids) },
    FieldNames: LIST_FIELDS,
    TextAdFieldNames: TEXT_AD_FIELDS
  }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  return formatResult(await apiPost("ads", "get", requestParams))
}

export async function handleCreateTextAd(params: z.infer<typeof createTextAdSchema>): Promise<string> {
  const textAd: Record<string, unknown> = { Title: params.title, Text: params.text, Href: params.href }
  if (params.title2) textAd.Title2 = params.title2

  const data = await apiPost("ads", "add", {
    Ads: [{ AdGroupId: apiId(params.ad_group_id), TextAd: textAd }]
  })
  return formatResult(data)
}

export async function handleUpdateTextAd(params: z.infer<typeof updateTextAdSchema>): Promise<string> {
  const textAd: Record<string, unknown> = {}
  if (params.title !== undefined) textAd.Title = params.title
  if (params.title2 !== undefined) textAd.Title2 = params.title2
  if (params.text !== undefined) textAd.Text = params.text
  if (params.href !== undefined) textAd.Href = params.href

  if (Object.keys(textAd).length === 0) {
    throw new Error("Нечего обновлять: укажите хотя бы одно из title/title2/text/href.")
  }

  const data = await apiPost("ads", "update", { Ads: [{ Id: apiId(params.ad_id), TextAd: textAd }] })
  return formatResult(data)
}

export async function handleManageAds(params: z.infer<typeof manageAdsSchema>): Promise<string> {
  const data = await apiPost("ads", params.action, {
    SelectionCriteria: { Ids: apiIds(params.ad_ids) }
  })
  return formatResult(data)
}

export async function handleModerateAds(params: z.infer<typeof moderateAdsSchema>): Promise<string> {
  const data = await apiPost("ads", "moderate", {
    SelectionCriteria: { Ids: apiIds(params.ad_ids) }
  })
  return formatResult(data)
}
