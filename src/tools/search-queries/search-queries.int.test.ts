// Сетевой smoke: поля по умолчанию SEARCH_QUERY_PERFORMANCE_REPORT Директ принимает и отдаёт
// столбцами в том же порядке. Только чтение; отчёт расходует свой дневной лимит, период узкий.
import { describe, expect, it } from "vitest"
import { CONFIGURED, firstCampaignId } from "#testing/smoke"
import { DEFAULT_FIELDS, handleGetSearchQueries } from "./handler.js"
import { getSearchQueriesSchema } from "./schema.js"

const DAY_MS = 86_400_000
const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)
// Reports отвечает ошибкой 56 «не чаще чем 1 раз в 10 секунд»: файл может идти сразу за
// smoke statistics.
const REPORT_INTERVAL_MS = 11_000

describe.skipIf(!CONFIGURED)("smoke search-queries", () => {
  it("принимает поля по умолчанию", { timeout: 120_000 }, async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, REPORT_INTERVAL_MS))
    const params = getSearchQueriesSchema.parse({
      campaign_ids: [await firstCampaignId()],
      date_from: yesterday,
      date_to: yesterday
    })

    const tsv = await handleGetSearchQueries(params)

    expect(tsv.split("\n")[0].split("\t")).toEqual(DEFAULT_FIELDS)
  })
})
