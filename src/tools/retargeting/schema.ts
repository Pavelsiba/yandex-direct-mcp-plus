import { z } from "zod"
import { RETARGETING_RULE_OPERATORS, RETARGETING_TYPES } from "#shared/config/enums"
import { MAX_IDS_PER_CALL, RETARGETING_LIMITS } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listRetargetingListsSchema = z.object({
  retargeting_list_ids: z
    .array(idField("ID условия ретаргетинга"))
    .check(z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} условий` }))
    .optional()
    .meta({ description: "Конкретные условия; без них возвращаются все" }),
  types: z
    .array(z.literal(RETARGETING_TYPES))
    .optional()
    .meta({ description: "Фильтр по типу: RETARGETING — цели Метрики, AUDIENCE — сегменты Аудиторий" }),
  ...pageFields
})

const ruleArgument = z.object({
  external_id: idField("ID цели Метрики или сегмента Аудиторий"),
  membership_life_span: z
    .int()
    .check(
      z.gte(1, { error: "Срок не меньше одного дня" }),
      z.lte(RETARGETING_LIMITS.membershipDays, { error: `Срок не больше ${RETARGETING_LIMITS.membershipDays} дней` })
    )
    .optional()
    .meta({
      description: `За сколько последних дней учитывать выполнение цели, 1–${RETARGETING_LIMITS.membershipDays}`
    })
})

const rule = z.object({
  operator: z.literal(RETARGETING_RULE_OPERATORS).meta({
    description: "Как соединять условия: ALL — выполнены все, ANY — хотя бы одно, NONE — ни одного"
  }),
  arguments: z
    .array(ruleArgument)
    .check(z.minLength(1, { error: "Правило без условий" }))
    .meta({ description: "Цели и сегменты, на которых строится правило" })
})

export const addRetargetingListSchema = z.object({
  name: z
    .string()
    .check(
      z.minLength(1, { error: "Название не может быть пустым" }),
      z.maxLength(RETARGETING_LIMITS.name, { error: `Название длиннее ${RETARGETING_LIMITS.name} символов` })
    )
    .meta({ description: "Название условия ретаргетинга" }),
  type: z
    .literal(RETARGETING_TYPES)
    .default("RETARGETING")
    .meta({ description: "RETARGETING — по целям Метрики, AUDIENCE — по сегментам Яндекс.Аудиторий" }),
  description: z
    .string()
    .check(
      z.maxLength(RETARGETING_LIMITS.description, {
        error: `Описание длиннее ${RETARGETING_LIMITS.description} символов`
      })
    )
    .optional()
    .meta({ description: "Описание условия — видно только в интерфейсе, на показы не влияет" }),
  rules: z
    .array(rule)
    .check(z.minLength(1, { error: "Условие без правил" }))
    .meta({ description: "Правила условия; между собой они соединяются логическим И" })
})
