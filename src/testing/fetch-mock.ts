// biome-ignore-all lint/plugin: фикстуры ответов; ID в них задаются сырой строкой, а не числом
// Подмена транспорта для unit-тестов через шов transport из #shared/api/fetch.
import { vi } from "vitest"
import { setTransport, type Transport } from "#shared/api/fetch"

export const mockFetch = vi.fn()

export function installFetchMock(): void {
  // Фикстуры — не настоящие Response, а только читаемые транспортом поля.
  setTransport(mockFetch as unknown as Transport)

  // Страховка от обхода шва: свежая копия модуля транспорта ушла бы в боевой API.
  vi.stubGlobal("fetch", () => {
    throw new Error("unit-тест ушёл в сеть в обход подменённого транспорта")
  })
  process.env.YANDEX_DIRECT_TOKEN = "test-token"
}

export function okResponse(data: unknown, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => headers[name] ?? null },
    text: () => Promise.resolve(typeof data === "string" ? data : JSON.stringify(data))
  }
}

export function errorResponse(status: number, body = "") {
  return {
    ok: false,
    status,
    statusText: "Error",
    headers: { get: () => null },
    text: () => Promise.resolve(body)
  }
}

// Для 64-битных ID: JSON.parse в тесте округлил бы их до сравнения.
export function lastRawBody(): string {
  const calls = mockFetch.mock.calls
  return calls[calls.length - 1][1].body as string
}

export function lastRequestUrl(): string {
  const calls = mockFetch.mock.calls
  return calls[calls.length - 1][0] as string
}
