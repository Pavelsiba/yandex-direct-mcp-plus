// Параметр fields у list-инструментов: набор по умолчанию узкий, чтобы не раздувать ответ
// на сотни объектов, но вызывающий может его расширить.
import { z } from "zod"

export function fieldsField(values: readonly [string, ...string[]], defaults: readonly string[]) {
  return z
    .array(z.literal(values))
    .check(z.minLength(1, { error: "Список полей пуст" }))
    .optional()
    .meta({ description: `Какие поля вернуть; по умолчанию ${defaults.join(", ")}` })
}
