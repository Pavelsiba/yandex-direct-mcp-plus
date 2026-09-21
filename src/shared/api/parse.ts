// Проверка формы ответа Директа схемой.
import type { z } from "zod"
import { prettifyError } from "zod"

// Схемы ответов — нестрогие: новое поле Директа не должно ломать инструмент.
export function parseApiResult<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  what: string
): z.infer<Schema> {
  const parsed = schema.safeParse(value)
  if (parsed.success) return parsed.data

  throw new Error(`Директ вернул ${what} в неожиданной форме: ${prettifyError(parsed.error)}`)
}
