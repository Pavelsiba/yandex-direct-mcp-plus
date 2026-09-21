import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import type { FieldOf } from "#shared/config/api-fields"
import { PAGE_MAX_LIMIT } from "#shared/config/limits"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { deleteVcardsSchema, listVcardsSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

const DECIMAL_ID = /^[1-9]\d*$/

// Весь VCardFieldEnum, кроме PointOnMap: точка на карте — вложенный объект с координатами,
// в текстовой выдаче нечитаема, а адрес уже приходит полями Country…Apartment.
const VCARD_FIELDS: FieldOf<"vcards", "VCardFieldEnum">[] = [
  "Id",
  "CampaignId",
  "Country",
  "City",
  "CompanyName",
  "WorkTime",
  "Phone",
  "Street",
  "House",
  "Building",
  "Apartment",
  "InstantMessenger",
  "ExtraMessage",
  "ContactEmail",
  "Ogrn",
  "ContactPerson",
  "MetroStationId"
]

type AdsResponse = { result?: { Ads?: Array<{ TextAd?: { VCardId?: unknown } }> } }

// VCardId приезжает строкой (json-bigint) либо числом, если ID короткий.
// Чистая функция, поэтому проверяется без сети.
function collectVCardIds(response: AdsResponse): string[] {
  const ids = new Set<string>()

  for (const ad of response.result?.Ads ?? []) {
    const value = ad.TextAd?.VCardId
    if (typeof value === "string" && DECIMAL_ID.test(value)) ids.add(value)
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ids.add(String(value))
  }

  return [...ids]
}

async function findVCardIdsByCampaigns(campaignIds: string[]): Promise<string[]> {
  const response = (await apiPost("ads", "get", {
    SelectionCriteria: { CampaignIds: apiIds(campaignIds) },
    FieldNames: ["Id"] satisfies FieldOf<"ads", "AdFieldEnum">[],
    TextAdFieldNames: ["VCardId"] satisfies FieldOf<"ads", "TextAdFieldEnum">[],
    Page: { Limit: PAGE_MAX_LIMIT }
  })) as AdsResponse

  return collectVCardIds(response)
}

export async function handleListVcards(params: z.infer<typeof listVcardsSchema>): Promise<string> {
  const ids = new Set(params.vcard_ids ?? [])

  if (params.campaign_ids?.length) {
    for (const id of await findVCardIdsByCampaigns(params.campaign_ids)) ids.add(id)
  }

  if (ids.size === 0) {
    // Поиск по кампаниям, не нашедший визиток, — обычный пустой результат, а не ошибка.
    if (params.campaign_ids?.length) return formatResult({ result: { VCards: [] } }, NO_MONEY)
    throw new Error("Передайте vcard_ids и/или campaign_ids.")
  }

  const request: Record<string, unknown> = {
    SelectionCriteria: { Ids: apiIds([...ids]) },
    FieldNames: VCARD_FIELDS
  }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("vcards", "get", request), NO_MONEY)
}

export async function handleDeleteVcards(params: z.infer<typeof deleteVcardsSchema>): Promise<string> {
  const data = await apiPost("vcards", "delete", { SelectionCriteria: { Ids: apiIds(params.vcard_ids) } })
  return formatResult(data, NO_MONEY)
}
