// ID Директа наружу — десятичные строки, внутрь API — BigInt.
// z.coerce здесь запрещён: он принял бы уже округлённое число и превратил его
// в правдоподобную строку, заменив явную ошибку валидации тихо неверным ID.
import { z } from "zod"

const DECIMAL_ID = /^[1-9]\d*$/

export function idField(description: string) {
  return z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? "ID обязателен"
          : "ID пришёл числом и уже потерял точность: 19-значные ID Директа не помещаются в число JavaScript. Передавайте строкой."
    })
    .regex(DECIMAL_ID, { error: "ID должен быть положительным целым числом в виде строки" })
    .meta({ description })
}

export function apiId(id: string): bigint {
  return BigInt(id)
}

export function apiIds(ids: string[]): bigint[] {
  return ids.map(apiId)
}
