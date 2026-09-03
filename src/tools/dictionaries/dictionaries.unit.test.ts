// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it, vi } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleGetRegions } from "./handler.js"

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
    mockFetch.mockReset()
    mockFetch.mockResolvedValue(okResponse(REGIONS))
  })

  it("фильтрует справочник по подстроке без учёта регистра", async () => {
    const output = await handleGetRegions({ search: "МОСКВА", limit: 50 })

    expect(output).toContain("Москва и область")
    expect(output).not.toContain("Новосибирск")
  })

  // Кэш живёт в переменной модуля, поэтому запрос проверяется на свежем импорте:
  // иначе тест зависел бы от того, загрузил ли справочник кто-то до него.
  it("забирает GeoRegions одним запросом и дальше в сеть не ходит", async () => {
    vi.resetModules()
    const { handleGetRegions: freshHandleGetRegions } = await import("./handler.js")

    await freshHandleGetRegions({ limit: 50 })
    await freshHandleGetRegions({ limit: 50 })

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
})
