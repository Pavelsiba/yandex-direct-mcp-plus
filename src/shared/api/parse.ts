// Проверка формы ответа Директа схемой. Рядом с `errors.ts` не случайно: там разбор
// ошибки, объявленной самим API, здесь — расхождение с тем, что API обещал.
import type { z } from "zod"
import { prettifyError } from "zod"

// Схемы ответов пишутся нестрогими (`z.looseObject`): Директ добавляет поля без
// предупреждения, и строгая схема превратила бы такое добавление в отказ инструмента.
// Обязательными объявляются только поля, на которые опирается сам инструмент.
export function parseApiResult<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  what: string
): z.infer<Schema> {
  const parsed = schema.safeParse(value)
  if (parsed.success) return parsed.data

  throw new Error(`Директ вернул ${what} в неожиданной форме: ${prettifyError(parsed.error)}`)
}
