// Сетевой smoke: форма ответа bidmodifiers.get на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, firstCampaignId, smokeRead } from "#testing/smoke"

// Значение корректировки лежит в объекте своего типа: MobileAdjustment, RegionalAdjustment
// и соседи. Имена этих объектов — не поля BidModifierFieldEnum, но у каждого есть своё
// перечисление, и имя объекта — это имя перечисления без суффикса.
const ADJUSTMENT_KEYS = Object.keys(API_FIELDS.bidmodifiers)
  .filter((name) => name.endsWith("AdjustmentFieldEnum"))
  .map((name) => name.replace(/FieldEnum$/, ""))

const FIELDS = [...API_FIELDS.bidmodifiers.BidModifierFieldEnum, ...ADJUSTMENT_KEYS]

describe.skipIf(!CONFIGURED)("smoke bidmodifiers.get", () => {
  it("принимает весь BidModifierFieldEnum и отдаёт корректировки известной формы", async () => {
    await smokeRead({
      service: "bidmodifiers",
      method: "get",
      params: {
        SelectionCriteria: { CampaignIds: [BigInt(await firstCampaignId())], Levels: ["CAMPAIGN"] },
        FieldNames: [...API_FIELDS.bidmodifiers.BidModifierFieldEnum],
        Page: { Limit: 5 }
      },
      collection: "BidModifiers",
      fields: FIELDS,
      money: false
    })
  })
})
