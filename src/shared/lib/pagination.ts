// Общие поля пагинации для list-инструментов: Page.Limit / Page.Offset.
// Обрезанную выборку сервер помечает LimitedBy — его подсказывает format.
import { z } from "zod"
import { PAGE_MAX_LIMIT } from "#shared/config/limits"

export const pageFields = {
  limit: z
    .number()
    .int()
    .positive()
    .max(PAGE_MAX_LIMIT)
    .optional()
    .meta({ description: `Сколько объектов вернуть (максимум ${PAGE_MAX_LIMIT})` }),
  offset: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .meta({ description: "Смещение выборки: сюда передаётся LimitedBy предыдущей страницы" })
}

export function buildPage(params: { limit?: number; offset?: number }): Record<string, number> | undefined {
  if (params.limit === undefined && params.offset === undefined) return undefined

  const page: Record<string, number> = {}
  if (params.limit !== undefined) page.Limit = params.limit
  if (params.offset !== undefined) page.Offset = params.offset
  return page
}
