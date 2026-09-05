// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { clearDictionaryCache, handleGetRegions, handleListTimeZones } from "./handler.js"

installFetchMock()

const REGIONS = {
  result: {
    GeoRegions: [
      { GeoRegionId: 225, GeoRegionName: "Россия" },
      { GeoRegionId: 213, GeoRegionName: "Москва" },
      { GeoRegionId: 1, GeoRegionName: "Москва и область" },
      { GeoRegionId: 65, GeoRegionName: "Новосибирск" }
    ]
  }
}

describe("get_regions", () => {
  beforeEach(() => {
    clearDictionaryCache()
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(okResponse(REGIONS))
  })

  it("фильтрует справочник по подстроке без учёта регистра", async () => {
    const output = await handleGetRegions({ search: "МОСКВА", limit: 50 })

    expect(output).toContain("Москва и область")
    expect(output).not.toContain("Новосибирск")
  })

  it("забирает GeoRegions одним запросом и дальше в сеть не ходит", async () => {
    await handleGetRegions({ limit: 50 })
    await handleGetRegions({ limit: 50 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(lastRawBody()).params).toEqual({ DictionaryNames: ["GeoRegions"] })
  })

  it("сообщает, что показал не все совпадения", async () => {
    const output = await handleGetRegions({ search: "москва", limit: 1 })

    expect(output).toContain("Показано 1 из 2")
  })

  it("отдаёт весь справочник, когда фильтра нет", async () => {
    const output = await handleGetRegions({ limit: 50 })

    expect(JSON.parse(output)).toHaveLength(4)
  })

  // Директ добавляет поля без предупреждения: схема нестрогая, и новое поле обязано
  // доехать до вывода, а не отвалиться на разборе.
  it("пропускает наружу поля, которых нет в схеме", async () => {
    mockFetch.mockResolvedValue(
      okResponse({ result: { GeoRegions: [{ GeoRegionId: 225, GeoRegionName: "Россия", GeoRegionType: "COUNTRY" }] } })
    )

    expect(await handleGetRegions({ limit: 50 })).toContain("COUNTRY")
  })

  it("сообщает, когда в записи справочника нет поля, на которое опирается инструмент", async () => {
    mockFetch.mockResolvedValue(okResponse({ result: { GeoRegions: [{ GeoRegionName: "Россия" }] } }))

    await expect(handleGetRegions({ limit: 50 })).rejects.toThrow(/GeoRegions в неожиданной форме/)
  })
})

const TIME_ZONES = {
  result: {
    TimeZones: [
      { TimeZone: "Europe/Moscow", TimeZoneName: "Москва", UtcOffset: 10800 },
      { TimeZone: "Asia/Yekaterinburg", TimeZoneName: "Екатеринбург", UtcOffset: 18000 },
      { TimeZone: "Asia/Vladivostok", TimeZoneName: "Владивосток", UtcOffset: 36000 }
    ]
  }
}

describe("list_time_zones", () => {
  beforeEach(() => {
    clearDictionaryCache()
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(okResponse(TIME_ZONES))
  })

  // Модель приходит то с кодом пояса, то с русским названием города.
  it("ищет и по коду пояса, и по названию", async () => {
    expect(await handleListTimeZones({ search: "moscow", limit: 50 })).toContain("Europe/Moscow")
    expect(await handleListTimeZones({ search: "екатеринбург", limit: 50 })).toContain("Asia/Yekaterinburg")
  })

  it("забирает TimeZones своим запросом и кэширует его отдельно от регионов", async () => {
    await handleListTimeZones({ limit: 50 })
    await handleListTimeZones({ limit: 50 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(JSON.parse(lastRawBody()).params).toEqual({ DictionaryNames: ["TimeZones"] })
  })
})
