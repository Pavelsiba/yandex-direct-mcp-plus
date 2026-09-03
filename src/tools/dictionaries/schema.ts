import { z } from "zod"
import { REGIONS_DEFAULT_LIMIT, REGIONS_MAX_LIMIT } from "#shared/config/limits"

export const getRegionsSchema = z.object({
  search: z
    .string()
    .optional()
    .meta({ description: "Фильтр по названию региона: подстрока без учёта регистра, например «москва»" }),
  limit: z
    .number()
    .int()
    .positive({ error: "Лимит должен быть больше нуля" })
    .max(REGIONS_MAX_LIMIT, { error: `Лимит не больше ${REGIONS_MAX_LIMIT}` })
    .default(REGIONS_DEFAULT_LIMIT)
    .meta({ description: `Сколько регионов вернуть, максимум ${REGIONS_MAX_LIMIT}` })
})
