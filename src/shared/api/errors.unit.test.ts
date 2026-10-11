import { describe, expect, it } from "vitest"
import {
  assertNoApiError,
  assertNoApiErrorV4,
  assertNoReportAuthError,
  DirectApiError,
  isTransientApiError
} from "#shared/api/errors"

const catchError = (action: () => void): unknown => {
  try {
    action()
  } catch (error) {
    return error
  }
  throw new Error("ожидалась ошибка")
}

const REPORT_ERROR_XML = (code: number) =>
  `<?xml version="1.0" encoding="UTF-8"?><reports:reportDownloadError xmlns:reports="http://api.direct.yandex.com/v5/reports">` +
  `<reports:ApiError><reports:requestId>792210066175615183</reports:requestId>` +
  `<reports:errorCode>${code}</reports:errorCode><reports:errorMessage>Ошибка авторизации</reports:errorMessage>` +
  `<reports:errorDetail>Недействительный OAuth-токен</reports:errorDetail></reports:ApiError></reports:reportDownloadError>`

describe("разбор ошибок Директа", () => {
  it("молчит на успешном ответе", () => {
    expect(() => assertNoApiError({ result: { Campaigns: [] } })).not.toThrow()
  })

  it("сохраняет код, текст и детали обычной ошибки v5", () => {
    const data = { error: { error_code: 8000, error_string: "Некорректный запрос", error_detail: "Поле не заполнено" } }

    expect(() => assertNoApiError(data)).toThrow(/\[8000\].*Некорректный запрос.*Поле не заполнено/)
  })

  it("на 53 объясняет, что токен недействителен и повтор не поможет", () => {
    const data = {
      error: { error_code: 53, error_string: "Ошибка авторизации", error_detail: "Недействительный OAuth-токен" }
    }

    expect(() => assertNoApiError(data)).toThrow(/YANDEX_DIRECT_TOKEN/)
    expect(() => assertNoApiError(data)).toThrow(/повторять вызов бесполезно/)
  })

  // v4 на том же токене отдаёт 53 с пустым error_detail — из его собственного текста
  // («Authorization error») причина не читается вовсе.
  it("на 53 из v4 даёт тот же разбор, а не пустое Authorization error", () => {
    const data = { error_code: 53, error_str: "Authorization error", error_detail: "" }

    expect(() => assertNoApiErrorV4(data)).toThrow(/YANDEX_DIRECT_TOKEN/)
  })

  it("сохраняет код и текст обычной ошибки v4", () => {
    expect(() => assertNoApiErrorV4({ error_code: 71, error_str: "Неверный параметр" })).toThrow(
      /v4 \[71\].*Неверный параметр/
    )
  })

  it("на кончившихся баллах говорит не повторять и показывает остаток", () => {
    const data = { error: { error_code: 152, error_string: "Недостаточно баллов" } }

    expect(() => assertNoApiError(data, "10/0/240000")).toThrow(/Что делать: .*бесполезно/)
    expect(() => assertNoApiError(data, "10/0/240000")).toThrow(/остаток.*10\/0\/240000/)
  })

  it("на отключённой операции говорит, что повтор не поможет", () => {
    const data = { error: { error_code: 3500, error_string: "Не поддерживается" } }

    expect(() => assertNoApiError(data)).toThrow(/Что делать: .*бесполезно/)
  })

  it("не выдумывает подсказку для кода без неё", () => {
    const data = { error: { error_code: 4000, error_string: "Параметры запроса указаны неверно" } }

    expect(() => assertNoApiError(data)).toThrow(/^(?!.*Что делать).*\[4000\]/)
  })

  it("даёт подсказку и в ошибке v4", () => {
    expect(() => assertNoApiErrorV4({ error_code: 506, error_str: "Too many connections" })).toThrow(
      /Что делать: .*последовательно/
    )
  })

  it("отдаёт код и request_id ошибки v5 полями, а не только текстом", () => {
    const data = { error: { error_code: "8800", error_string: "Объект не найден", request_id: "42" } }

    const error = catchError(() => assertNoApiError(data))

    expect(error).toBeInstanceOf(DirectApiError)
    expect(error).toMatchObject({ code: 8800, requestId: "42" })
  })

  it("помечает 53 кодом, хотя текст заменён целиком", () => {
    const error = catchError(() => assertNoApiErrorV4({ error_code: 53, error_str: "Authorization error" }))

    expect(error).toMatchObject({ code: 53 })
  })

  it("не выдумывает код, если Директ его не прислал", () => {
    const error = catchError(() => assertNoApiErrorV4({ error_str: "Что-то сломалось", error_code: "" }))

    expect(error).toMatchObject({ code: undefined })
  })

  it("повторяет 52 и 506 и для записи, а внутренний сбой — только для чтения", () => {
    const failure = (code: number) => new DirectApiError("сбой", code)

    expect(isTransientApiError(failure(506), { write: true })).toBe(true)
    expect(isTransientApiError(failure(52), { write: true })).toBe(true)
    expect(isTransientApiError(failure(1000), { write: false })).toBe(true)
    expect(isTransientApiError(failure(1000), { write: true })).toBe(false)
    expect(isTransientApiError(failure(152), { write: false })).toBe(false)
    expect(isTransientApiError(new Error("[1000] сбой"), { write: false })).toBe(false)
  })

  it("узнаёт 53 в XML от Reports", () => {
    expect(() => assertNoReportAuthError(REPORT_ERROR_XML(53))).toThrow(/YANDEX_DIRECT_TOKEN/)
  })

  // Прочие коды Reports остаются транспорту: он покажет и HTTP-статус, и тело целиком.
  it("пропускает прочие коды Reports", () => {
    expect(() => assertNoReportAuthError(REPORT_ERROR_XML(9000))).not.toThrow()
    expect(() => assertNoReportAuthError("")).not.toThrow()
  })
})
