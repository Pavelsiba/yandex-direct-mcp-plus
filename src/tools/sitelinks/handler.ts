import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { listSitelinksSchema, setSitelinksSchema } from "./schema.js"

const NO_MONEY = { money: false } as const

export async function handleListSitelinks(params: z.infer<typeof listSitelinksSchema>): Promise<string> {
  const request: Record<string, unknown> = {
    FieldNames: ["Id"],
    SitelinkFieldNames: ["Title", "Href", "Description", "TurboPageId"]
  }
  if (params.sitelink_set_ids?.length) request.SelectionCriteria = { Ids: apiIds(params.sitelink_set_ids) }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("sitelinks", "get", request), NO_MONEY)
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
