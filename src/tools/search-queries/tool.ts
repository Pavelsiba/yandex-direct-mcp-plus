import { defineTool, READ } from "#shared/lib/tool"
import { handleGetSearchQueries } from "./handler.js"
import { getSearchQueriesSchema } from "./schema.js"

export const getSearchQueriesTool = defineTool({
  name: "get_search_queries",
  title: "Поисковые запросы",
  description: "Отчёт по фактическим поисковым запросам для анализа и добавления минус-фраз.",
  annotations: READ,
  schema: getSearchQueriesSchema,
  handler: handleGetSearchQueries
})
