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
import {
  CAMPAIGN_LIST_FIELDS,
  createCampaignSchema,
  getCampaignSchema,
  listCampaignsSchema,
  setStrategySchema,
  updateCampaignSchema
} from "./schema.js"

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

  it("без fields запрашивает набор по умолчанию", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    await handleListCampaigns({})

    expect(lastBody().params.FieldNames).toEqual(CAMPAIGN_LIST_FIELDS)
  })

  it("отдаёт выбранные вызывающим поля вместо набора по умолчанию", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    // Через схему, а не мимо неё: иначе имя поля не проверялось бы ничем.
    await handleListCampaigns(listCampaignsSchema.parse({ fields: ["Id", "Name", "Funds"] }))

    expect(lastBody().params.FieldNames).toEqual(["Id", "Name", "Funds"])
  })

  // Имя не из CampaignFieldEnum Директ отбивает ошибкой 8000 на боевом вызове — схема
  // обязана не пустить его дальше, иначе баллы тратятся на заведомо неверный запрос.
  it("схема не принимает поле, которого нет в перечислении", () => {
    expect(listCampaignsSchema.safeParse({ fields: ["Id", "DailyBudgets"] }).success).toBe(false)
    expect(listCampaignsSchema.safeParse({ fields: [] }).success).toBe(false)
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

  it("запрашивает цели, счётчики и модель атрибуции вместе с настройками", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    await handleGetCampaign({ campaign_id: "1915016273214320641" })

    const { params } = JSON.parse(lastRawBody())
    expect(params.TextCampaignFieldNames).toEqual(
      expect.arrayContaining(["TrackingParams", "PriorityGoals", "CounterIds", "AttributionModel", "Settings"])
    )
    expect(params.FieldNames).toContain("StatusClarification")
  })

  // У смарт-кампаний поле называется CounterId, в единственном числе: множественного
  // в SmartCampaignFieldEnum нет, и запрос с ним Директ не примет.
  it("просит у смарт-кампании CounterId, а не CounterIds", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    await handleGetCampaign({ campaign_id: "1915016273214320641" })

    const { params } = JSON.parse(lastRawBody())
    expect(params.SmartCampaignFieldNames).toContain("CounterId")
    expect(params.SmartCampaignFieldNames).not.toContain("CounterIds")
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

describe("UTM-разметка кампании", () => {
  beforeEach(() => mockFetch.mockReset())

  it("на создании кладёт разметку в объект настроек рядом со стратегией", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [{ Id: 1 }] } }))
    const params = createCampaignSchema.parse({
      name: "Кампания",
      start_date: "2026-09-10",
      tracking_params: "utm_source=yandex&utm_campaign={campaign_id}"
    })

    await handleCreateCampaign(params)

    expect(lastBody().params.Campaigns[0].TextCampaign.TrackingParams).toBe(
      "utm_source=yandex&utm_campaign={campaign_id}"
    )
    expect(lastBody().params.Campaigns[0].TextCampaign.BiddingStrategy).toBeDefined()
  })

  it("на создании динамической кампании кладёт разметку в DynamicTextCampaign", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [{ Id: 1 }] } }))
    const params = createCampaignSchema.parse({
      name: "Кампания",
      type: "DYNAMIC_TEXT_CAMPAIGN",
      start_date: "2026-09-10",
      tracking_params: "utm_source=yandex"
    })

    await handleCreateCampaign(params)

    expect(lastBody().params.Campaigns[0].DynamicTextCampaign.TrackingParams).toBe("utm_source=yandex")
  })

  it("на обновлении сначала читает тип кампании, потом пишет в нужный объект", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 123, Type: "UNIFIED_CAMPAIGN" }] } }))
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 123 }] } }))

    await handleUpdateCampaign(updateCampaignSchema.parse({ campaign_id: "123", tracking_params: "utm_source=ya" }))

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(mockFetch.mock.calls[0][1].body).params.FieldNames).toEqual(["Id", "Type"])
    expect(lastBody().params.Campaigns[0].UnifiedCampaign.TrackingParams).toBe("utm_source=ya")
  })

  it("на обновлении без разметки типа не читает — лишнего вызова нет", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 123 }] } }))

    await handleUpdateCampaign(updateCampaignSchema.parse({ campaign_id: "123", name: "Имя" }))

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("null снимает разметку", async () => {
    mockFetch
      .mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 123, Type: "TEXT_CAMPAIGN" }] } }))
      .mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 123 }] } }))

    await handleUpdateCampaign(updateCampaignSchema.parse({ campaign_id: "123", tracking_params: null }))

    expect(lastBody().params.Campaigns[0].TextCampaign.TrackingParams).toBeNull()
  })

  it("на типе без поддержки разметки не пишет ничего", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { Campaigns: [{ Id: 123, Type: "MOBILE_APP_CAMPAIGN" }] } }))

    await expect(
      handleUpdateCampaign(updateCampaignSchema.parse({ campaign_id: "123", tracking_params: "utm_source=ya" }))
    ).rejects.toThrow("MOBILE_APP_CAMPAIGN")
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("get_campaign запрашивает разметку у всех поддерживающих типов", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    await handleGetCampaign(getCampaignSchema.parse({ campaign_id: "123" }))

    const sent = lastBody().params
    expect(sent.TextCampaignFieldNames).toContain("TrackingParams")
    expect(sent.DynamicTextCampaignFieldNames).toContain("TrackingParams")
    expect(sent.SmartCampaignFieldNames).toContain("TrackingParams")
    expect(sent.UnifiedCampaignFieldNames).toContain("TrackingParams")
  })

  it("пустую строку схема отвергает: снятие — это null", () => {
    expect(updateCampaignSchema.safeParse({ campaign_id: "123", tracking_params: "" }).success).toBe(false)
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

  it("удаляет кампанию тем же путём и доносит отказ Директа", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          DeleteResults: [
            { Errors: [{ Code: 8000, Message: "Кампания не может быть удалена", Details: "Есть показы" }] }
          ]
        }
      })
    )

    const output = await handleManageCampaigns({ campaign_ids: ["123"], action: "delete" })

    expect(lastBody().method).toBe("delete")
    expect(output).toContain("Кампания не может быть удалена")
  })
})

