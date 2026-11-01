// biome-ignore-all lint/plugin/no-native-json: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { apiPost } from "#shared/api/client"
import { MAX_RETRIES } from "#shared/config/limits"
import {
  errorResponse,
  installFetchMock,
  lastRawBody,
  lastRequestUrl,
  mockFetch,
  okResponse
} from "#testing/fetch-mock"

installFetchMock()

const skipDelays = () =>
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void) => {
    callback()
    return 0
  }) as unknown as typeof setTimeout)

const apiError = (code: number) => okResponse({ error: { error_code: code, error_string: "Сбой" } })

describe("клиент v5", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    delete process.env.YANDEX_DIRECT_LOGIN
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("отправляет 19-значный ID числом, не потеряв точность", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: {} }))

    await apiPost("campaigns", "get", { SelectionCriteria: { Ids: [BigInt("1915016273214320641")] } })

    expect(lastRawBody()).toContain('"Ids":[1915016273214320641]')
  })

  it("возвращает 19-значный ID строкой, а не округлённым числом", async () => {
    mockFetch.mockResolvedValueOnce(okResponse('{"result":{"Campaigns":[{"Id":1915016273214320641}]}}'))

    const data = (await apiPost("campaigns", "get")) as { result: { Campaigns: Array<{ Id: unknown }> } }

    expect(data.result.Campaigns[0].Id).toBe("1915016273214320641")
  })

  // Ошибка запроса приходит телом с HTTP 200 — проверять статус бесполезно.
  it("бросает ошибку, пришедшую телом с кодом 200", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({ error: { error_code: 54, error_string: "Нет прав", error_detail: "Проверьте токен" } })
    )

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/\[54\].*Нет прав.*Проверьте токен/)
  })

  it("кладёт в текст ошибки остаток баллов из заголовка Units", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse({ error: { error_code: 152, error_string: "Недостаточно баллов" } }, { Units: "20/0/240000" })
    )

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/20\/0\/240000/)
  })

  it("подставляет Client-Login для агентского токена", async () => {
    process.env.YANDEX_DIRECT_LOGIN = "agency-client"
    mockFetch.mockResolvedValueOnce(okResponse({ result: {} }))

    await apiPost("campaigns", "get")

    expect(mockFetch.mock.calls[0][1].headers["Client-Login"]).toBe("agency-client")
  })

  // Контур один: песочницы у Директа нет с июля 2026, переключателя эндпоинта тоже.
  it("бьёт в боевой эндпоинт v5", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: {} }))

    await apiPost("campaigns", "get")

    expect(lastRequestUrl()).toBe("https://api.direct.yandex.com/json/v5/campaigns")
  })

  it("повторяет запрос после 500 и отдаёт успешный ответ", async () => {
    skipDelays()
    mockFetch.mockResolvedValueOnce(errorResponse(500)).mockResolvedValueOnce(okResponse({ result: { ok: true } }))

    const data = (await apiPost("campaigns", "get")) as { result: { ok: boolean } }

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(data.result.ok).toBe(true)
  })

  it("повторяет чтение после внутреннего сбоя Директа, пришедшего с кодом 200", async () => {
    skipDelays()
    mockFetch.mockResolvedValueOnce(apiError(1000)).mockResolvedValueOnce(okResponse({ result: { ok: true } }))

    const data = (await apiPost("campaigns", "get")) as { result: { ok: boolean } }

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(data.result.ok).toBe(true)
  })

  it("не повторяет запись после внутреннего сбоя: она могла примениться", async () => {
    skipDelays()
    mockFetch.mockResolvedValueOnce(apiError(1000))

    await expect(apiPost("campaigns", "add")).rejects.toThrow(/\[1000\].*проверьте чтением/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("повторяет запись, отбитую лимитом соединений до выполнения", async () => {
    skipDelays()
    mockFetch.mockResolvedValueOnce(apiError(506)).mockResolvedValueOnce(okResponse({ result: {} }))

    await apiPost("campaigns", "add")

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("исчерпав повторы, отдаёт ошибку с подсказкой", async () => {
    skipDelays()
    mockFetch.mockResolvedValue(apiError(52))

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/\[52\].*Что делать: .*через минуту/)
    expect(mockFetch).toHaveBeenCalledTimes(MAX_RETRIES)
  })

  it("не повторяет ошибку, которую повтор не исправит", async () => {
    mockFetch.mockResolvedValueOnce(apiError(8800))

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/\[8800\]/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("не повторяет запрос после 400 и показывает тело ошибки", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(400, "Bad Request"))

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/HTTP 400/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("обрезает длинное тело в тексте HTTP-ошибки", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(400, `<html>${"x".repeat(5_000)}</html>`))

    const error = (await apiPost("campaigns", "get").catch((caught) => caught)) as Error

    expect(error.message.length).toBeLessThan(500)
  })

  it("считает пустой 204 сбоем Директа, а не успехом", async () => {
    mockFetch.mockResolvedValueOnce({ ...okResponse(""), status: 204 })

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/пустой ответ \(HTTP 204\).*временно недоступен/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("считает пустое тело с кодом 200 сбоем Директа", async () => {
    mockFetch.mockResolvedValueOnce(okResponse(""))

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/пустой ответ \(HTTP 200\)/)
  })

  it("на HTML вместо JSON называет статус, тип и начало тела", async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse("<html><body>Кабинет Директа пока недоступен</body></html>", { "Content-Type": "text/html" })
    )

    await expect(apiPost("campaigns", "get")).rejects.toThrow(
      /не JSON \(HTTP 200, text\/html\).*Кабинет Директа пока недоступен/
    )
  })

  it("не пускает unit-тест в сеть мимо подменённого транспорта", () => {
    expect(() => fetch("https://api.direct.yandex.com/json/v5/campaigns")).toThrow(/в обход/)
  })
})
