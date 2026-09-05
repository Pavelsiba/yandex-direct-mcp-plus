import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiId, apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import { mergeNegativeKeywords, type NegativeKeywordsMode } from "./merge.js"
import type {
  getCampaignNegativeKeywordsSchema,
  linkNegativeKeywordSetsSchema,
  listNegativeKeywordSharedSetsSchema,
  manageNegativeKeywordSharedSetsSchema,
  setAdGroupNegativeKeywordsSchema,
  setCampaignNegativeKeywordsSchema
} from "./schema.js"

// В домене нет денег: money: false бережёт от конвертации полей, которые ими не являются.
const NO_MONEY = { money: false } as const

export async function handleGetCampaignNegativeKeywords(
  params: z.infer<typeof getCampaignNegativeKeywordsSchema>
): Promise<string> {
  const data = await apiPost("campaigns", "get", {
    SelectionCriteria: { Ids: apiIds(params.campaign_ids) },
    FieldNames: ["Id", "Name", "NegativeKeywords"]
  })
  return formatResult(data, NO_MONEY)
}

// NegativeKeywords обязано быть в FieldNames: без него Директ вернёт существующую
// кампанию вообще без этого поля, слияние даст один входящий список, а update пройдёт
// успешно — прежние минус-фразы исчезнут молча. Отсутствие сущности в ответе — ошибка,
// а не пустой список: сливать не с чем.
async function readExistingKeywords(
  service: "campaigns" | "adgroups",
  collection: "Campaigns" | "AdGroups",
  label: string,
  id: string
): Promise<string[]> {
  const data = await apiPost(service, "get", {
    SelectionCriteria: { Ids: apiIds([id]) },
    FieldNames: ["Id", "NegativeKeywords"]
  })

  const found = (data as { result?: Record<string, unknown> })?.result?.[collection]
  const entity = Array.isArray(found) ? found[0] : undefined
  if (!entity) throw new Error(`${label} ${id} не найдена или недоступна — объединять минус-фразы не с чем.`)

  return (entity as { NegativeKeywords?: { Items?: string[] } }).NegativeKeywords?.Items ?? []
}

// replace остаётся одним вызовом: читать нечего, прежний список и так затирается.
async function resolveItems(
  params: { negative_keywords: string[]; mode: NegativeKeywordsMode },
  readExisting: () => Promise<string[]>
): Promise<string[]> {
  if (params.mode === "replace") return params.negative_keywords

  return mergeNegativeKeywords(await readExisting(), params.negative_keywords, params.mode)
}

export async function handleSetCampaignNegativeKeywords(
  params: z.infer<typeof setCampaignNegativeKeywordsSchema>
): Promise<string> {
  const items = await resolveItems(params, () =>
    readExistingKeywords("campaigns", "Campaigns", "Кампания", params.campaign_id)
  )

  const data = await apiPost("campaigns", "update", {
    Campaigns: [{ Id: apiId(params.campaign_id), NegativeKeywords: { Items: items } }]
  })
  return formatResult(data)
}

export async function handleSetAdGroupNegativeKeywords(
  params: z.infer<typeof setAdGroupNegativeKeywordsSchema>
): Promise<string> {
  const items = await resolveItems(params, () =>
    readExistingKeywords("adgroups", "AdGroups", "Группа объявлений", params.ad_group_id)
  )

  const data = await apiPost("adgroups", "update", {
    AdGroups: [{ Id: apiId(params.ad_group_id), NegativeKeywords: { Items: items } }]
  })
  return formatResult(data)
}

export async function handleListNegativeKeywordSharedSets(
  params: z.infer<typeof listNegativeKeywordSharedSetsSchema>
): Promise<string> {
  const request: Record<string, unknown> = { FieldNames: ["Id", "Name", "NegativeKeywords", "Associated"] }
  if (params.set_ids?.length) request.SelectionCriteria = { Ids: apiIds(params.set_ids) }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("negativekeywordsharedsets", "get", request), NO_MONEY)
}

type UpdateSet = NonNullable<z.infer<typeof manageNegativeKeywordSharedSetsSchema>["update_sets"]>[number]

function buildUpdateItem(set: UpdateSet): Record<string, unknown> {
  if (set.name === undefined && set.negative_keywords === undefined) {
    throw new Error("Для каждого update_sets укажите name и/или negative_keywords.")
  }

  const item: Record<string, unknown> = { Id: apiId(set.set_id) }
  if (set.name !== undefined) item.Name = set.name
  if (set.negative_keywords !== undefined) item.NegativeKeywords = set.negative_keywords
  return item
}

export async function handleManageNegativeKeywordSharedSets(
  params: z.infer<typeof manageNegativeKeywordSharedSetsSchema>
): Promise<string> {
  if (params.action === "add") {
    if (!params.add_sets?.length) throw new Error("Для action=add передайте add_sets.")

    const data = await apiPost("negativekeywordsharedsets", "add", {
      NegativeKeywordSharedSets: params.add_sets.map((set) => ({
        Name: set.name,
        NegativeKeywords: set.negative_keywords
      }))
    })
    return formatResult(data, NO_MONEY)
  }

  if (params.action === "update") {
    if (!params.update_sets?.length) throw new Error("Для action=update передайте update_sets.")

    const data = await apiPost("negativekeywordsharedsets", "update", {
      NegativeKeywordSharedSets: params.update_sets.map(buildUpdateItem)
    })
    return formatResult(data, NO_MONEY)
  }

  if (!params.set_ids?.length) throw new Error("Для action=delete передайте set_ids.")

  const data = await apiPost("negativekeywordsharedsets", "delete", {
    SelectionCriteria: { Ids: apiIds(params.set_ids) }
  })
  return formatResult(data, NO_MONEY)
}

// Привязка наборов перезаписывается целиком: список, отправленный здесь, становится
// единственным для каждой группы.
export async function handleLinkNegativeKeywordSets(
  params: z.infer<typeof linkNegativeKeywordSetsSchema>
): Promise<string> {
  const sharedSets = { Items: apiIds(params.set_ids) }

  const data = await apiPost("adgroups", "update", {
    AdGroups: params.ad_group_ids.map((adGroupId) => ({
      Id: apiId(adGroupId),
      NegativeKeywordSharedSetIds: sharedSets
    }))
  })
  return formatResult(data, NO_MONEY)
}
