// Сетевой smoke: поля по умолчанию SEARCH_QUERY_PERFORMANCE_REPORT Директ принимает и отдаёт
// столбцами в том же порядке. Только чтение; отчёт расходует свой дневной лимит, период узкий.
import { describe, expect, it } from "vitest"
import { CONFIGURED, firstCampaignId } from "#testing/smoke"
import { DEFAULT_FIELDS, handleGetSearchQueries } from "./handler.js"
import { getSearchQueriesSchema } from "./schema.js"

const DAY_MS = 86_400_000
// biome-ignore lint/plugin/determinism: сетевой тест берёт вчерашний день боевого аккаунта
const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)

describe.skipIf(!CONFIGURED)("smoke search-queries", () => {
  it("принимает поля по умолчанию", { timeout: 120_000 }, async () => {
    const params = getSearchQueriesSchema.parse({
      campaign_ids: [await firstCampaignId()],
      date_from: yesterday,
      date_to: yesterday
    })

    const tsv = await handleGetSearchQueries(params)

    expect(tsv.split("\n")[0].split("\t")).toEqual(DEFAULT_FIELDS)
  })
})
