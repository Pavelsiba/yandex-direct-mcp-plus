import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS, type FieldOf } from "#shared/config/api-fields"
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

// Весь AdFieldEnum целиком: узкий список не экономил баллов (они считаются за вызов и
// объекты, не за поля), а StatusClarification без него не доезжал — и сервер не мог
// ответить, почему объявление отклонено модерацией. Набор придёт из снимка WSDL сам,
// поэтому новое поле Яндекса появится здесь пересборкой, а не через месяц на живой кампании.
const LIST_FIELDS = [...API_FIELDS.ads.AdFieldEnum]

// Из TextAdFieldEnum взяты ещё три привязки: без них не видно, что у объявления есть
// сайтлинки, визитка и изображение. Поля *Moderation не берём — это вложенные объекты,
// они раздувают ответ, а причина отказа уже приходит в StatusClarification.
const TEXT_AD_FIELDS: FieldOf<"ads", "TextAdFieldEnum">[] = [
  "Title",
  "Title2",
  "Text",
  "Href",
  "DisplayDomain",
  "SitelinkSetId",
  "VCardId",
  "AdImageHash"
]

// Директ на группу без объявлений отдаёт `{ "result": {} }` — без ключа Ads и без
// единого слова. Модель читает это как поломку инструмента и принимается гадать
// (12.09.2026 так и вышло: решила, что архивные скрыты, — хотя они приходят).
const EMPTY_ADS_NOTICE =
  "ℹ️ Директ вернул ответ без ключа Ads и без пояснений. Это не сбой инструмента и не ошибка запроса — " +
  "повторять вызов иначе бесполезно. Причин две: объявлений в этих группах действительно нет, либо они есть, " +
  "но недоступны через API — так устроены объявления, тексты которых генерирует нейросеть Яндекса. Различить " +
  "можно по показам: статистика накопительная, поэтому прошлые показы бывают и у группы, из которой объявления " +
  "удалили, а показы за сегодня при пустом ответе означают второй случай."

function hasAds(data: unknown): boolean {
  const ads = (data as { result?: { Ads?: unknown } })?.result?.Ads
  return Array.isArray(ads) && ads.length > 0
}

// Пустой ответ — не наша ошибка. Пробой 12.09.2026: `get` вернул пустой `result` и по
// группе, и по кампании целиком, при живом контроле — значит дело не в форме запроса.
// Тот же день показал и разгадку конкретного случая: объявления, созданные в той самой
// группе, пришли сразу, а показов у кампании за неделю не было вовсе — то есть прежние
// удалили, а статистика осталась. Второй случай (нейрообъявления, недоступные через API)
// в этом аккаунте не наблюдался. Разбор — roadmap, пункт 8.
export async function handleListAds(params: z.infer<typeof listAdsSchema>): Promise<string> {
  const requestParams: Record<string, unknown> = {
    SelectionCriteria: { AdGroupIds: apiIds(params.ad_group_ids) },
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
