import type { z } from "zod"
import { apiReport } from "#shared/api/reports"
import { reportName } from "#shared/lib/report"
import type { getSearchQueriesSchema } from "./schema.js"

const DEFAULT_FIELDS = [
  "Query",
  "CampaignId",
  "CampaignName",
  "AdGroupId",
  "AdGroupName",
  "Criterion",
  "Impressions",
  "Clicks",
  "Cost"
]

export async function handleGetSearchQueries(params: z.infer<typeof getSearchQueriesSchema>): Promise<string> {
  return apiReport({
    SelectionCriteria: {
      DateFrom: params.date_from,
      DateTo: params.date_to,
      Filter: [{ Field: "CampaignId", Operator: "IN", Values: params.campaign_ids }]
    },
    FieldNames: params.fields ?? DEFAULT_FIELDS,
    ReportName: reportName("search_queries"),
    ReportType: "SEARCH_QUERY_PERFORMANCE_REPORT",
    DateRangeType: "CUSTOM_DATE",
    Format: "TSV",
    IncludeVAT: "YES"
  })
}
