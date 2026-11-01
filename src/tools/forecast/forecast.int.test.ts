// Сетевой smoke: прогноз Live v4 жив, а ответ сходится со схемой и таблицей, на которые
// опирается описание инструмента. Кампании не трогает, отчёт удаляется тем же вызовом.
import { describe, expect, it } from "vitest"
import { CONFIGURED } from "#testing/smoke"
import { handleGetKeywordForecast } from "./handler.js"
import { getKeywordForecastSchema } from "./schema.js"

describe.skipIf(!CONFIGURED)("smoke forecast", () => {
  it("строка на фразу с числами во всех колонках, включая торги", { timeout: 120_000 }, async () => {
    const params = getKeywordForecastSchema.parse({
      phrases: ["купить велосипед"],
      region_ids: ["225"],
      auction_bids: true
    })

    const lines = (await handleGetKeywordForecast(params)).split("\n")
    const header = lines[2].split("\t")
    const row = lines[3].split("\t")

    expect(header.slice(0, 4)).toEqual(["Phrase", "Shows", "Clicks", "CTR"])
    expect(header).toContain("P11 Bid")
    expect(row[0]).toBe("купить велосипед")
    expect(row.slice(1).filter((value) => Number.isNaN(Number.parseFloat(value)))).toEqual([])
    expect(lines.at(-1)).toMatch(/^Итого по всем фразам: Shows \d+/)
  })
})
