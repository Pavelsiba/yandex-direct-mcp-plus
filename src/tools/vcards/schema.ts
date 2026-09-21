import { z } from "zod"
import { MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL, MAX_IDS_PER_CALL } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listVcardsSchema = z.object({
  vcard_ids: z
    .array(idField("ID визитки"))
    .check(z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} визиток` }))
    .optional()
    .meta({ description: "Конкретные визитки по их ID" }),
  campaign_ids: z
    .array(idField("ID кампании"))
    .check(
      z.maxLength(MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL, {
        error: `За один вызов допустимо не больше ${MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL} кампаний`
      })
    )
    .optional()
    .meta({ description: "Найти визитки, привязанные к объявлениям этих кампаний" }),
  ...pageFields
})

export const deleteVcardsSchema = z.object({
  vcard_ids: z
    .array(idField("ID визитки"))
    .check(
      z.minLength(1, { error: "Список визиток пуст" }),
      z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} визиток` })
    )
    .meta({ description: "Визитки, которые нужно удалить; ID берутся из list_vcards" })
})
