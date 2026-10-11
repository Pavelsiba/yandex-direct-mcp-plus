import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
import { formatResult } from "#shared/lib/format"
import { apiIds } from "#shared/lib/id"
import { buildPage } from "#shared/lib/pagination"
import type { listFeedsSchema } from "./schema.js"

export async function handleListFeeds(params: z.infer<typeof listFeedsSchema>): Promise<string> {
  const request: Record<string, unknown> = {
    FieldNames: [...API_FIELDS.feeds.FeedFieldEnum],
    FileFeedFieldNames: [...API_FIELDS.feeds.FileFeedFieldEnum],
    UrlFeedFieldNames: [...API_FIELDS.feeds.UrlFeedFieldEnum]
  }
  if (params.feed_ids?.length) request.SelectionCriteria = { Ids: apiIds(params.feed_ids) }
  const page = buildPage(params)
  if (page) request.Page = page

  return formatResult(await apiPost("feeds", "get", request), { money: false })
}
