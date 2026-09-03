import { defineTool, READ } from "#shared/lib/tool"
import { handleListFeeds } from "./handler.js"
import { listFeedsSchema } from "./schema.js"

export const listFeedsTool = defineTool({
  name: "list_feeds",
  title: "Список фидов",
  description: "Получить товарные фиды, их источники, статусы обработки и связанные кампании.",
  annotations: READ,
  schema: listFeedsSchema,
  handler: handleListFeeds
})
