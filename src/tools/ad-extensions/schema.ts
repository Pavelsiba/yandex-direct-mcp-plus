// Уточнения (Callout) — единственный тип расширений, который покрывает сервер.
import { z } from "zod"
import { AD_EXTENSION_STATES, AD_EXTENSION_STATUSES } from "#shared/config/enums"
import { CALLOUT_TEXT_MAX, MAX_CALLOUTS_PER_CALL, MAX_IDS_PER_CALL } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listAdExtensionsSchema = z.object({
  ad_extension_ids: z
    .array(idField("ID уточнения"))
    .max(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} уточнений` })
    .optional()
    .meta({ description: "Конкретные уточнения; без них возвращаются все" }),
  states: z.array(z.literal(AD_EXTENSION_STATES)).optional().meta({ description: "Фильтр по состоянию уточнения" }),
  statuses: z
    .array(z.literal(AD_EXTENSION_STATUSES))
    .optional()
    .meta({ description: "Фильтр по статусу модерации уточнения" }),
  ...pageFields
})

export const addAdExtensionsSchema = z.object({
  callouts: z
    .array(
      z
        .string()
        .min(1, { error: "Текст уточнения не может быть пустым" })
        .max(CALLOUT_TEXT_MAX, { error: `Текст уточнения длиннее ${CALLOUT_TEXT_MAX} символов` })
    )
    .min(1, { error: "Список уточнений пуст" })
    .max(MAX_CALLOUTS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_CALLOUTS_PER_CALL} уточнений` })
    .meta({ description: `Тексты уточнений, каждый до ${CALLOUT_TEXT_MAX} символов` })
})

export const deleteAdExtensionsSchema = z.object({
  ad_extension_ids: z
    .array(idField("ID уточнения"))
    .min(1, { error: "Список уточнений пуст" })
    .max(MAX_CALLOUTS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_CALLOUTS_PER_CALL} уточнений` })
    .meta({ description: "Уточнения, которые будут удалены безвозвратно" })
})
