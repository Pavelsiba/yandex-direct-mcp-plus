import type { z } from "zod"
import { apiReport } from "#shared/api/reports"
import type { FieldOf } from "#shared/config/api-fields"
import type { STATISTICS_REPORT_TYPES } from "#shared/config/enums"
import { reportName } from "#shared/lib/report"
import type { getStatisticsSchema } from "./schema.js"

type ReportField = FieldOf<"reports", "FieldEnum">

const METRICS: ReportField[] = ["Impressions", "Clicks", "Cost", "Ctr", "AvgCpc"]

// Ниже уровня кампании строка — объект за весь период: по дням отчёт по фразам разрастается
// в тысячи строк. Date модель добавляет сама, когда нужна динамика.
export const DEFAULT_FIELDS = {
  CAMPAIGN_PERFORMANCE_REPORT: ["Date", "CampaignName", ...METRICS],
  ADGROUP_PERFORMANCE_REPORT: ["CampaignName", "AdGroupId", "AdGroupName", ...METRICS],
  AD_PERFORMANCE_REPORT: ["CampaignName", "AdGroupName", "AdId", ...METRICS],
  CRITERIA_PERFORMANCE_REPORT: ["CampaignName", "AdGroupName", "CriterionId", "Criterion", "CriterionType", ...METRICS],
  ACCOUNT_PERFORMANCE_REPORT: ["Date", ...METRICS],
  CUSTOM_REPORT: ["CampaignName", ...METRICS],
  REACH_AND_FREQUENCY_PERFORMANCE_REPORT: [
    "CampaignId",
    "CampaignName",
    "Impressions",
    "ImpressionReach",
    "AvgImpressionFrequency",
    "Cost",
    "AvgCpm"
  ]
} as const satisfies Record<(typeof STATISTICS_REPORT_TYPES)[number], ReportField[]>

// Отчёт приходит готовым TSV: ReportService форматирует его сам, деньги отдаёт
// в рублях (returnMoneyInMicros=false), поэтому formatResult здесь не участвует.
export async function handleGetStatistics(params: z.infer<typeof getStatisticsSchema>): Promise<string> {
  const { report_type: reportType, campaign_ids: campaignIds } = params
  return apiReport({
    SelectionCriteria: {
      DateFrom: params.date_from,
      DateTo: params.date_to,
      ...(campaignIds && { Filter: [{ Field: "CampaignId", Operator: "IN", Values: campaignIds }] })
    },
    FieldNames: params.fields ?? DEFAULT_FIELDS[reportType],
    ReportName: reportName("report"),
    ReportType: reportType,
    DateRangeType: "CUSTOM_DATE",
    Format: "TSV",
    IncludeVAT: "YES"
  })
}
