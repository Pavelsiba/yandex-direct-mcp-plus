import { z } from "zod"
import { MAX_IDS_PER_CALL } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listFeedsSchema = z.object({
  feed_ids: z
    .array(idField("ID фида"))
    .check(z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} фидов` }))
    .optional()
    .meta({ description: "Конкретные фиды; без них возвращаются все фиды аккаунта" }),
  ...pageFields
})
