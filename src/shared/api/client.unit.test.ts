// biome-ignore-all lint/plugin: тест разбирает тело запроса; проверка ID сравнивает сырую строку
import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiPost } from "#shared/api/client"
import {
  errorResponse,
  installFetchMock,
  lastRawBody,
  lastRequestUrl,
  mockFetch,
  okResponse
} from "#testing/fetch-mock"

installFetchMock()

describe("клиент v5", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    delete process.env.YANDEX_DIRECT_LOGIN
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
    vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void) => {
      callback()
      return 0
    }) as unknown as typeof setTimeout)
    mockFetch.mockResolvedValueOnce(errorResponse(500)).mockResolvedValueOnce(okResponse({ result: { ok: true } }))

    const data = (await apiPost("campaigns", "get")) as { result: { ok: boolean } }

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(data.result.ok).toBe(true)
    vi.restoreAllMocks()
  })

  it("не повторяет запрос после 400 и показывает тело ошибки", async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(400, "Bad Request"))

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/HTTP 400/)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("не пускает unit-тест в сеть мимо подменённого транспорта", () => {
    expect(() => fetch("https://api.direct.yandex.com/json/v5/campaigns")).toThrow(/в обход/)
  })
})
