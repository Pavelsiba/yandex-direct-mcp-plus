// Корректировки ставок: коэффициент в процентах, не деньги — rublesField здесь не к месту.
import { z } from "zod"
import {
  AGE_RANGES,
  BID_ADJUSTMENT_LEVELS,
  BID_ADJUSTMENT_TYPES,
  GENDERS,
  INCOME_GRADES,
  OPERATING_SYSTEM_TYPES,
  SERP_LAYOUTS
} from "#shared/config/enums"
import {
  BID_MODIFIER_RANGE,
  MAX_AD_GROUPS_PER_CALL,
  MAX_ADJUSTMENTS_PER_CALL,
  MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL,
  MAX_IDS_PER_CALL
} from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

const bidModifierField = z
  .int()
  .check(
    z.gte(BID_MODIFIER_RANGE.min, { error: `Коэффициент не меньше ${BID_MODIFIER_RANGE.min}` }),
    z.lte(BID_MODIFIER_RANGE.max, { error: `Коэффициент не больше ${BID_MODIFIER_RANGE.max}` })
  )
  .meta({
    description: `Коэффициент в процентах, ${BID_MODIFIER_RANGE.min}–${BID_MODIFIER_RANGE.max}: 100 — ставка без изменений`
  })

export const getBidAdjustmentsSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании"))
    .check(
      z.minLength(1, { error: "Список кампаний пуст" }),
      z.maxLength(MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL, {
        error: `За один вызов допустимо не больше ${MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL} кампаний`
      })
    )
    .optional()
    .meta({ description: "Кампании, корректировки которых нужно получить" }),
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(
      z.minLength(1, { error: "Список групп пуст" }),
      z.maxLength(MAX_AD_GROUPS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_AD_GROUPS_PER_CALL} групп`
      })
    )
    .optional()
    .meta({ description: "Группы, корректировки которых нужно получить" }),
  adjustment_ids: z
    .array(idField("ID корректировки"))
    .check(
      z.minLength(1, { error: "Список корректировок пуст" }),
      z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} корректировок` })
    )
    .optional()
    .meta({ description: "Конкретные корректировки по их ID" }),
  types: z.array(z.literal(BID_ADJUSTMENT_TYPES)).optional().meta({ description: "Фильтр по типу корректировки" }),
  levels: z
    .array(z.literal(BID_ADJUSTMENT_LEVELS))
    .check(z.minLength(1, { error: "Укажите хотя бы один уровень" }))
    .meta({ description: "Уровни корректировок: CAMPAIGN и/или AD_GROUP" }),
  ...pageFields
})

const bidAdjustment = z.object({
  adjustment_id: idField("ID существующей корректировки"),
  bid_modifier: bidModifierField
})

export const setBidAdjustmentsSchema = z.object({
  adjustments: z
    .array(bidAdjustment)
    .check(
      z.minLength(1, { error: "Список корректировок пуст" }),
      z.maxLength(MAX_ADJUSTMENTS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_ADJUSTMENTS_PER_CALL} корректировок`
      })
    )
    .meta({ description: "Корректировки и их новые коэффициенты" })
})

// Срез, на который вешается коэффициент, у каждого вида свой, поэтому поля описаны
// плоско и помечены видом: какие обязательны, проверяет хендлер — в схеме это
// превратилось бы в тринадцать вариантов объекта.
const newBidAdjustment = z.object({
  type: z.literal(BID_ADJUSTMENT_TYPES).meta({
    description:
      "Вид корректировки: устройства (MOBILE/TABLET/DESKTOP/DESKTOP_ONLY/SMART_TV), DEMOGRAPHICS — пол и возраст, RETARGETING — условие ретаргетинга, REGIONAL — регион, VIDEO — видеодополнения, SMART_AD — смарт-объявления, SERP_LAYOUT — эксклюзивное размещение, INCOME_GRADE — платёжеспособность, AD_GROUP — группа целиком"
  }),
  bid_modifier: bidModifierField,
  operating_system_type: z.literal(OPERATING_SYSTEM_TYPES).optional().meta({
    description: "Для MOBILE и TABLET: сузить корректировку до одной ОС; без него — любая"
  }),
  gender: z
    .literal(GENDERS)
    .optional()
    .meta({ description: "Для DEMOGRAPHICS: пол; вместе с age или отдельно от него" }),
  age: z
    .literal(AGE_RANGES)
    .optional()
    .meta({ description: "Для DEMOGRAPHICS: возрастная группа; вместе с gender или отдельно от него" }),
  retargeting_condition_id: idField("Для RETARGETING: ID условия ретаргетинга из list_retargeting_lists").optional(),
  region_id: idField("Для REGIONAL: ID региона из get_regions").optional(),
  serp_layout: z.literal(SERP_LAYOUTS).optional().meta({
    description: "Для SERP_LAYOUT: ALONE — единственное объявление в блоке, SUGGEST — показ в саджесте"
  }),
  income_grade: z.literal(INCOME_GRADES).optional().meta({
    description: "Для INCOME_GRADE: сегмент платёжеспособности — VERY_HIGH (топ-5%), HIGH, ABOVE_AVERAGE"
  })
})

// Лимит Директа — на элементах запроса, а их получается произведение целей на виды
// корректировок. Схема стережёт каждый список по отдельности, произведение — хендлер:
// поля друг о друге не знают, и запрет на сочетание в схему не помещается.
const addTargetIds = (subject: string) =>
  z
    .array(idField(`ID ${subject}`))
    .check(
      z.minLength(1, { error: `Список ${subject} пуст` }),
      z.maxLength(MAX_ADJUSTMENTS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_ADJUSTMENTS_PER_CALL} элементов`
      })
    )
    .optional()

export const addBidAdjustmentsSchema = z.object({
  campaign_ids: addTargetIds("кампании").meta({
    description: "Кампании, которым добавляются корректировки; вместо ad_group_ids"
  }),
  ad_group_ids: addTargetIds("группы объявлений").meta({
    description: "Группы, которым добавляются корректировки; вместо campaign_ids"
  }),
  adjustments: z
    .array(newBidAdjustment)
    .check(
      z.minLength(1, { error: "Список корректировок пуст" }),
      z.maxLength(MAX_ADJUSTMENTS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_ADJUSTMENTS_PER_CALL} корректировок`
      })
    )
    .meta({
      description: `Корректировки; каждая ставится каждому объекту из campaign_ids или ad_group_ids. Всего за вызов не больше ${MAX_ADJUSTMENTS_PER_CALL} корректировок — это цели, умноженные на виды`
    })
})

export const deleteBidAdjustmentsSchema = z.object({
  adjustment_ids: z
    .array(idField("ID корректировки"))
    .check(
      z.minLength(1, { error: "Список корректировок пуст" }),
      z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} корректировок` })
    )
    .meta({ description: "Корректировки, которые нужно удалить; ID берутся из get_bid_adjustments" })
})
