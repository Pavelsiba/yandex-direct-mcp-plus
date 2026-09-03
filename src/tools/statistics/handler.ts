import type { z } from "zod"
import { apiReport } from "#shared/api/reports"
import { reportName } from "#shared/lib/report"
import type { getStatisticsSchema } from "./schema.js"

const DEFAULT_FIELDS = ["Date", "CampaignName", "Impressions", "Clicks", "Cost", "Ctr", "AvgCpc"]

// Отчёт приходит готовым TSV: ReportService форматирует его сам, деньги отдаёт
// в рублях (returnMoneyInMicros=false), поэтому formatResult здесь не участвует.
export async function handleGetStatistics(params: z.infer<typeof getStatisticsSchema>): Promise<string> {
  return apiReport({
    SelectionCriteria: {
      DateFrom: params.date_from,
      DateTo: params.date_to,
      Filter: [{ Field: "CampaignId", Operator: "IN", Values: params.campaign_ids }]
    },
    FieldNames: params.fields ?? DEFAULT_FIELDS,
    ReportName: reportName("report"),
    ReportType: "CAMPAIGN_PERFORMANCE_REPORT",
    DateRangeType: "CUSTOM_DATE",
    Format: "TSV",
    IncludeVAT: "YES"
  })
}
