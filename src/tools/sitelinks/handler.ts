import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS, type FieldOf } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { deleteSitelinksSchema, listSitelinksSchema, setSitelinksSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

// Sitelinks из SitelinksSetFieldEnum не запрашивается: он взаимоисключающий с
// SitelinkFieldNames (пробой 13.09.2026, ошибка 4004), а сами ссылки приезжают этим
// параметром, набором ниже.
const SET_FIELDS: FieldOf<"sitelinks", "SitelinksSetFieldEnum">[] = ["Id"]

export async function handleListSitelinks(params: z.infer<typeof listSitelinksSchema>): Promise<string> {
  const request: Record<string, unknown> = {
    FieldNames: SET_FIELDS,
    SitelinkFieldNames: [...API_FIELDS.sitelinks.SitelinkFieldEnum]
  }
  if (params.sitelink_set_ids?.length) request.SelectionCriteria = { Ids: apiIds(params.sitelink_set_ids) }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("sitelinks", "get", request), NO_MONEY)
}

export async function handleDeleteSitelinks(params: z.infer<typeof deleteSitelinksSchema>): Promise<string> {
  const data = await apiPost("sitelinks", "delete", {
    SelectionCriteria: { Ids: apiIds(params.sitelink_set_ids) }
  })
  return formatResult(data, NO_MONEY)
}

export async function handleSetSitelinks(params: z.infer<typeof setSitelinksSchema>): Promise<string> {
  const sitelinks = params.sitelinks.map((link) => {
    const item: Record<string, string> = { Title: link.title }
    if (link.href !== undefined) item.Href = link.href
    if (link.description !== undefined) item.Description = link.description
    return item
  })

  return formatResult(await apiPost("sitelinks", "add", { SitelinksSets: [{ Sitelinks: sitelinks }] }), NO_MONEY)
}
