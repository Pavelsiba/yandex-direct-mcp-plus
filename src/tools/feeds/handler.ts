import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { listFeedsSchema } from "./schema.js"

const LIST_FIELDS = [
  "Id",
  "Name",
  "BusinessType",
  "SourceType",
  "FilterSchema",
  "UpdatedAt",
  "CampaignIds",
  "NumberOfItems",
  "Status",
  "TitleAndTextSources"
]

export async function handleListFeeds(params: z.infer<typeof listFeedsSchema>): Promise<string> {
  const request: Record<string, unknown> = {
    FieldNames: LIST_FIELDS,
    FileFeedFieldNames: ["Filename"],
    UrlFeedFieldNames: ["Login", "Url", "RemoveUtmTags"]
  }
  if (params.feed_ids?.length) request.SelectionCriteria = { Ids: apiIds(params.feed_ids) }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("feeds", "get", request), { money: false })
}
