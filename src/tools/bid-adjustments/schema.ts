// Корректировки ставок: коэффициент в процентах, не деньги — rublesField здесь не к месту.
import { z } from "zod"
import { BID_ADJUSTMENT_LEVELS, BID_ADJUSTMENT_TYPES } from "#shared/config/enums"
import {
  BID_MODIFIER_RANGE,
  MAX_AD_GROUPS_PER_CALL,
  MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL,
  MAX_IDS_PER_CALL
} from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

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
  bid_modifier: z
    .int()
    .check(
      z.gte(BID_MODIFIER_RANGE.min, { error: `Коэффициент не меньше ${BID_MODIFIER_RANGE.min}` }),
      z.lte(BID_MODIFIER_RANGE.max, { error: `Коэффициент не больше ${BID_MODIFIER_RANGE.max}` })
    )
    .meta({
      description: `Коэффициент в процентах, ${BID_MODIFIER_RANGE.min}–${BID_MODIFIER_RANGE.max}: 100 — ставка без изменений`
    })
})

export const setBidAdjustmentsSchema = z.object({
  adjustments: z
    .array(bidAdjustment)
    .check(
      z.minLength(1, { error: "Список корректировок пуст" }),
      z.maxLength(MAX_AD_GROUPS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_AD_GROUPS_PER_CALL} корректировок`
      })
    )
    .meta({ description: "Корректировки и их новые коэффициенты" })
})
