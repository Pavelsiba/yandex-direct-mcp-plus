// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, mockFetch, okResponse } from "#testing/fetch-mock"
import {
  handleCreateCampaign,
  handleGetCampaign,
  handleGetStrategy,
  handleListCampaigns,
  handleManageCampaigns,
  handleSetStrategy,
  handleUpdateCampaign
} from "./handler.js"
import { createCampaignSchema, getCampaignSchema, setStrategySchema, updateCampaignSchema } from "./schema.js"

installFetchMock()

const emptyResult = { result: { Campaigns: [] } }

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("list_campaigns", () => {
  beforeEach(() => mockFetch.mockReset())

  it("передаёт фильтр по статусу в SelectionCriteria", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    await handleListCampaigns({ status: "DRAFT" })

    expect(lastBody().params.SelectionCriteria.Statuses).toEqual(["DRAFT"])
  })

  it("добавляет Page только когда задан limit или offset", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))
    await handleListCampaigns({})
    expect(lastBody().params.Page).toBeUndefined()

    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))
    await handleListCampaigns({ limit: 50, offset: 100 })
    expect(lastBody().params.Page).toEqual({ Limit: 50, Offset: 100 })
  })

  it("подсказывает следующий offset, когда выборка обрезана", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Campaigns: [], LimitedBy: 500 } }))

    const output = await handleListCampaigns({})

    expect(output).toContain("LimitedBy=500")
    expect(output).toContain("offset=500")
  })
})

describe("get_campaign", () => {
  beforeEach(() => mockFetch.mockReset())

  it("отправляет 19-значный ID числом без потери точности", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    await handleGetCampaign({ campaign_id: "1915016273214320641" })

    expect(lastRawBody()).toContain('"Ids":[1915016273214320641]')
  })

  it("возвращает 19-значный ID из ответа строкой", async () => {
    const raw = '{"result":{"Campaigns":[{"Id":1915016273214320641,"Name":"Улов"}]}}'
    mockFetch.mockResolvedValueOnce(okResponse(raw))

    const output = await handleGetCampaign({ campaign_id: "1915016273214320641" })

    expect(output).toContain('"1915016273214320641"')
  })
})

describe("create_campaign", () => {
  beforeEach(() => mockFetch.mockReset())

  it("конвертирует рубли в микроединицы схемой, а не хендлером", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [{ Id: 1 }] } }))
    const params = createCampaignSchema.parse({ name: "Улов", start_date: "2026-09-10", daily_budget: 1000 })

    await handleCreateCampaign(params)

    expect(lastBody().params.Campaigns[0].DailyBudget.Amount).toBe(1_000_000_000)
  })

  it("кладёт стратегию в DynamicTextCampaign для динамических объявлений", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [{ Id: 1 }] } }))
    const params = createCampaignSchema.parse({
      name: "Улов",
      start_date: "2026-09-10",
      type: "DYNAMIC_TEXT_CAMPAIGN"
    })

    await handleCreateCampaign(params)

    expect(lastBody().params.Campaigns[0].DynamicTextCampaign).toBeDefined()
    expect(lastBody().params.Campaigns[0].TextCampaign).toBeUndefined()
  })
})

describe("update_campaign", () => {
  beforeEach(() => mockFetch.mockReset())

  it("выполняет и смену статуса, и правку полей за один вызов", async () => {
    mockFetch.mockResolvedValue(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))
    const params = updateCampaignSchema.parse({ campaign_id: "123", status: "SUSPEND", name: "Новое имя" })

    await handleUpdateCampaign(params)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).method).toBe("suspend")
    expect(JSON.parse(mockFetch.mock.calls[1][1].body).method).toBe("update")
  })

  it("отказывается работать вхолостую", async () => {
    await expect(handleUpdateCampaign({ campaign_id: "123" })).rejects.toThrow("Нечего обновлять")
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe("manage_campaigns", () => {
  beforeEach(() => mockFetch.mockReset())

  it("вызывает метод API по имени действия", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { ArchiveResults: [] } }))

    await handleManageCampaigns({ campaign_ids: ["123", "456"], action: "archive" })

    expect(lastBody().method).toBe("archive")
    expect(lastRawBody()).toContain('"Ids":[123,456]')
  })
})

describe("get_strategy", () => {
  beforeEach(() => mockFetch.mockReset())

  it("запрашивает стратегию отдельным набором полей текстовой кампании", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    await handleGetStrategy({ campaign_id: "123" })

    expect(lastBody().params.TextCampaignFieldNames).toEqual(["BiddingStrategy"])
  })
})

describe("set_strategy", () => {
  beforeEach(() => mockFetch.mockReset())

  it("кладёт настройки в объект, названный по стратегии", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))
    const params = setStrategySchema.parse({
      campaign_id: "123",
      search_type: "WB_MAXIMUM_CLICKS",
      network_type: "NETWORK_DEFAULT",
      weekly_spend_limit: 7000,
      bid_ceiling: 50,
      network_limit_percent: 30
    })

    await handleSetStrategy(params)

    expect(lastBody().params.Campaigns[0].TextCampaign.BiddingStrategy).toEqual({
      Search: {
        BiddingStrategyType: "WB_MAXIMUM_CLICKS",
        WbMaximumClicks: { WeeklySpendLimit: 7_000_000_000, BidCeiling: 50_000_000 }
      },
      Network: { BiddingStrategyType: "NETWORK_DEFAULT", NetworkDefault: { LimitPercent: 30 } }
    })
  })

  it("не даёт включить максимум кликов без недельного бюджета", async () => {
    const params = setStrategySchema.parse({
      campaign_id: "123",
      search_type: "WB_MAXIMUM_CLICKS",
      network_type: "SERVING_OFF"
    })

    await expect(handleSetStrategy(params)).rejects.toThrow("weekly_spend_limit обязателен")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("отправляет стратегию без настроек пустым объектом", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))
    const params = setStrategySchema.parse({
      campaign_id: "123",
      search_type: "HIGHEST_POSITION",
      network_type: "NETWORK_DEFAULT"
    })

    await handleSetStrategy(params)

    expect(lastBody().params.Campaigns[0].TextCampaign.BiddingStrategy).toEqual({
      Search: { BiddingStrategyType: "HIGHEST_POSITION" },
      Network: { BiddingStrategyType: "NETWORK_DEFAULT", NetworkDefault: {} }
    })
  })
})

describe("схемы кампаний", () => {
  it("отклоняют ID, пришедший числом", () => {
    // biome-ignore lint/correctness/noPrecisionLoss: потеря точности здесь и проверяется
    const result = getCampaignSchema.safeParse({ campaign_id: 1915016273214320641 })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("потерял точность")
  })

  it("отклоняют неизвестное действие со статусом", () => {
    expect(updateCampaignSchema.safeParse({ campaign_id: "123", status: "DELETE" }).success).toBe(false)
  })
})
