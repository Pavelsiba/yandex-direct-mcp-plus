import { z } from "zod"
import {
  AUDIENCE_TARGET_STATES,
  DYNAMIC_TARGET_ACTIONS,
  STRATEGY_PRIORITIES,
  WEBPAGE_CONDITION_OPERANDS,
  WEBPAGE_CONDITION_OPERATORS
} from "#shared/config/enums"
import { MAX_AD_GROUPS_PER_CALL, MAX_CAMPAIGNS_PER_AUDIENCE_CALL, MAX_IDS_PER_CALL } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { rublesField } from "#shared/lib/money"
import { pageFields } from "#shared/lib/pagination"

export const listDynamicTargetsSchema = z.object({
  dynamic_target_ids: z
    .array(idField("ID динамической цели"))
    .check(z.maxLength(MAX_IDS_PER_CALL, { error: `Не больше ${MAX_IDS_PER_CALL} целей за вызов` }))
    .optional()
    .meta({ description: "Конкретные динамические цели" }),
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(z.maxLength(MAX_AD_GROUPS_PER_CALL, { error: `Не больше ${MAX_AD_GROUPS_PER_CALL} групп за вызов` }))
    .optional()
    .meta({ description: "Цели выбранных групп" }),
  campaign_ids: z
    .array(idField("ID кампании"))
    .check(
      z.maxLength(MAX_CAMPAIGNS_PER_AUDIENCE_CALL, {
        error: `Не больше ${MAX_CAMPAIGNS_PER_AUDIENCE_CALL} кампаний за вызов`
      })
    )
    .optional()
    .meta({ description: "Цели выбранных кампаний" }),
  states: z
    .array(z.literal(AUDIENCE_TARGET_STATES))
    .optional()
    .meta({ description: "Фильтр по состоянию: ON или SUSPENDED" }),
  ...pageFields
})

// Условие нацеливания: по какому свойству страницы отбирать и с каким оператором.
const webpageCondition = z.object({
  operand: z.literal(WEBPAGE_CONDITION_OPERANDS).meta({
    description: "Свойство страницы: URL, DOMAIN, PAGE_TITLE, PAGE_CONTENT или OFFERS_LIST_URL"
  }),
  operator: z.literal(WEBPAGE_CONDITION_OPERATORS).meta({
    description: "Как сравнивать: EQUALS_ANY, NOT_EQUALS_ALL, CONTAINS_ANY или NOT_CONTAINS_ALL"
  }),
  arguments: z
    .array(z.string().check(z.minLength(1, { error: "Аргумент условия не может быть пустым" })))
    .check(z.minLength(1, { error: "Условие без аргументов" }))
    .meta({ description: "Значения, с которыми сравнивается свойство страницы" })
})

const dynamicTarget = z.object({
  ad_group_id: idField("ID группы динамических объявлений"),
  name: z
    .string()
    .check(z.minLength(1, { error: "Название не может быть пустым" }))
    .meta({ description: "Название цели" }),
  conditions: z
    .array(webpageCondition)
    .check(z.minLength(1, { error: "Цель без условий" }))
    .meta({ description: "Условия отбора страниц; между собой соединяются логическим И" }),
  bid: rublesField("Ставка на поиске в рублях; 0 — снять ставку", { allowZero: true }).optional(),
  context_bid: rublesField("Ставка в сетях в рублях; 0 — снять ставку", { allowZero: true }).optional(),
  strategy_priority: z
    .literal(STRATEGY_PRIORITIES)
    .optional()
    .meta({ description: "Приоритет для автоматических стратегий" })
})

const dynamicBid = z.object({
  dynamic_target_id: idField("ID динамической цели").optional(),
  ad_group_id: idField("ID группы: ставка применится ко всем её целям").optional(),
  campaign_id: idField("ID кампании: ставка применится ко всем её целям").optional(),
  bid: rublesField("Ставка на поиске в рублях; 0 — снять ставку", { allowZero: true }).optional(),
  context_bid: rublesField("Ставка в сетях в рублях; 0 — снять ставку", { allowZero: true }).optional(),
  strategy_priority: z
    .literal(STRATEGY_PRIORITIES)
    .optional()
    .meta({ description: "Приоритет для автоматических стратегий" })
})

export const manageDynamicTargetsSchema = z.object({
  action: z.literal(DYNAMIC_TARGET_ACTIONS).meta({
    description: "Что сделать: add, set_bids, suspend, resume или delete (необратимо)"
  }),
  targets: z
    .array(dynamicTarget)
    .check(
      z.minLength(1, { error: "Список целей пуст" }),
      z.maxLength(MAX_AD_GROUPS_PER_CALL, { error: `Не больше ${MAX_AD_GROUPS_PER_CALL} целей за вызов` })
    )
    .optional()
    .meta({ description: "Цели для добавления; обязателен при action=add" }),
  bids: z
    .array(dynamicBid)
    .check(
      z.minLength(1, { error: "Список ставок пуст" }),
      z.maxLength(MAX_IDS_PER_CALL, { error: `Не больше ${MAX_IDS_PER_CALL} ставок за вызов` })
    )
    .optional()
    .meta({ description: "Новые ставки и приоритеты; обязателен при action=set_bids" }),
  dynamic_target_ids: z
    .array(idField("ID динамической цели"))
    .check(
      z.minLength(1, { error: "Список целей пуст" }),
      z.maxLength(MAX_IDS_PER_CALL, { error: `Не больше ${MAX_IDS_PER_CALL} целей за вызов` })
    )
    .optional()
    .meta({ description: "Цели для suspend, resume или delete" })
})
