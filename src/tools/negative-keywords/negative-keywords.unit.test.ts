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
import {
  linkNegativeKeywordSetsSchema,
  setAdGroupNegativeKeywordsSchema,
  setCampaignNegativeKeywordsSchema
} from "./schema.js"

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

// Пропуск mode когда-то означал replace по умолчанию — то есть «добавь одну фразу»
// без указания режима стирало весь список молча и с успешным ответом. Режим обязателен
// именно поэтому, и проверяется это на схеме: хендлер режим уже получает готовым.
describe("режим минус-фраз", () => {
  it("не даёт умолчания: без mode запрос отклоняется до вызова API", () => {
    const params = { campaign_id: "123", negative_keywords: ["дёшево"] }

    expect(setCampaignNegativeKeywordsSchema.safeParse(params).success).toBe(false)
    expect(
      setAdGroupNegativeKeywordsSchema.safeParse({ ad_group_id: "123", negative_keywords: ["дёшево"] }).success
    ).toBe(false)
  })

  it("принимает все три режима", () => {
    for (const mode of ["replace", "add", "remove"]) {
      const parsed = setCampaignNegativeKeywordsSchema.safeParse({
        campaign_id: "123",
        negative_keywords: ["дёшево"],
        mode
      })

      expect(parsed.success).toBe(true)
    }
  })
})

describe("set_campaign_negative_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет присланный список целиком: Директ затирает прежний", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({
      campaign_id: "123",
      negative_keywords: ["бесплатно", "своими руками"],
      mode: "replace"
    })

    expect(lastBody().params.Campaigns[0].NegativeKeywords).toEqual({ Items: ["бесплатно", "своими руками"] })
  })

  it("очищает минус-фразы значением null, а не пустым Items", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: [], mode: "replace" })

    expect(lastBody().params.Campaigns[0].NegativeKeywords).toBeNull()
  })

  it("в режиме replace не читает текущий список — вызов один", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: ["дёшево"], mode: "replace" })

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("в режиме add читает текущие фразы и отправляет объединённый список", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse({ result: { Campaigns: [{ Id: 123, NegativeKeywords: { Items: ["бесплатно", "отзывы"] } }] } })
      )
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: ["дёшево"], mode: "add" })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(lastBody().params.Campaigns[0].NegativeKeywords).toEqual({
      Items: ["бесплатно", "отзывы", "дёшево"]
    })
  })

  it("запрашивает NegativeKeywords в FieldNames — без этого поля слияние стёрло бы список", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 123, NegativeKeywords: { Items: [] } }] } }))
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: ["дёшево"], mode: "add" })

    const readBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(readBody.method).toBe("get")
    expect(readBody.params.FieldNames).toContain("NegativeKeywords")
  })

  it("в режиме remove отправляет список без названных фраз", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse({ result: { Campaigns: [{ Id: 123, NegativeKeywords: { Items: ["бесплатно", "отзывы"] } }] } })
      )
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: ["отзывы"], mode: "remove" })

    expect(lastBody().params.Campaigns[0].NegativeKeywords).toEqual({ Items: ["бесплатно"] })
  })

  it("считает кампанию без поля NegativeKeywords кампанией без минус-фраз", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 123 }] } }))
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: ["дёшево"], mode: "add" })

    expect(lastBody().params.Campaigns[0].NegativeKeywords).toEqual({ Items: ["дёшево"] })
  })

  it("падает, не отправляя update, если кампании нет в ответе", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Campaigns: [] } }))

    await expect(
      handleSetCampaignNegativeKeywords({ campaign_id: "123", negative_keywords: ["дёшево"], mode: "add" })
    ).rejects.toThrow("не найдена или недоступна")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("читает по тому же 19-значному ID, что и пишет", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 1, NegativeKeywords: { Items: [] } }] } }))
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetCampaignNegativeKeywords({
      campaign_id: "1915016273214320641",
      negative_keywords: ["дёшево"],
      mode: "add"
    })

    expect(mockFetch.mock.calls[0][1].body).toContain('"Ids":[1915016273214320641]')
    expect(lastRawBody()).toContain('"Id":1915016273214320641')
  })
})

