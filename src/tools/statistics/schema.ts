import { z } from "zod"
import { dateField } from "#shared/lib/date"
import { idField } from "#shared/lib/id"

export const getStatisticsSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании"))
    .check(z.minLength(1, { error: "Укажите хотя бы одну кампанию" }))
    .meta({ description: "Кампании, по которым строится отчёт" }),
  date_from: dateField("Первый день периода, YYYY-MM-DD"),
  date_to: dateField("Последний день периода включительно, YYYY-MM-DD"),
  fields: z
    .array(z.string().check(z.minLength(1, { error: "Имя поля не может быть пустым" })))
    .optional()
    .meta({
      description:
        "Поля отчёта; по умолчанию Date, CampaignName, Impressions, Clicks, Cost, Ctr, AvgCpc. Деньги приходят в рублях"
    })
})
