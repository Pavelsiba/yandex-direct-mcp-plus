// biome-ignore-all lint/plugin/no-native-json: тест разбирает тела запросов
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FORECAST_MAX_PHRASES, FORECAST_POLL } from "#shared/config/limits"
import { installFetchMock, lastRequestUrl, mockFetch, okResponse } from "#testing/fetch-mock"
import { formatForecast } from "./format.js"
import { handleGetKeywordForecast } from "./handler.js"
import { getKeywordForecastSchema } from "./schema.js"

installFetchMock()

const FORECAST_ID = 1697667948

const PHRASE = {
  FirstPlaceCTR: 0.66,
  Max: 128.48,
  FirstPlaceClicks: 2,
  Shows: 445,
  Currency: "RUB",
  PremiumClicks: 18,
  Phrase: "живые раки",
  PremiumCTR: 5.56,
  CTR: 0.66,
  Clicks: 2,
  IsRubric: "No",
  PremiumMax: 159.87,
  PremiumMin: 69.59,
  Min: 86.43
}

const COMMON = {
  PremiumClicks: 18,
  Min: 172.86,
  PremiumMin: 1252.62,
  Geo: "65",
  Clicks: 2,
  FirstPlaceClicks: 2,
  Max: 256.96,
  Shows: 445
}

const AUCTION_BIDS = [
  { Bid: 159.87, Price: 17.13, Position: "P11" },
  { Bid: 69.59, Position: "P12", Price: 13.59 },
  { Bid: 128.48, Position: "P21", Price: 5.39 },
  { Bid: 86.43, Position: "P22", Price: 4.34 }
]

const FORECAST = { data: { Phrases: [PHRASE], Common: COMMON } }

const status = (StatusForecast: string, ForecastID = FORECAST_ID) => ({ ForecastID, StatusForecast })
const created = () => okResponse({ data: FORECAST_ID })
const statusList = (...reports: ReturnType<typeof status>[]) => okResponse({ data: reports })
const deleted = () => okResponse({ data: 1 })
const queueFull = () =>
  okResponse({
    error_code: 31,
    error_str: "Report queue limit reached",
    error_detail: "Report queue already contains 5 requests"
  })

function sentBodies(): { method: string; param: unknown; token: string }[] {
  return mockFetch.mock.calls.map(([, options]) => JSON.parse(options.body))
}

function input(overrides: Record<string, unknown> = {}) {
  return getKeywordForecastSchema.parse({ phrases: ["живые раки"], ...overrides })
}

function mockHappyPath(forecast: unknown = FORECAST) {
  mockFetch
    .mockResolvedValueOnce(created())
    .mockResolvedValueOnce(statusList(status("Done")))
    .mockResolvedValueOnce(okResponse(forecast))
    .mockResolvedValueOnce(deleted())
}

const noWait = vi.fn(() => Promise.resolve())