describe("get_strategy", () => {
  beforeEach(() => mockFetch.mockReset())

  it("запрашивает стратегию отдельным набором полей текстовой кампании", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(emptyResult))

    await handleGetStrategy({ campaign_id: "123" })

    expect(lastBody().params.TextCampaignFieldNames).toEqual([
      "BiddingStrategy",
      "PriorityGoals",
      "CounterIds",
      "AttributionModel"
    ])
  })

  // У максимума конверсий в BiddingStrategy стоит служебный GoalId 13 («ключевые цели»), а
  // сами цели — в PriorityGoals. Без них ответ читается как «цель не выбрана».
  it("отдаёт целевые действия с ценностью в рублях", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({
        result: {
          Campaigns: [
            {
              Id: 123,
              TextCampaign: {
                BiddingStrategy: { Search: { BiddingStrategyType: "WB_MAXIMUM_CONVERSION_RATE" } },
                PriorityGoals: {
                  Items: [{ GoalId: 601234567, Value: 400000000, IsMetrikaSourceOfValue: "NO" }]
                }
              }
            }
          ]
        }
      })
    )

    const output = JSON.parse(await handleGetStrategy({ campaign_id: "123" }))

    const goal = output.result.Campaigns[0].TextCampaign.PriorityGoals.Items[0]

    // Тип GoalId здесь не проверяется: приведение ID к строке живёт в format и меняется
    // независимо от этого инструмента. Здесь важна ценность цели — рубли, не микроединицы.
    expect(String(goal.GoalId)).toBe("601234567")
    expect(goal.Value).toBe(400)
    expect(goal.IsMetrikaSourceOfValue).toBe("NO")
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

  // Дефолт Директа для новых кампаний: именно на нём 12.09.2026 выяснилось, что
  // прочитать стратегию можно, а записать ту же — нет.
  it("собирает максимум конверсий с целью и недельным бюджетом", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))
    const params = setStrategySchema.parse({
      campaign_id: "123",
      search_type: "WB_MAXIMUM_CONVERSION_RATE",
      network_type: "SERVING_OFF",
      weekly_spend_limit: 6000,
      goal_id: "601234567"
    })

    await handleSetStrategy(params)

    expect(lastBody().params.Campaigns[0].TextCampaign.BiddingStrategy.Search).toEqual({
      BiddingStrategyType: "WB_MAXIMUM_CONVERSION_RATE",
      WbMaximumConversionRate: { WeeklySpendLimit: 6_000_000_000, GoalId: 601234567 }
    })
  })

  it("не даёт включить максимум конверсий без недельного бюджета", async () => {
    const params = setStrategySchema.parse({
      campaign_id: "123",
      search_type: "WB_MAXIMUM_CONVERSION_RATE",
      network_type: "SERVING_OFF",
      goal_id: "601234567"
    })

    await expect(handleSetStrategy(params)).rejects.toThrow("weekly_spend_limit")
    expect(mockFetch).not.toHaveBeenCalled()
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

  // Ради этого перехода стратегии и расширялись: набрать статистику на кликах,
  // затем переключить кампанию на оплату за конверсии.
  it("переключает кампанию на оплату за конверсию с целью и ценой", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))
    const params = setStrategySchema.parse({
      campaign_id: "123",
      search_type: "PAY_FOR_CONVERSION",
      network_type: "NETWORK_DEFAULT",
      conversion_price: 900,
      goal_id: "12345",
      weekly_spend_limit: 15000
    })

    await handleSetStrategy(params)

    // ID здесь короткий намеренно: lastBody() разбирает тело нативным JSON.parse,
    // и 19-значный он бы сам округлил. Точность проверяет соседний тест по сырому телу.
    expect(lastBody().params.Campaigns[0].TextCampaign.BiddingStrategy.Search).toEqual({
      BiddingStrategyType: "PAY_FOR_CONVERSION",
      PayForConversion: { Cpa: 900_000_000, WeeklySpendLimit: 15_000_000_000, GoalId: 12345 }
    })
  })

  it("отправляет ID цели числом без потери точности", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))

    await handleSetStrategy(
      setStrategySchema.parse({
        campaign_id: "123",
        search_type: "AVERAGE_CPA",
        network_type: "SERVING_OFF",
        average_cpa: 500,
        goal_id: "1915016273214320641"
      })
    )

    expect(lastRawBody()).toContain('"GoalId":1915016273214320641')
  })

  it("кладёт среднюю цену конверсии и потолок ставки в AverageCpa", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))

    await handleSetStrategy(
      setStrategySchema.parse({
        campaign_id: "123",
        search_type: "AVERAGE_CPA",
        network_type: "SERVING_OFF",
        average_cpa: 500,
        bid_ceiling: 120
      })
    )

    expect(lastBody().params.Campaigns[0].TextCampaign.BiddingStrategy.Search.AverageCpa).toEqual({
      AverageCpa: 500_000_000,
      BidCeiling: 120_000_000
    })
  })

  it("не даёт включить среднюю цену клика без самой цены", async () => {
    const params = setStrategySchema.parse({
      campaign_id: "123",
      search_type: "AVERAGE_CPC",
      network_type: "SERVING_OFF"
    })

    await expect(handleSetStrategy(params)).rejects.toThrow("average_cpc обязателен")
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("не шлёт незаданные настройки: пустое поле Директ трактует как сброс", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { UpdateResults: [{ Id: 1 }] } }))

    await handleSetStrategy(
      setStrategySchema.parse({
        campaign_id: "123",
        search_type: "AVERAGE_CPC",
        network_type: "SERVING_OFF",
        average_cpc: 25
      })
    )

    expect(lastBody().params.Campaigns[0].TextCampaign.BiddingStrategy.Search.AverageCpc).toEqual({
      AverageCpc: 25_000_000
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

describe("часовой пояс кампании", () => {
  beforeEach(() => mockFetch.mockReset())

  it("уходит в TimeZone только когда задан", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [{ Id: 1 }] } }))
    await handleCreateCampaign(createCampaignSchema.parse({ name: "Улов", start_date: "2026-09-10" }))
    expect(lastBody().params.Campaigns[0].TimeZone).toBeUndefined()

    mockFetch.mockResolvedValueOnce(okResponse({ result: { AddResults: [{ Id: 1 }] } }))
    await handleCreateCampaign(
      createCampaignSchema.parse({ name: "Улов", start_date: "2026-09-10", time_zone: "Asia/Yekaterinburg" })
    )
    expect(lastBody().params.Campaigns[0].TimeZone).toBe("Asia/Yekaterinburg")
  })
})
