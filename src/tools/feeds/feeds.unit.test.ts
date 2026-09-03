// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleListFeeds } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_feeds", () => {
  beforeEach(() => mockFetch.mockReset())

  it("запрашивает поля обоих источников: фид бывает файлом и ссылкой", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Feeds: [] } }))

    await handleListFeeds({})

    const { params } = lastBody()
    expect(params.SelectionCriteria).toBeUndefined()
    expect(params.FileFeedFieldNames).toEqual(["Filename"])
    expect(params.UrlFeedFieldNames).toContain("Url")
  })

  it("отбирает конкретные фиды по ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Feeds: [] } }))

    await handleListFeeds({ feed_ids: ["123"] })

    expect(lastBody().params.SelectionCriteria).toEqual({ Ids: [123] })
  })
})
