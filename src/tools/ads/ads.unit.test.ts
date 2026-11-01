// biome-ignore-all lint/plugin/no-native-json: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, lastRequestUrl, mockFetch, okResponse } from "#testing/fetch-mock"
import {
  handleCreateResponsiveAd,
  handleListAds,
  handleManageAds,
  handleModerateAds,
  handleUpdateResponsiveAd
} from "./handler.js"
import { createResponsiveAdSchema, listAdsSchema } from "./schema.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_ads", () => {
  beforeEach(() => mockFetch.mockReset())

  it("запрашивает все заголовки и тексты в полях комбинаторного объявления", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"] })

    expect(lastBody().params.ResponsiveAdFieldNames).toEqual(expect.arrayContaining(["Titles", "Texts", "Href"]))
    expect(lastBody().params).not.toHaveProperty("TextAdFieldNames")
  })

  it("запрашивает тип объявления и пояснение модерации", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"] })

    expect(lastBody().params.FieldNames).toEqual(
      expect.arrayContaining(["Type", "Subtype", "StatusClarification", "AdCategories", "AgeLabel"])
    )
  })

  it("берёт поля комбинаторного объявления из перечисления, кроме объектов модерации", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"] })

    const fields: string[] = lastBody().params.ResponsiveAdFieldNames
    expect(fields).toEqual(
      expect.arrayContaining(["SitelinkSetId", "AdImages", "VideoExtensions", "BusinessId", "AdExtensions"])
    )
    expect(fields.filter((field) => field.endsWith("Moderation"))).toEqual([])
  })

  it("отдаёт заголовки, тексты и привязки комбинаторного объявления без потери разрядности", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse(
        '{"result":{"Ads":[{"Id":1919964803537252737,"Type":"RESPONSIVE_AD","ResponsiveAd":{' +
          '"Titles":[{"Title":"Свежий улов","Status":"ACCEPTED"},{"Title":"Раки с доставкой","Status":"ACCEPTED"}],' +
          '"Texts":[{"Text":"Доставка за час","Status":"ACCEPTED"}],"SitelinkSetId":1234567890123456789}}]}}'
      )
    )

    const output = await handleListAds({ ad_group_ids: ["123"] })

    expect(output).toContain('"Id": "1919964803537252737"')
    expect(output).toContain('"Title": "Раки с доставкой"')
    expect(output).toContain('"SitelinkSetId": "1234567890123456789"')
  })

  // Голый `{ "result": {} }` модель читает как поломку инструмента и додумывает причину.
  it("объясняет пустой ответ, в котором Директ не прислал даже ключ Ads", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: {} }))

    const output = await handleListAds({ ad_group_ids: ["123"] })

    expect(output).toContain("Причин две")
    expect(output).toContain("статистика накопительная")
  })

  it("не подсказывает ничего, когда объявления нашлись", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [{ Id: "1234567890123456789" }] } }))

    const output = await handleListAds({ ad_group_ids: ["123"] })

    expect(output).not.toContain("Причин две")
    expect(output.trimStart().startsWith("{")).toBe(true)
  })

  it("переносит все отборы в SelectionCriteria, а ID — числами без потери точности", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({
      ad_ids: ["1919964803537252737"],
      campaign_ids: ["714159718"],
      states: ["ON", "SUSPENDED"],
      statuses: ["REJECTED"],
      types: ["TEXT_AD", "RESPONSIVE_AD"]
    })

    expect(lastRawBody()).toContain('"Ids":[1919964803537252737]')
    expect(lastBody().params.SelectionCriteria).toEqual({
      Ids: [expect.any(Number)],
      CampaignIds: [714159718],
      States: ["ON", "SUSPENDED"],
      Statuses: ["REJECTED"],
      Types: ["TEXT_AD", "RESPONSIVE_AD"]
    })
  })

  it("не шлёт пустых отборов", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"], states: [] })

    expect(lastBody().params.SelectionCriteria).toEqual({ AdGroupIds: [123] })
  })
})

describe("listAdsSchema", () => {
  it("отклоняет вызов без ID объявлений, групп и кампаний", () => {
    const result = listAdsSchema.safeParse({ states: ["ON"], ad_group_ids: [] })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("ad_ids, ad_group_ids, campaign_ids")
  })

  it("принимает отбор по одной кампании", () => {
    expect(listAdsSchema.safeParse({ campaign_ids: ["714159718"] }).success).toBe(true)
  })

  it("отклоняет больше десяти кампаний — потолок Ads.get", () => {
    const campaignIds = Array.from({ length: 11 }, (_, index) => String(index + 1))

    expect(listAdsSchema.safeParse({ campaign_ids: campaignIds }).success).toBe(false)
  })
})

describe("create_responsive_ad", () => {
  beforeEach(() => mockFetch.mockReset())

  it("создаёт ResponsiveAd через v501", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleCreateResponsiveAd({
      ad_group_id: "1915016273214320641",
      titles: ["Свежий улов", "Раки с доставкой"],
      texts: ["Доставка за час"],
      href: "https://example.com"
    })

    expect(lastRequestUrl()).toBe("https://api.direct.yandex.com/json/v501/ads")
    expect(lastBody().params.Ads[0].ResponsiveAd).toEqual({
      Titles: ["Свежий улов", "Раки с доставкой"],
      Texts: ["Доставка за час"],
      Href: "https://example.com"
    })
    expect(lastRawBody()).toContain('"AdGroupId":1915016273214320641')
  })

  it("не принимает больше 7 заголовков и больше 3 текстов", () => {
    const base = { ad_group_id: "123", href: "https://example.com" }

    expect(
      createResponsiveAdSchema.safeParse({ ...base, titles: Array(8).fill("Заголовок"), texts: ["Текст"] }).success
    ).toBe(false)
    expect(
      createResponsiveAdSchema.safeParse({ ...base, titles: ["Заголовок"], texts: Array(4).fill("Текст") }).success
    ).toBe(false)
    expect(createResponsiveAdSchema.safeParse({ ...base, titles: [], texts: ["Текст"] }).success).toBe(false)
  })
})

describe("update_responsive_ad", () => {
  beforeEach(() => mockFetch.mockReset())

  it("шлёт через v501 только те поля, которые переданы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleUpdateResponsiveAd({ ad_id: "1925678256797749363", texts: ["Новый текст"] })

    expect(lastRequestUrl()).toBe("https://api.direct.yandex.com/json/v501/ads")
    expect(lastBody().params.Ads[0].ResponsiveAd).toEqual({ Texts: ["Новый текст"] })
    expect(lastRawBody()).toContain('"Id":1925678256797749363')
  })

  it("отказывается работать вхолостую", async () => {
    await expect(handleUpdateResponsiveAd({ ad_id: "123" })).rejects.toThrow("Нечего обновлять")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("manage_ads", () => {
  beforeEach(() => mockFetch.mockReset())

  it("вызывает метод API по имени действия", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { ArchiveResults: [] } }))

    await handleManageAds({ ad_ids: ["123", "456"], action: "archive" })

    expect(lastBody().method).toBe("archive")
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })
})

describe("moderate_ads", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет объявления на модерацию методом moderate", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { ModerateResults: [] } }))

    await handleModerateAds({ ad_ids: ["123"] })

    expect(lastBody().method).toBe("moderate")
  })
})
