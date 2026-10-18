import { z } from "zod"
import { API_FIELDS } from "#shared/config/api-fields"

// ReportName обязан быть уникальным в пределах аккаунта, поэтому в него идёт время.
// Часы вынесены параметром: Date.now() внутри хендлера сделал бы его непроверяемым.
export function reportName(prefix: string, now: () => number = Date.now): string {
  return `${prefix}_${now()}`
}

// Имена из FieldEnum reports.xsd. Какие из них допустимы в конкретном типе отчёта, решает
// Директ: матрица совместимости в справке расходится со схемой, и её копия устарела бы молча.
export function reportFieldsField(description: string) {
  return z
    .array(z.literal(API_FIELDS.reports.FieldEnum))
    .check(z.minLength(1, { error: "Список полей пуст: не указывайте fields, чтобы взять поля по умолчанию" }))
    .optional()
    .meta({ description })
}
