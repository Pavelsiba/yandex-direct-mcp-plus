// Сетевые тесты keywords: smoke формы ответа (только чтение) и запись автотаргетинга на
// кампанию-полигон. ID полигона — из окружения: без YANDEX_DIRECT_POLYGON_CAMPAIGN_ID
// пишущие кейсы пропускаются.
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, expectRubles, firstAdGroupId, smokeRead } from "#testing/smoke"
import { handleUpdateKeywords } from "./handler.js"

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

const POLYGON = process.env.YANDEX_DIRECT_POLYGON_CAMPAIGN_ID
const POLYGON_CONFIGURED = Boolean(POLYGON && CONFIGURED)

type YesNo = "YES" | "NO"
type Settings = {
  Categories: { Exact: YesNo; Narrow: YesNo; Alternative: YesNo; Accessory: YesNo; Broader: YesNo }
  BrandOptions: { WithoutBrands: YesNo; WithAdvertiserBrand: YesNo; WithCompetitorsBrand: YesNo }
}
type AutotargetingKeyword = { Id: unknown; Keyword: string; AutotargetingSettings?: Settings }

const opposite = (value: YesNo): YesNo => (value === "YES" ? "NO" : "YES")

async function findAutotargeting(): Promise<{ id: string; settings: Settings }> {
  const data = await apiPost("keywords", "get", {
    SelectionCriteria: { CampaignIds: [POLYGON] },
    FieldNames: ["Id", "Keyword"],
    AutotargetingSettingsCategoriesFieldNames: [...API_FIELDS["general.xsd"].AutotargetingCategoriesFieldEnum],
    AutotargetingSettingsBrandOptionsFieldNames: [...API_FIELDS["general.xsd"].AutotargetingBrandOptionsFieldEnum]
  })
  const keywords = (data as { result?: { Keywords?: AutotargetingKeyword[] } }).result?.Keywords ?? []
  const autotargeting = keywords.find((keyword) => keyword.Keyword === "---autotargeting")
  if (!autotargeting?.AutotargetingSettings) throw new Error(`У полигона ${POLYGON} нет фразы ---autotargeting`)
  return { id: String(autotargeting.Id), settings: autotargeting.AutotargetingSettings }
}

const toFlags = (settings: Settings) => {
  const { Categories: categories, BrandOptions: brands } = settings
  return {
    autotargeting_categories: {
      exact: categories.Exact,
      narrow: categories.Narrow,
      alternative: categories.Alternative,
      accessory: categories.Accessory,
      broader: categories.Broader
    },
    autotargeting_brand_options: {
      without_brands: brands.WithoutBrands,
      with_advertiser_brand: brands.WithAdvertiserBrand,
      with_competitors_brand: brands.WithCompetitorsBrand
    }
  }
}

describe.skipIf(!POLYGON_CONFIGURED)("автотаргетинг полигона против боевого API", () => {
  let keywordId = ""
  let original: Settings

  // Кампания вне черновика может показываться и тратить деньги: тест на неё не пишет и падает.
  beforeAll(async () => {
    const data = await apiPost("campaigns", "get", {
      SelectionCriteria: { Ids: [POLYGON] },
      FieldNames: ["Id", "Status", "State"]
    })
    const campaign = (data as { result?: { Campaigns?: { Status?: string; State?: string }[] } }).result?.Campaigns?.[0]
    expect(
      { Status: campaign?.Status, State: campaign?.State },
      `Кампания-полигон ${POLYGON} вышла из черновика — писать в неё нельзя`
    ).toEqual({ Status: "DRAFT", State: "OFF" })

    const found = await findAutotargeting()
    keywordId = found.id
    original = found.settings
  })

  afterAll(async () => {
    if (keywordId) await handleUpdateKeywords({ keywords: [{ keyword_id: keywordId, ...toFlags(original) }] })
  })

  it("одна переданная категория меняется, остальные флаги остаются прежними", async () => {
    const accessory = opposite(original.Categories.Accessory)

    await handleUpdateKeywords({ keywords: [{ keyword_id: keywordId, autotargeting_categories: { accessory } }] })

    const { settings } = await findAutotargeting()
    expect(settings).toEqual({ ...original, Categories: { ...original.Categories, Accessory: accessory } })
  })

  it("один переданный флаг брендов меняется, остальные флаги остаются прежними", async () => {
    const before = (await findAutotargeting()).settings
    const withCompetitorsBrand = opposite(before.BrandOptions.WithCompetitorsBrand)

    await handleUpdateKeywords({
      keywords: [
        { keyword_id: keywordId, autotargeting_brand_options: { with_competitors_brand: withCompetitorsBrand } }
      ]
    })

    const { settings } = await findAutotargeting()
    expect(settings).toEqual({
      ...before,
      BrandOptions: { ...before.BrandOptions, WithCompetitorsBrand: withCompetitorsBrand }
    })
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
