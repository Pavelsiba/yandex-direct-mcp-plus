// biome-ignore-all lint/plugin: тест разбирает тело запроса; ID в фикстурах заданы сырой строкой
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleAddVcard, handleListVcards } from "./handler.js"

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

describe("add_vcard", () => {
  beforeEach(() => mockFetch.mockReset())

  it("собирает телефон из частей и пропускает незаполненные поля адреса", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleAddVcard({
      campaign_id: "123",
      country: "Россия",
      city: "Новосибирск",
      company_name: "Свежий улов",
      work_time: "1#5#9#0#18#0",
      phone_country_code: "+7",
      phone_city_code: "383",
      phone_number: "1234567",
      street: "Ленина"
    })

    const vcard = bodyOf(0).params.VCards[0]
    expect(vcard.Phone).toEqual({ CountryCode: "+7", CityCode: "383", PhoneNumber: "1234567" })
    expect(vcard.Street).toBe("Ленина")
    expect(vcard).not.toHaveProperty("House")
    expect(vcard).not.toHaveProperty("ContactEmail")
  })

  it("отправляет добавочный номер и станцию метро, когда они заданы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleAddVcard({
      campaign_id: "123",
      country: "Россия",
      city: "Новосибирск",
      company_name: "Свежий улов",
      work_time: "1#5#9#0#18#0",
      phone_country_code: "+7",
      phone_city_code: "383",
      phone_number: "1234567",
      phone_extension: "101",
      metro_station_id: "20370"
    })

    expect(bodyOf(0).params.VCards[0].Phone.Extension).toBe("101")
    expect(lastRawBody()).toContain('"MetroStationId":20370')
  })
})
