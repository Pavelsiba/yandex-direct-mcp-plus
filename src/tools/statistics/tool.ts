import { defineTool, READ } from "#shared/lib/tool"
import { handleGetStatistics } from "./handler.js"
import { getStatisticsSchema } from "./schema.js"

export const getStatisticsTool = defineTool({
  name: "get_statistics",
  title: "Статистика",
  description: "Статистика кампаний за период: показы, клики, расход (руб), CTR, CPC (ReportService, TSV).",
  annotations: READ,
  schema: getStatisticsSchema,
  handler: handleGetStatistics
})
