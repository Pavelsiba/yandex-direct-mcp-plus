// Сетевой smoke: форма ответа campaigns.get на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, expectRubles, resultItems, smokeRead } from "#testing/smoke"

const FIELDS = API_FIELDS.campaigns.CampaignFieldEnum

describe.skipIf(!CONFIGURED)("smoke campaigns.get", () => {
  it("принимает весь CampaignFieldEnum и отдаёт кампании известной формы", async () => {
    const { raw, output } = await smokeRead({
      service: "campaigns",
      method: "get",
      params: { FieldNames: [...FIELDS], Page: { Limit: 5 } },
      collection: "Campaigns",
      fields: FIELDS
    })

    expectRubles(firstBudget(raw), firstBudget(output))
  })
})

type Campaign = { DailyBudget?: { Amount?: unknown } }

function firstBudget(payload: unknown): unknown {
  return resultItems<Campaign>(payload, "Campaigns").find((campaign) => campaign.DailyBudget)?.DailyBudget?.Amount
}
