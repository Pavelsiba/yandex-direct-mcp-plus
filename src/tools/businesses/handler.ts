import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { listBusinessesSchema } from "./schema.js"

const LIST_FIELDS = [...API_FIELDS.businesses.BusinessFieldEnum]

export async function handleListBusinesses(params: z.infer<typeof listBusinessesSchema>): Promise<string> {
  const request: Record<string, unknown> = { FieldNames: LIST_FIELDS }
  if (params.business_ids?.length) request.SelectionCriteria = { Ids: apiIds(params.business_ids) }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("businesses", "get", request), { money: false })
}