describe("set_ad_group_negative_keywords", () => {
  beforeEach(() => mockFetch.mockReset())

  it("правит группу, а не кампанию", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetAdGroupNegativeKeywords({
      ad_group_id: "1915016273214320641",
      negative_keywords: ["дёшево"],
      mode: "replace"
    })

    expect(lastBody().params.AdGroups[0].NegativeKeywords).toEqual({ Items: ["дёшево"] })
    expect(lastRawBody()).toContain('"Id":1915016273214320641')
  })

  it("в режиме add читает группы сервисом adgroups, а не campaigns", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse({ result: { AdGroups: [{ Id: 123, NegativeKeywords: { Items: ["бесплатно"] } }] } })
      )
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleSetAdGroupNegativeKeywords({ ad_group_id: "123", negative_keywords: ["дёшево"], mode: "add" })

    expect(mockFetch.mock.calls[0][0]).toContain("adgroups")
    expect(lastBody().params.AdGroups[0].NegativeKeywords).toEqual({ Items: ["бесплатно", "дёшево"] })
  })

  it("падает, не отправляя update, если группы нет в ответе", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AdGroups: [] } }))

    await expect(
      handleSetAdGroupNegativeKeywords({ ad_group_id: "123", negative_keywords: ["дёшево"], mode: "remove" })
    ).rejects.toThrow("не найдена или недоступна")
    expect(mockFetch).toHaveBeenCalledTimes(1)
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

    expect(lastBody().params.AdGroups[0].NegativeKeywordSharedSetIds).toBeNull()
  })

  it("перед записью в кампанию читает её тип", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 123, Type: "TEXT_CAMPAIGN" }] } }))
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleLinkNegativeKeywordSets({ campaign_ids: ["123"], set_ids: ["789"] })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(lastBody().params.Campaigns).toEqual([
      { Id: 123, TextCampaign: { NegativeKeywordSharedSetIds: { Items: [789] } } }
    ])
  })

  it("кладёт наборы в объект настроек по типу каждой кампании", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okResponse({
          result: {
            Campaigns: [
              { Id: 123, Type: "TEXT_CAMPAIGN" },
              { Id: 456, Type: "UNIFIED_CAMPAIGN" }
            ]
          }
        })
      )
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleLinkNegativeKeywordSets({ campaign_ids: ["123", "456"], set_ids: ["789"] })

    expect(lastBody().params.Campaigns).toEqual([
      { Id: 123, TextCampaign: { NegativeKeywordSharedSetIds: { Items: [789] } } },
      { Id: 456, UnifiedCampaign: { NegativeKeywordSharedSetIds: { Items: [789] } } }
    ])
  })

  it("не пишет ничего, если тип кампании общих наборов не поддерживает", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 123, Type: "SMART_CAMPAIGN" }] } }))

    await expect(handleLinkNegativeKeywordSets({ campaign_ids: ["123"], set_ids: ["789"] })).rejects.toThrow(
      /SMART_CAMPAIGN/
    )
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("кампании и группы обновляет разными вызовами", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 123, Type: "TEXT_CAMPAIGN" }] } }))
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [] } }))

    await handleLinkNegativeKeywordSets({ campaign_ids: ["123"], ad_group_ids: ["456"], set_ids: ["789"] })

    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(lastBody().params.AdGroups).toEqual([{ Id: 456, NegativeKeywordSharedSetIds: { Items: [789] } }])
  })

  it("отклоняет вызов без кампаний и без групп", () => {
    expect(linkNegativeKeywordSetsSchema.safeParse({ set_ids: ["789"] }).success).toBe(false)
  })
})
