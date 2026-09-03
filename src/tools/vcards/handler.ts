import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { PAGE_MAX_LIMIT } from "#shared/config/limits"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { addVcardSchema, listVcardsSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

const DECIMAL_ID = /^[1-9]\d*$/

const VCARD_FIELDS = [
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

// VCardId приезжает строкой (json-bigint) либо числом на коротких ID песочницы.
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
    FieldNames: ["Id"],
    TextAdFieldNames: ["VCardId"],
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

// Необязательные поля визитки: имя параметра → имя поля Директа.
const OPTIONAL_FIELDS = [
  ["street", "Street"],
  ["house", "House"],
  ["building", "Building"],
  ["apartment", "Apartment"],
  ["extra_message", "ExtraMessage"],
  ["contact_email", "ContactEmail"],
  ["ogrn", "Ogrn"],
  ["contact_person", "ContactPerson"]
] as const

export async function handleAddVcard(params: z.infer<typeof addVcardSchema>): Promise<string> {
  const phone: Record<string, unknown> = {
    CountryCode: params.phone_country_code,
    CityCode: params.phone_city_code,
    PhoneNumber: params.phone_number
  }
  if (params.phone_extension !== undefined) phone.Extension = params.phone_extension

  const vcard: Record<string, unknown> = {
    CampaignId: apiId(params.campaign_id),
    Country: params.country,
    City: params.city,
    CompanyName: params.company_name,
    WorkTime: params.work_time,
    Phone: phone
  }

  for (const [source, target] of OPTIONAL_FIELDS) {
    const value = params[source]
    if (value !== undefined) vcard[target] = value
  }
  if (params.metro_station_id) vcard.MetroStationId = apiId(params.metro_station_id)

  return formatResult(await apiPost("vcards", "add", { VCards: [vcard] }), NO_MONEY)
}
