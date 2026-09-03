// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleAddAdExtensions, handleDeleteAdExtensions, handleListAdExtensions } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_ad_extensions", () => {
  beforeEach(() => mockFetch.mockReset())

  it("всегда ограничивает выборку уточнениями", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdExtensions: [] } }))

    await handleListAdExtensions({})

    expect(lastBody().params.SelectionCriteria).toEqual({ Types: ["CALLOUT"] })
  })

  it("добавляет фильтры по состоянию и статусу к типу", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdExtensions: [] } }))

    await handleListAdExtensions({ ad_extension_ids: ["123"], states: ["ON"], statuses: ["ACCEPTED"] })

    expect(lastBody().params.SelectionCriteria).toEqual({
      Types: ["CALLOUT"],
      Ids: [123],
      States: ["ON"],
      Statuses: ["ACCEPTED"]
    })
  })
})

describe("add_ad_extensions", () => {
  beforeEach(() => mockFetch.mockReset())

  it("оборачивает каждый текст в Callout", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleAddAdExtensions({ callouts: ["Доставка за час", "Свежий улов"] })

    expect(lastBody().params.AdExtensions).toEqual([
      { Callout: { CalloutText: "Доставка за час" } },
      { Callout: { CalloutText: "Свежий улов" } }
    ])
  })
})

describe("delete_ad_extensions", () => {
  beforeEach(() => mockFetch.mockReset())

  it("удаляет уточнения по ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [] } }))

    await handleDeleteAdExtensions({ ad_extension_ids: ["123", "456"] })

    expect(lastBody().method).toBe("delete")
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })
})
