import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
import { V501_URL } from "#shared/config/endpoints"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type {
  createResponsiveAdSchema,
  listAdsSchema,
  manageAdsSchema,
  moderateAdsSchema,
  updateResponsiveAdSchema
} from "./schema.js"

// Весь AdFieldEnum: баллы считаются за объекты, а не за поля, и без StatusClarification
// не видно, почему объявление отклонено..
const LIST_FIELDS = [...API_FIELDS.ads.AdFieldEnum]

// Текстовые объявления Директ отдаёт комбинаторными, если спросить ResponsiveAdFieldNames,
// а TextAd показывает только первый заголовок и текст. С обоими наборами приходит один ResponsiveAd.
// *Moderation не берём: вложенные объекты раздувают ответ, причина отказа уже в StatusClarification.
const RESPONSIVE_AD_FIELDS = API_FIELDS.ads.ResponsiveAdFieldEnum.filter((field) => !field.endsWith("Moderation"))

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
    ResponsiveAdFieldNames: RESPONSIVE_AD_FIELDS
  }
  const page = buildPage(params)
  if (page) requestParams.Page = page

  const data = await apiPost("ads", "get", requestParams)
  const body = formatResult(data)
  return hasAds(data) ? body : `${EMPTY_ADS_NOTICE}\n\n${body}`
}

export async function handleCreateResponsiveAd(params: z.infer<typeof createResponsiveAdSchema>): Promise<string> {
  const { ad_group_id, titles, texts, href } = params
  const data = await apiPost(
    "ads",
    "add",
    { Ads: [{ AdGroupId: apiId(ad_group_id), ResponsiveAd: { Titles: titles, Texts: texts, Href: href } }] },
    V501_URL
  )
  return formatResult(data)
}

export async function handleUpdateResponsiveAd(params: z.infer<typeof updateResponsiveAdSchema>): Promise<string> {
  const responsiveAd: Record<string, unknown> = {}
  if (params.titles !== undefined) responsiveAd.Titles = params.titles
  if (params.texts !== undefined) responsiveAd.Texts = params.texts
  if (params.href !== undefined) responsiveAd.Href = params.href

  if (Object.keys(responsiveAd).length === 0) {
    throw new Error("Нечего обновлять: укажите хотя бы одно из titles/texts/href.")
  }

  const data = await apiPost(
    "ads",
    "update",
    { Ads: [{ Id: apiId(params.ad_id), ResponsiveAd: responsiveAd }] },
    V501_URL
  )
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
