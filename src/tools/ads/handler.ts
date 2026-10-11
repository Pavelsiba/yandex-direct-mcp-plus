import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
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

// Весь AdFieldEnum: баллы считаются за объекты, а не за поля, и без StatusClarification
// не видно, почему объявление отклонено..
const LIST_FIELDS = [...API_FIELDS.ads.AdFieldEnum]

// *Moderation не берём: вложенные объекты раздувают ответ, причина отказа уже в StatusClarification.
const TEXT_AD_FIELDS = API_FIELDS.ads.TextAdFieldEnum.filter((field) => !field.endsWith("Moderation"))

// На пустую выборку Директ отдаёт `{ "result": {} }` без ключа Ads — модель читает это
// как поломку и начинает гадать.
const EMPTY_ADS_NOTICE =
  "ℹ️ Директ вернул ответ без ключа Ads и без пояснений. Это не сбой инструмента и не ошибка запроса — " +
  "повторять тот же вызов бесполезно. Причин две: под отбор действительно не попало ни одного объявления, либо " +
  "объявления есть, но недоступны через API — так устроены объявления, тексты которых генерирует нейросеть " +
  "Яндекса. Различить " +
  "можно по показам: статистика накопительная, поэтому прошлые показы бывают и у группы, из которой объявления " +
  "удалили, а показы за сегодня при пустом ответе означают второй случай."

function hasAds(data: unknown): boolean {
  const ads = (data as { result?: { Ads?: unknown } })?.result?.Ads
  return Array.isArray(ads) && ads.length > 0
}

export async function handleListAds(params: z.infer<typeof listAdsSchema>): Promise<string> {
  const { ad_ids, ad_group_ids, campaign_ids, states, statuses, types } = params
  const selectionCriteria: Record<string, unknown> = {}
  if (ad_ids?.length) selectionCriteria.Ids = apiIds(ad_ids)
  if (ad_group_ids?.length) selectionCriteria.AdGroupIds = apiIds(ad_group_ids)
  if (campaign_ids?.length) selectionCriteria.CampaignIds = apiIds(campaign_ids)
  if (states?.length) selectionCriteria.States = states
  if (statuses?.length) selectionCriteria.Statuses = statuses
  if (types?.length) selectionCriteria.Types = types

  const requestParams: Record<string, unknown> = {
    SelectionCriteria: selectionCriteria,
    FieldNames: LIST_FIELDS,
    TextAdFieldNames: TEXT_AD_FIELDS
  }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  const data = await apiPost("ads", "get", requestParams)
  const body = formatResult(data)
  return hasAds(data) ? body : `${EMPTY_ADS_NOTICE}\n\n${body}`
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