describe("get_keyword_forecast", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    noWait.mockClear()
  })

  it("создаёт отчёт в Live v4: фразы, валюта по умолчанию RUB, регионы числами", async () => {
    mockHappyPath()

    await handleGetKeywordForecast(input({ region_ids: ["65", "-213"] }), noWait)

    expect(lastRequestUrl()).toContain("/live/v4/json/")
    expect(sentBodies()[0]).toEqual({
      method: "CreateNewForecast",
      token: "test-token",
      param: { Phrases: ["живые раки"], Currency: "RUB", GeoID: [65, -213] }
    })
  })

  it("передаёт торги и общие минус-фразы, только когда они заданы", async () => {
    mockHappyPath()

    await handleGetKeywordForecast(
      input({ currency: "KZT", auction_bids: true, negative_keywords: ["бесплатно", "(своими руками)"] }),
      noWait
    )

    expect(sentBodies()[0].param).toEqual({
      Phrases: ["живые раки"],
      Currency: "KZT",
      AuctionBids: "Yes",
      CommonMinusWords: ["бесплатно", "(своими руками)"]
    })
  })

  it("ждёт Done именно своего отчёта, забирает его и удаляет", async () => {
    mockFetch
      .mockResolvedValueOnce(created())
      .mockResolvedValueOnce(statusList(status("Pending")))
      .mockResolvedValueOnce(statusList(status("Done", 111), status("Pending")))
      .mockResolvedValueOnce(statusList(status("Done")))
      .mockResolvedValueOnce(okResponse(FORECAST))
      .mockResolvedValueOnce(deleted())

    await handleGetKeywordForecast(input(), noWait)

    expect(sentBodies().map(({ method, param }) => [method, param])).toEqual([
      ["CreateNewForecast", expect.any(Object)],
      ["GetForecastList", {}],
      ["GetForecastList", {}],
      ["GetForecastList", {}],
      ["GetForecast", FORECAST_ID],
      ["DeleteForecastReport", FORECAST_ID]
    ])
    expect(noWait).toHaveBeenCalledTimes(3)
    expect(noWait).toHaveBeenCalledWith(FORECAST_POLL.intervalMs)
  })

  it("при занятой очереди ждёт места и создаёт отчёт повторно", async () => {
    mockFetch.mockResolvedValueOnce(queueFull()).mockResolvedValueOnce(queueFull())
    mockHappyPath()

    const output = await handleGetKeywordForecast(input(), noWait)

    expect(output).toContain("живые раки\t445")
    expect(sentBodies().filter(({ method }) => method === "CreateNewForecast")).toHaveLength(3)
  })

  it("не ждёт места в очереди бесконечно и советует слать вызовы последовательно", async () => {
    for (let attempt = 0; attempt <= FORECAST_POLL.queueRetries; attempt++) mockFetch.mockResolvedValueOnce(queueFull())

    await expect(handleGetKeywordForecast(input(), noWait)).rejects.toThrow("последовательно")

    expect(mockFetch).toHaveBeenCalledTimes(FORECAST_POLL.queueRetries + 1)
  })

  it("другую ошибку создания не повторяет", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ error_code: 71, error_str: "Неверно заданы параметры" }))

    await expect(handleGetKeywordForecast(input(), noWait)).rejects.toThrow("Ошибка API v4 [71]")

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("на Failed сообщает об ошибке и всё равно удаляет отчёт", async () => {
    mockFetch.mockResolvedValueOnce(created()).mockResolvedValueOnce(statusList(status("Failed")))
    mockFetch.mockResolvedValueOnce(deleted())

    await expect(handleGetKeywordForecast(input(), noWait)).rejects.toThrow("StatusForecast: Failed")

    expect(sentBodies().at(-1)).toMatchObject({ method: "DeleteForecastReport", param: FORECAST_ID })
  })

  it("не ждёт готовности дольше лимита опросов и удаляет несформированный отчёт", async () => {
    mockFetch.mockResolvedValueOnce(created())
    for (let poll = 0; poll < FORECAST_POLL.maxPolls; poll++) {
      mockFetch.mockResolvedValueOnce(statusList(status("Pending")))
    }
    mockFetch.mockResolvedValueOnce(deleted())

    await expect(handleGetKeywordForecast(input(), noWait)).rejects.toThrow("Прогноз не сформировался за 90 с")

    expect(noWait).toHaveBeenCalledTimes(FORECAST_POLL.maxPolls)
    expect(sentBodies().at(-1)).toMatchObject({ method: "DeleteForecastReport" })
  })

  it("отдаёт прогноз, даже если удалить отчёт не вышло", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    mockFetch.mockResolvedValueOnce(created()).mockResolvedValueOnce(statusList(status("Done")))
    mockFetch
      .mockResolvedValueOnce(okResponse(FORECAST))
      .mockResolvedValueOnce(okResponse({ error_code: 52, error_str: "Сервер авторизации временно недоступен" }))

    const output = await handleGetKeywordForecast(input(), noWait)

    expect(output).toContain("живые раки")
    expect(log).toHaveBeenCalledWith(expect.stringContaining(`Отчёт прогноза ${FORECAST_ID} не удалён`))
    log.mockRestore()
  })

  it("не идёт дальше, если ответ CreateNewForecast без ID", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ data: null }))

    await expect(handleGetKeywordForecast(input(), noWait)).rejects.toThrow("ID отчёта прогноза в неожиданной форме")

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe("таблица прогноза", () => {
  it("строка на фразу без IsRubric и Currency, итог с бюджетами — отдельной строкой", () => {
    expect(formatForecast(FORECAST.data, "RUB")).toBe(
      [
        "Прогноз за прошедший месяц. Валюта: RUB. Регионы: 65.",
        "",
        "Phrase\tShows\tClicks\tCTR\tMin\tMax\tFirstPlaceClicks\tFirstPlaceCTR\tPremiumMin\tPremiumMax\tPremiumClicks\tPremiumCTR",
        "живые раки\t445\t2\t0.66\t86.43\t128.48\t2\t0.66\t69.59\t159.87\t18\t5.56",
        "",
        "Итого по всем фразам: Shows 445, Clicks 2, FirstPlaceClicks 2, PremiumClicks 18; " +
          "бюджет за месяц, RUB: Min 172.86, Max 256.96, PremiumMin 1252.62"
      ].join("\n")
    )
  })

  it("торги — парой колонок Bid/Price на позицию, по порядку позиций", () => {
    const other = { ...PHRASE, Phrase: "раки цена", AuctionBids: [AUCTION_BIDS[2], AUCTION_BIDS[0]] }
    const lines = formatForecast(
      { Phrases: [{ ...PHRASE, AuctionBids: AUCTION_BIDS }, other], Common: COMMON },
      "RUB"
    ).split("\n")

    expect(lines[2]).toMatch(/\tP11 Bid\tP11 Price\tP12 Bid\tP12 Price\tP21 Bid\tP21 Price\tP22 Bid\tP22 Price$/)
    expect(lines[3]).toMatch(/\t159.87\t17.13\t69.59\t13.59\t128.48\t5.39\t86.43\t4.34$/)
    expect(lines[4]).toMatch(/\t159.87\t17.13\t\t\t128.48\t5.39\t\t$/)
  })

  it("без регионов в отчёте пишет «все»", () => {
    const { Geo: _geo, ...common } = COMMON

    expect(formatForecast({ Phrases: [PHRASE], Common: common }, "RUB")).toContain("Регионы: все.")
  })
})

describe("схема get_keyword_forecast", () => {
  it(`отклоняет больше ${FORECAST_MAX_PHRASES} фраз`, () => {
    const phrases = Array.from({ length: FORECAST_MAX_PHRASES + 1 }, (_, index) => `фраза ${index}`)

    expect(getKeywordForecastSchema.safeParse({ phrases }).success).toBe(false)
  })

  it("отклоняет пустой список фраз и валюту вне списка Директа", () => {
    expect(getKeywordForecastSchema.safeParse({ phrases: [] }).success).toBe(false)
    expect(getKeywordForecastSchema.safeParse({ phrases: ["раки"], currency: "RUR" }).success).toBe(false)
  })

  it("принимает код региона только строкой", () => {
    expect(getKeywordForecastSchema.safeParse({ phrases: ["раки"], region_ids: [65] }).success).toBe(false)
  })
})
