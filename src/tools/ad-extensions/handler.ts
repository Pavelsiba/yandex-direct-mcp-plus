import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS, type FieldOf } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { addAdExtensionsSchema, deleteAdExtensionsSchema, listAdExtensionsSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

// State в набор не берётся: он приходит фильтром в SelectionCriteria, и дублировать
// его в выдаче незачем.
const LIST_FIELDS: FieldOf<"adextensions", "AdExtensionFieldEnum">[] = [
  "Id",
  "Type",
  "Status",
  "StatusClarification",
  "Associated"
]

export async function handleListAdExtensions(params: z.infer<typeof listAdExtensionsSchema>): Promise<string> {
  const selection: Record<string, unknown> = { Types: ["CALLOUT"] }
  if (params.ad_extension_ids?.length) selection.Ids = apiIds(params.ad_extension_ids)
  if (params.states?.length) selection.States = params.states
  if (params.statuses?.length) selection.Statuses = params.statuses

  const request: Record<string, unknown> = {
    SelectionCriteria: selection,
    FieldNames: LIST_FIELDS,
    CalloutFieldNames: [...API_FIELDS.adextensions.CalloutFieldEnum]
  }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("adextensions", "get", request), NO_MONEY)
}

export async function handleAddAdExtensions(params: z.infer<typeof addAdExtensionsSchema>): Promise<string> {
  const data = await apiPost("adextensions", "add", {
    AdExtensions: params.callouts.map((calloutText) => ({ Callout: { CalloutText: calloutText } }))
  })
  return formatResult(data, NO_MONEY)
}

export async function handleDeleteAdExtensions(params: z.infer<typeof deleteAdExtensionsSchema>): Promise<string> {
  const data = await apiPost("adextensions", "delete", {
    SelectionCriteria: { Ids: apiIds(params.ad_extension_ids) }
  })
  return formatResult(data, NO_MONEY)
}
