// biome-ignore-all lint/plugin: фикстуры ответов; ID в них задаются сырой строкой, а не числом
// Подмена fetch для unit-тестов: сеть не трогаем, проверяем тело запроса к Директу
// и разбор ответа — именно там живут ошибки маппинга.
import { vi } from "vitest"

export const mockFetch = vi.fn()

export function installFetchMock(): void {
  vi.stubGlobal("fetch", mockFetch)
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

// Сырая строка тела: проверка 64-битных ID обязана смотреть на неё, а не на
// разобранный объект — JSON.parse в самом тесте округлил бы ID до того, как
// тест успеет его сравнить.
export function lastRawBody(): string {
  const calls = mockFetch.mock.calls
  return calls[calls.length - 1][1].body as string
}

export function lastRequestUrl(): string {
  const calls = mockFetch.mock.calls
  return calls[calls.length - 1][0] as string
}
