// Даты Директа: календарный день YYYY-MM-DD и момент времени ISO 8601.
import { z } from "zod"

const DATE = /^\d{4}-\d{2}-\d{2}$/
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

export function dateField(description: string) {
  return z
    .string()
    .check(z.regex(DATE, { error: "Дата указывается в формате YYYY-MM-DD" }))
    .meta({ description })
}

export function timestampField(description: string) {
  return z
    .string()
    .check(z.regex(TIMESTAMP, { error: "Момент времени указывается в формате YYYY-MM-DDThh:mm:ssZ" }))
    .refine((value) => !Number.isNaN(Date.parse(value)), { error: "Такой даты не существует" })
    .meta({ description })
}
