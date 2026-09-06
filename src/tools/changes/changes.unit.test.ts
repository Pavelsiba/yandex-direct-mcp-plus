// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleGetChanges } from "./handler.js"

installFetchMock()

const TIMESTAMP = "2026-09-03T00:00:00Z"

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("get_changes", () => {
  beforeEach(() => mockFetch.mockReset())

  it("в режиме campaigns спрашивает только момент времени", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Campaigns: [] } }))

    await handleGetChanges({ mode: "campaigns", timestamp: TIMESTAMP })

    expect(lastBody().method).toBe("checkCampaigns")
    expect(lastBody().params).toEqual({ Timestamp: TIMESTAMP })
  })

  it("в режиме objects просит изменения того типа, который выбран", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Modified: {} } }))

    await handleGetChanges({ mode: "objects", timestamp: TIMESTAMP, ad_group_ids: ["123"] })

    expect(lastBody().method).toBe("check")
    expect(lastBody().params).toEqual({ Timestamp: TIMESTAMP, FieldNames: ["AdGroupIds"], AdGroupIds: [123] })
  })

  it("не смешивает селекторы разных уровней", async () => {
    await expect(
      handleGetChanges({ mode: "objects", timestamp: TIMESTAMP, campaign_ids: ["123"], ad_ids: ["456"] })
    ).rejects.toThrow("ровно один")

    await expect(handleGetChanges({ mode: "objects", timestamp: TIMESTAMP })).rejects.toThrow("ровно один")

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("в режиме dictionaries спрашивает справочники, а без времени — только время сервера", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ result: { RegionsChanged: "YES", Timestamp: TIMESTAMP } }))
      .mockResolvedValueOnce(okResponse({ result: { Timestamp: TIMESTAMP } }))

    const changed = await handleGetChanges({ mode: "dictionaries", timestamp: TIMESTAMP })
    expect(lastBody().method).toBe("checkDictionaries")
    expect(lastBody().params).toEqual({ Timestamp: TIMESTAMP })
    expect(changed).toContain("YES")

    await handleGetChanges({ mode: "dictionaries" })
    expect(lastBody().params).toEqual({})
  })

  it("требует момент времени во всех режимах, кроме справочников", async () => {
    await expect(handleGetChanges({ mode: "campaigns" })).rejects.toThrow("timestamp")
    await expect(handleGetChanges({ mode: "objects", campaign_ids: ["123"] })).rejects.toThrow("timestamp")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("отдаёт предпочтение явно названным полям", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Modified: {} } }))

    await handleGetChanges({
      mode: "objects",
      timestamp: TIMESTAMP,
      campaign_ids: ["123"],
      field_names: ["CampaignsStat"]
    })

    expect(lastBody().params.FieldNames).toEqual(["CampaignsStat"])
  })
})
