import { z } from "zod"
import { dateField } from "#shared/lib/date"
import { idField } from "#shared/lib/id"
import { reportFieldsField } from "#shared/lib/report"

export const getSearchQueriesSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании"))
    .check(z.minLength(1, { error: "Укажите хотя бы одну кампанию" }))
    .meta({ description: "Кампании, по которым нужен отчёт о поисковых запросах" }),
  date_from: dateField("Первый день периода, YYYY-MM-DD"),
  date_to: dateField("Последний день периода включительно, YYYY-MM-DD"),
  fields: reportFieldsField(
    "Поля отчёта; по умолчанию Query, CampaignId, CampaignName, AdGroupId, AdGroupName, Criterion, Impressions, Clicks, Cost"
  )
})
