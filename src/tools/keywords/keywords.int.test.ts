// Сетевой smoke: форма ответа keywords.get и keywordbids.get на боевом API. Только чтение.
import { describe, expect, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, expectRubles, firstAdGroupId, smokeRead } from "#testing/smoke"

const KEYWORD_FIELDS = API_FIELDS.keywords.KeywordFieldEnum
const BID = API_FIELDS.keywordbids

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

  it("keywordbids.get принимает все наборы полей и отдаёт торги в рублях", async () => {
    const adGroupId = await firstAdGroupId()
    const { raw, output } = await smokeRead({
      service: "keywordbids",
      method: "get",
      params: {
        SelectionCriteria: { AdGroupIds: [BigInt(adGroupId)] },
        FieldNames: [...BID.KeywordBidFieldEnum],
        SearchFieldNames: [...BID.KeywordBidSearchFieldEnum],
        NetworkFieldNames: [...BID.KeywordBidNetworkFieldEnum]
      },
      collection: "KeywordBids",
      fields: [...BID.KeywordBidFieldEnum, "Search", "Network"]
    })

    const [rawItem, outputItem] = [firstAuctionItem(raw), firstAuctionItem(output)]
    expect(Object.keys(rawItem ?? {}).sort(), "форма элемента торгов на поиске").toEqual([
      "Bid",
      "Price",
      "TrafficVolume"
    ])
    expectRubles(rawItem?.Bid, outputItem?.Bid)
    expectRubles(rawItem?.Price, outputItem?.Price)
  })
})

type AuctionItem = { TrafficVolume: number; Bid: number; Price: number }

function firstAuctionItem(payload: unknown): AuctionItem | undefined {
  const items = (
    payload as { result: { KeywordBids: { Search?: { AuctionBids?: { AuctionBidItems?: AuctionItem[] } } }[] } }
  ).result.KeywordBids
  return items.flatMap((item) => item.Search?.AuctionBids?.AuctionBidItems ?? [])[0]
}

function firstBid(payload: unknown, collection: string): unknown {
  const items = (payload as { result: Record<string, { Bid?: unknown }[]> }).result[collection]
  return items.find((item) => typeof item.Bid === "number")?.Bid
}
