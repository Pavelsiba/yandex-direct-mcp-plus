// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleListSitelinks, handleSetSitelinks } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_sitelinks", () => {
  beforeEach(() => mockFetch.mockReset())

  it("не отправляет SelectionCriteria, когда наборы не названы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SitelinksSets: [] } }))

    await handleListSitelinks({})

    expect(lastBody().params.SelectionCriteria).toBeUndefined()
  })

  it("отбирает конкретные наборы по ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { SitelinksSets: [] } }))

    await handleListSitelinks({ sitelink_set_ids: ["123"] })

    expect(lastBody().params.SelectionCriteria).toEqual({ Ids: [123] })
  })
})

describe("set_sitelinks", () => {
  beforeEach(() => mockFetch.mockReset())

  it("создаёт набор целиком: дописать ссылку в существующий Директ не умеет", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleSetSitelinks({
      sitelinks: [
        { title: "Доставка", href: "https://example.com/delivery", description: "За час" },
        { title: "Контакты" }
      ]
    })

    expect(lastBody().method).toBe("add")
    expect(lastBody().params.SitelinksSets).toEqual([
      {
        Sitelinks: [
          { Title: "Доставка", Href: "https://example.com/delivery", Description: "За час" },
          { Title: "Контакты" }
        ]
      }
    ])
  })
})
