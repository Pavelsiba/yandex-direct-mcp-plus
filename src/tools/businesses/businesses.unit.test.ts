// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleListBusinesses } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_businesses", () => {
  beforeEach(() => mockFetch.mockReset())

  it("не отправляет SelectionCriteria, когда профили не названы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Businesses: [] } }))

    await handleListBusinesses({})

    expect(lastBody().params.SelectionCriteria).toBeUndefined()
  })

  it("отбирает конкретные профили по ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Businesses: [] } }))

    await handleListBusinesses({ business_ids: ["1915016273214320641"] })

    expect(lastRawBody()).toContain('"Ids":[1915016273214320641]')
  })
})
