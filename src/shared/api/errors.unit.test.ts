import { describe, expect, it } from "vitest"
import { assertNoApiError, assertNoApiErrorV4, assertNoReportAuthError } from "#shared/api/errors"

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

  it("узнаёт 53 в XML от Reports", () => {
    expect(() => assertNoReportAuthError(REPORT_ERROR_XML(53))).toThrow(/YANDEX_DIRECT_TOKEN/)
  })

  // Прочие коды Reports остаются транспорту: он покажет и HTTP-статус, и тело целиком.
  it("пропускает прочие коды Reports", () => {
    expect(() => assertNoReportAuthError(REPORT_ERROR_XML(9000))).not.toThrow()
    expect(() => assertNoReportAuthError("")).not.toThrow()
  })
})
