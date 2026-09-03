// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleCreateAdGroup, handleDeleteAdGroups, handleListAdGroups } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_ad_groups", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отбирает группы по кампаниям, не потеряв точность ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdGroups: [] } }))

    await handleListAdGroups({ campaign_ids: ["1915016273214320641"] })

    expect(lastRawBody()).toContain('"CampaignIds":[1915016273214320641]')
  })
})

describe("create_ad_group", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет регионы числами, а кампанию — отдельным полем", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleCreateAdGroup({ campaign_id: "123", name: "Крабы", region_ids: ["225", "213"] })

    expect(lastBody().params.AdGroups[0].Name).toBe("Крабы")
    expect(lastRawBody()).toContain('"RegionIds":[225,213]')
  })
})

describe("delete_ad_groups", () => {
  beforeEach(() => mockFetch.mockReset())

  it("удаляет группы одним вызовом метода delete", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [] } }))

    await handleDeleteAdGroups({ ad_group_ids: ["123", "456"] })

    expect(lastBody().method).toBe("delete")
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })
})
