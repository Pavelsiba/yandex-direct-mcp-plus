// ID наружу — десятичные строки, в API — BigInt. Без z.coerce: он принял бы уже
// округлённое число и тихо превратил его в неверный ID.
import { z } from "zod"

const DECIMAL_ID = /^[1-9]\d*$/

// Код региона — не ID: минус исключает регион из показов, 0 значит «все регионы».
const REGION_CODE = /^(0|-?[1-9]\d*)$/

export function idField(description: string) {
  return z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "ID обязателен"
          : "ID пришёл числом и уже потерял точность: 19-значные ID Директа не помещаются в число JavaScript. Передавайте строкой."
    })
    .check(z.regex(DECIMAL_ID, { error: "ID должен быть положительным целым числом в виде строки" }))
    .meta({ description })
}

export function regionIdField(description: string) {
  return z
    .string({
      error: (issue) => (issue.input === undefined ? "Код региона обязателен" : "Код региона передаётся строкой")
    })
    .check(
      z.regex(REGION_CODE, {
        error: 'Код региона — целое число в виде строки: "225" — показывать, "-219" — исключить, "0" — все регионы'
      })
    )
    .meta({ description })
}

export function apiId(id: string): bigint {
  return BigInt(id)
}

export function apiIds(ids: string[]): bigint[] {
  return ids.map(apiId)
}
