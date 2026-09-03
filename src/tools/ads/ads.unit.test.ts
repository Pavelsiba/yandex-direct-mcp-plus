// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleCreateTextAd, handleListAds, handleManageAds, handleModerateAds, handleUpdateTextAd } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_ads", () => {
  beforeEach(() => mockFetch.mockReset())

  it("запрашивает тексты вместе со списком объявлений", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [] } }))

    await handleListAds({ ad_group_ids: ["123"] })

    expect(lastBody().params.TextAdFieldNames).toContain("Title")
    expect(lastBody().params.TextAdFieldNames).toContain("Href")
  })
})

describe("create_text_ad", () => {
  beforeEach(() => mockFetch.mockReset())

  it("не отправляет Title2, когда второго заголовка нет", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleCreateTextAd({
      ad_group_id: "1915016273214320641",
      title: "Свежий улов",
      text: "Доставка за час",
      href: "https://example.com"
    })

    expect(lastBody().params.Ads[0].TextAd).toEqual({
      Title: "Свежий улов",
      Text: "Доставка за час",
      Href: "https://example.com"
    })
    expect(lastRawBody()).toContain('"AdGroupId":1915016273214320641')
  })
})

describe("create_text_ad со вторым заголовком", () => {
  beforeEach(() => mockFetch.mockReset())

  it("добавляет Title2, когда второй заголовок передан", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleCreateTextAd({
      ad_group_id: "123",
      title: "Свежий улов",
      title2: "Доставка по городу",
      text: "Доставка за час",
      href: "https://example.com"
    })

    expect(lastBody().params.Ads[0].TextAd.Title2).toBe("Доставка по городу")
  })
})

describe("update_text_ad", () => {
  beforeEach(() => mockFetch.mockReset())

  it("шлёт только те поля, которые переданы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleUpdateTextAd({ ad_id: "123", text: "Новый текст" })

    expect(lastBody().params.Ads[0].TextAd).toEqual({ Text: "Новый текст" })
  })

  it("отказывается работать вхолостую", async () => {
    await expect(handleUpdateTextAd({ ad_id: "123" })).rejects.toThrow("Нечего обновлять")
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
