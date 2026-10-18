import { z } from "zod"
import { STATISTICS_REPORT_TYPES } from "#shared/config/enums"
import { dateField } from "#shared/lib/date"
import { idField } from "#shared/lib/id"
import { reportFieldsField } from "#shared/lib/report"

export const getStatisticsSchema = z
  .object({
    report_type: z
      .literal(STATISTICS_REPORT_TYPES)
      .default("CAMPAIGN_PERFORMANCE_REPORT")
      .meta({
        description:
          "Уровень отчёта: CAMPAIGN_PERFORMANCE_REPORT — по кампаниям, ADGROUP_PERFORMANCE_REPORT — по группам, " +
          "AD_PERFORMANCE_REPORT — по объявлениям, CRITERIA_PERFORMANCE_REPORT — по условиям показа (фразы, автотаргетинг, " +
          "аудитории), ACCOUNT_PERFORMANCE_REPORT — по аккаунту целиком, CUSTOM_REPORT — без своей группировки, только по " +
          "выбранным полям, REACH_AND_FREQUENCY_PERFORMANCE_REPORT — охват и частота медийных кампаний. Поисковые запросы — " +
          "get_search_queries"
      }),
    campaign_ids: z
      .array(idField("ID кампании"))
      .check(z.minLength(1, { error: "Список кампаний пуст" }))
      .optional()
      .meta({
        description: "Кампании, по которым строится отчёт. Обязательны для всех типов, кроме ACCOUNT_PERFORMANCE_REPORT"
      }),
    date_from: dateField("Первый день периода, YYYY-MM-DD"),
    date_to: dateField("Последний день периода включительно, YYYY-MM-DD"),
    fields: reportFieldsField(
      "Поля отчёта; по умолчанию — свой набор для каждого типа отчёта. Допустимость поля зависит от типа: " +
        "например, Query бывает только в поисковых запросах, а Keyword — только фильтр. " +
        "Date делит строки по дням. Деньги приходят в рублях"
    )
  })
  // По справке Reports поле CampaignId в отчёте по аккаунту недопустимо — в том числе в фильтре.
  .refine((params) => (params.report_type === "ACCOUNT_PERFORMANCE_REPORT") !== (params.campaign_ids !== undefined), {
    error: "campaign_ids обязательны для всех типов отчёта, кроме ACCOUNT_PERFORMANCE_REPORT, а у него недопустимы"
  })
  .refine(
    (params) =>
      params.report_type !== "REACH_AND_FREQUENCY_PERFORMANCE_REPORT" ||
      params.fields === undefined ||
      params.fields.includes("CampaignId"),
    { error: "В отчёте REACH_AND_FREQUENCY_PERFORMANCE_REPORT поле CampaignId обязательно" }
  )
