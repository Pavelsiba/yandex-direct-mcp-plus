// Сетевой smoke: форма ответа keywords.get и bids.get на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, expectRubles, firstAdGroupId, smokeRead } from "#testing/smoke"

const KEYWORD_FIELDS = API_FIELDS.keywords.KeywordFieldEnum
const BID_FIELDS = API_FIELDS.bids.BidFieldEnum

describe.skipIf(!CONFIGURED)("smoke keywords", () => {
  it("keywords.get принимает весь KeywordFieldEnum и отдаёт ставки в рублях", async () => {
    const adGroupId = await firstAdGroupId()
    const { raw, output } = await smokeRead({
      service: "keywords",
      method: "get",
      params: { SelectionCriteria: { AdGroupIds: [BigInt(adGroupId)] }, FieldNames: [...KEYWORD_FIELDS] },
      collection: "Keywords",
      fields: KEYWORD_FIELDS
    })

    expectRubles(firstBid(raw, "Keywords"), firstBid(output, "Keywords"))
  })

  it("bids.get принимает весь BidFieldEnum и отдаёт цены аукциона в рублях", async () => {
    const adGroupId = await firstAdGroupId()
    const { raw, output } = await smokeRead({
      service: "bids",
      method: "get",
      params: { SelectionCriteria: { AdGroupIds: [BigInt(adGroupId)] }, FieldNames: [...BID_FIELDS] },
      collection: "Bids",
      fields: BID_FIELDS
    })

    expectRubles(firstBid(raw, "Bids"), firstBid(output, "Bids"))
  })
})

function firstBid(payload: unknown, collection: string): unknown {
  const items = (payload as { result: Record<string, { Bid?: unknown }[]> }).result[collection]
  return items.find((item) => typeof item.Bid === "number")?.Bid
}
