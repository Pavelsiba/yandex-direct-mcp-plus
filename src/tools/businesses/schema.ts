import { z } from "zod"
import { MAX_IDS_PER_CALL } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listBusinessesSchema = z.object({
  business_ids: z
    .array(idField("ID профиля организации"))
    .check(z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} профилей` }))
    .optional()
    .meta({ description: "Конкретные профили; без них возвращаются все доступные" }),
  ...pageFields
})
