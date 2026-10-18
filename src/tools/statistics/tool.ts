import { defineTool, READ } from "#shared/lib/tool"
import { handleGetStatistics } from "./handler.js"
import { getStatisticsSchema } from "./schema.js"

export const getStatisticsTool = defineTool({
  name: "get_statistics",
  title: "Статистика",
  description:
    "Статистика за период по кампаниям, группам, объявлениям, условиям показа или аккаунту: показы, клики, расход (руб), CTR, CPC (ReportService, TSV).",
  annotations: READ,
  schema: getStatisticsSchema,
  handler: handleGetStatistics
})
