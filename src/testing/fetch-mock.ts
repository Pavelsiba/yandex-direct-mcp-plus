// biome-ignore-all lint/plugin: фикстуры ответов; ID в них задаются сырой строкой, а не числом
// Подмена транспорта для unit-тестов: сеть не трогаем, проверяем тело запроса к Директу
// и разбор ответа — именно там живут ошибки маппинга. Глобальный fetch при этом остаётся
// нетронутым: подменяется только шов transport из #shared/api/fetch.
import { vi } from "vitest"
import { setTransport, type Transport } from "#shared/api/fetch"

export const mockFetch = vi.fn()

export function installFetchMock(): void {
  // Фикстуры ниже — не настоящие Response, а те поля, которые читает транспорт.
  setTransport(mockFetch as unknown as Transport)

  // Страховка на случай обхода шва: свежая копия модуля транспорта (vi.resetModules)
  // получила бы дефолтный транспорт и ушла в боевой API. 05.09.2026 так и вышло —
  // запрос из unit-теста дошёл до Директа. Теперь такой путь падает.
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
