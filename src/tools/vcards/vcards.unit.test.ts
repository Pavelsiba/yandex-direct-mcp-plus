// biome-ignore-all lint/plugin: тест разбирает тело запроса; ID в фикстурах заданы сырой строкой
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleDeleteVcards, handleListVcards } from "./handler.js"

installFetchMock()

function bodyOf(call: number) {
  return JSON.parse(mockFetch.mock.calls[call][1].body)
}

describe("list_vcards", () => {
  beforeEach(() => mockFetch.mockReset())

  it("ищет визитки кампаний через объявления и объединяет их с явными ID", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse('{"result":{"Ads":[{"TextAd":{"VCardId":1915016273214320641}}]}}'))
      .mockResolvedValueOnce(okResponse({ result: { VCards: [] } }))

    await handleListVcards({ vcard_ids: ["777"], campaign_ids: ["123"] })

    expect(bodyOf(0).method).toBe("get")
    expect(bodyOf(0).params.TextAdFieldNames).toEqual(["VCardId"])
    expect(lastRawBody()).toContain('"Ids":[777,1915016273214320641]')
  })

  it("не повторяет один и тот же ID визитки", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse({ result: { Ads: [{ TextAd: { VCardId: 777 } }, { TextAd: { VCardId: 777 } }] } })
      )
      .mockResolvedValueOnce(okResponse({ result: { VCards: [] } }))

    await handleListVcards({ vcard_ids: ["777"], campaign_ids: ["123"] })

    expect(lastRawBody()).toContain('"Ids":[777]')
  })

  it("отдаёт пустой результат, не запрашивая визитки, которых нет", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Ads: [{ TextAd: {} }] } }))

    const output = await handleListVcards({ campaign_ids: ["123"] })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(output)).toEqual({ result: { VCards: [] } })
  })

  it("отказывается искать вообще без критериев", async () => {
    await expect(handleListVcards({})).rejects.toThrow("vcard_ids и/или campaign_ids")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("delete_vcards", () => {
  beforeEach(() => mockFetch.mockReset())

  it("удаляет визитки по ID, сохраняя точность длинных ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [{ Id: 777 }] } }))

    await handleDeleteVcards({ vcard_ids: ["777", "1915016273214320641"] })

    expect(bodyOf(0).method).toBe("delete")
    expect(lastRawBody()).toContain('"Ids":[777,1915016273214320641]')
  })
})
