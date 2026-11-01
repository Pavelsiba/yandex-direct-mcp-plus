// Сетевой smoke: поля по умолчанию каждого типа отчёта Директ принимает и отдаёт столбцами
// в том же порядке. Только чтение; отчёты расходуют свой дневной лимит, поэтому период узкий.
import { describe, expect, it } from "vitest"
import { STATISTICS_REPORT_TYPES } from "#shared/config/enums"
import { CONFIGURED, firstCampaignId } from "#testing/smoke"
import { DEFAULT_FIELDS, handleGetStatistics } from "./handler.js"
import { getStatisticsSchema } from "./schema.js"

const DAY_MS = 86_400_000
const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)

describe.skipIf(!CONFIGURED)("smoke statistics", () => {
  it.each(STATISTICS_REPORT_TYPES)("%s принимает поля по умолчанию", { timeout: 120_000 }, async (reportType) => {
    const campaignIds = reportType === "ACCOUNT_PERFORMANCE_REPORT" ? undefined : [await firstCampaignId()]
    const params = getStatisticsSchema.parse({
      report_type: reportType,
      campaign_ids: campaignIds,
      date_from: yesterday,
      date_to: yesterday
    })

    const tsv = await handleGetStatistics(params)

    expect(tsv.split("\n")[0].split("\t")).toEqual(DEFAULT_FIELDS[reportType])
  })
})
