import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS, type FieldOf } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { listFeedsSchema } from "./schema.js"

// Из FeedFieldEnum не берётся только NumberOfListings: счётчик отфильтрованных
// предложений считается на стороне Директа и в выдаче списка ни на что не влияет.
const LIST_FIELDS: FieldOf<"feeds", "FeedFieldEnum">[] = [
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
    FileFeedFieldNames: [...API_FIELDS.feeds.FileFeedFieldEnum],
    UrlFeedFieldNames: [...API_FIELDS.feeds.UrlFeedFieldEnum]
  }
  if (params.feed_ids?.length) request.SelectionCriteria = { Ids: apiIds(params.feed_ids) }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("feeds", "get", request), { money: false })
}
