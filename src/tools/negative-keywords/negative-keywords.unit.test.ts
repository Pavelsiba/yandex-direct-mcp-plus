// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import {
  handleGetCampaignNegativeKeywords,
  handleLinkNegativeKeywordSets,
  handleListNegativeKeywordSharedSets,
  handleManageNegativeKeywordSharedSets,
  handleSetAdGroupNegativeKeywords,
  handleSetCampaignNegativeKeywords
} from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("get_campaign_negative_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("читает минус-фразы кампаний сервисом campaigns", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Campaigns: [] } }))

    await handleGetCampaignNegativeKeywords({ campaign_ids: ["123", "456"] })

    expect(lastBody().params.FieldNames).toEqual(["Id", "Name", "NegativeKeywords"])
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })
})

describe("set_campaign_negative_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет присланный список целиком: Директ затирает прежний", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: ["бесплатно", "своими руками"] })

    expect(lastBody().params.Campaigns[0].NegativeKeywords).toEqual({ Items: ["бесплатно", "своими руками"] })
  })

  it("очищает минус-фразы пустым списком, а не пропуском поля", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: [] })

    expect(lastBody().params.Campaigns[0].NegativeKeywords).toEqual({ Items: [] })
  })
})

describe("set_ad_group_negative_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("правит группу, а не кампанию", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetAdGroupNegativeKeywords({ ad_group_id: "1915016273214320641", negative_keywords: ["дёшево"] })

    expect(lastBody().params.AdGroups[0].NegativeKeywords).toEqual({ Items: ["дёшево"] })
    expect(lastRawBody()).toContain('"Id":1915016273214320641')
  })
})

describe("list_negative_keyword_shared_sets", () => {
  beforeEach(() => mockFetch.mockReset())

  it("возвращает все наборы аккаунта, когда ID не названы", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { NegativeKeywordSharedSets: [] } }))

    await handleListNegativeKeywordSharedSets({})

    expect(lastBody().params.SelectionCriteria).toBeUndefined()
    expect(lastBody().params.FieldNames).toContain("NegativeKeywords")
  })

  it("отбирает конкретные наборы по ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { NegativeKeywordSharedSets: [] } }))

    await handleListNegativeKeywordSharedSets({ set_ids: ["123"] })

    expect(lastBody().params.SelectionCriteria).toEqual({ Ids: [123] })
  })
})

describe("manage_negative_keyword_shared_sets", () => {
  beforeEach(() => mockFetch.mockReset())

  it("удаляет наборы по SelectionCriteria", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { DeleteResults: [] } }))

    await handleManageNegativeKeywordSharedSets({ action: "delete", set_ids: ["123", "456"] })

    expect(lastBody().method).toBe("delete")
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })

  it("создаёт наборы из add_sets", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [] } }))

    await handleManageNegativeKeywordSharedSets({
      action: "add",
      add_sets: [{ name: "Общие минуса", negative_keywords: ["бесплатно"] }]
    })

    expect(lastBody().method).toBe("add")
    expect(lastBody().params.NegativeKeywordSharedSets).toEqual([
      { Name: "Общие минуса", NegativeKeywords: ["бесплатно"] }
    ])
  })

  it("шлёт в update только заданные поля набора", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleManageNegativeKeywordSharedSets({
      action: "update",
      update_sets: [{ set_id: "123", name: "Новое имя" }]
    })

    expect(lastBody().params.NegativeKeywordSharedSets).toEqual([{ Id: 123, Name: "Новое имя" }])
  })

  it("не даёт обновить набор вхолостую", async () => {
    await expect(
      handleManageNegativeKeywordSharedSets({ action: "update", update_sets: [{ set_id: "123" }] })
    ).rejects.toThrow("name и/или negative_keywords")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("требует список, соответствующий действию", async () => {
    await expect(handleManageNegativeKeywordSharedSets({ action: "add" })).rejects.toThrow("add_sets")
    await expect(handleManageNegativeKeywordSharedSets({ action: "update" })).rejects.toThrow("update_sets")
    await expect(handleManageNegativeKeywordSharedSets({ action: "delete" })).rejects.toThrow("set_ids")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("link_negative_keyword_sets", () => {
  beforeEach(() => mockFetch.mockReset())

  it("назначает один и тот же список наборов каждой группе", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleLinkNegativeKeywordSets({ ad_group_ids: ["123", "456"], set_ids: ["789"] })

    expect(lastBody().params.AdGroups).toEqual([
      { Id: 123, NegativeKeywordSharedSetIds: { Items: [789] } },
      { Id: 456, NegativeKeywordSharedSetIds: { Items: [789] } }
    ])
  })

  it("снимает все привязки пустым списком", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleLinkNegativeKeywordSets({ ad_group_ids: ["123"], set_ids: [] })

    expect(lastBody().params.AdGroups[0].NegativeKeywordSharedSetIds).toEqual({ Items: [] })
  })
})
