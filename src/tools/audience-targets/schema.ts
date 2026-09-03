import { z } from "zod"
import { AUDIENCE_TARGET_ACTIONS, AUDIENCE_TARGET_STATES, STRATEGY_PRIORITIES } from "#shared/config/enums"
import { MAX_AD_GROUPS_PER_CALL, MAX_CAMPAIGNS_PER_AUDIENCE_CALL, MAX_IDS_PER_CALL } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { rublesField } from "#shared/lib/money"
import { pageFields } from "#shared/lib/pagination"

export const listAudienceTargetsSchema = z.object({
  audience_target_ids: z
    .array(idField("ID условия нацеливания"))
    .check(z.maxLength(MAX_IDS_PER_CALL, { error: `Не больше ${MAX_IDS_PER_CALL} условий за вызов` }))
    .optional()
    .meta({ description: "Конкретные условия нацеливания" }),
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(z.maxLength(MAX_AD_GROUPS_PER_CALL, { error: `Не больше ${MAX_AD_GROUPS_PER_CALL} групп за вызов` }))
    .optional()
    .meta({ description: "Условия выбранных групп" }),
  campaign_ids: z
    .array(idField("ID кампании"))
    .check(
      z.maxLength(MAX_CAMPAIGNS_PER_AUDIENCE_CALL, {
        error: `Не больше ${MAX_CAMPAIGNS_PER_AUDIENCE_CALL} кампаний за вызов`
      })
    )
    .optional()
    .meta({ description: "Условия выбранных кампаний" }),
  retargeting_list_ids: z
    .array(idField("ID условия ретаргетинга"))
    .check(
      z.maxLength(MAX_AD_GROUPS_PER_CALL, {
        error: `Не больше ${MAX_AD_GROUPS_PER_CALL} условий ретаргетинга за вызов`
      })
    )
    .optional()
    .meta({ description: "Условия, построенные на этих списках ретаргетинга" }),
  interest_ids: z
    .array(idField("ID интереса к мобильным приложениям"))
    .check(z.maxLength(MAX_AD_GROUPS_PER_CALL, { error: `Не больше ${MAX_AD_GROUPS_PER_CALL} интересов за вызов` }))
    .optional()
    .meta({ description: "Условия, построенные на этих интересах" }),
  states: z
    .array(z.literal(AUDIENCE_TARGET_STATES))
    .optional()
    .meta({ description: "Фильтр по состоянию: ON или SUSPENDED" }),
  ...pageFields
})

// Цель строится ровно на одном источнике: список ретаргетинга или интерес.
// Проверку «ровно один» делает хендлер — она про сочетание полей.
const audienceTarget = z.object({
  ad_group_id: idField("ID группы, в которую добавляется условие"),
  retargeting_list_id: idField("ID условия ретаргетинга").optional(),
  interest_id: idField("ID интереса к мобильным приложениям").optional(),
  context_bid: rublesField("Ставка в сетях в рублях; 0 — снять ставку", { allowZero: true }).optional(),
  strategy_priority: z
    .literal(STRATEGY_PRIORITIES)
    .optional()
    .meta({ description: "Приоритет для автоматических стратегий: LOW, NORMAL или HIGH" })
})

const audienceBid = z.object({
  audience_target_id: idField("ID условия нацеливания").optional(),
  ad_group_id: idField("ID группы: ставка применится ко всем её условиям").optional(),
  campaign_id: idField("ID кампании: ставка применится ко всем её условиям").optional(),
  context_bid: rublesField("Ставка в сетях в рублях; 0 — снять ставку", { allowZero: true }).optional(),
  strategy_priority: z
    .literal(STRATEGY_PRIORITIES)
    .optional()
    .meta({ description: "Приоритет для автоматических стратегий" })
})

export const setAudienceTargetsSchema = z.object({
  action: z.literal(AUDIENCE_TARGET_ACTIONS).meta({
    description: "Что сделать: add, set_bids, suspend, resume или delete (необратимо)"
  }),
  targets: z
    .array(audienceTarget)
    .check(
      z.minLength(1, { error: "Список условий пуст" }),
      z.maxLength(MAX_AD_GROUPS_PER_CALL, { error: `Не больше ${MAX_AD_GROUPS_PER_CALL} условий за вызов` })
    )
    .optional()
    .meta({ description: "Условия для добавления; обязателен при action=add" }),
  bids: z
    .array(audienceBid)
    .check(
      z.minLength(1, { error: "Список ставок пуст" }),
      z.maxLength(MAX_IDS_PER_CALL, { error: `Не больше ${MAX_IDS_PER_CALL} ставок за вызов` })
    )
    .optional()
    .meta({ description: "Новые ставки и приоритеты; обязателен при action=set_bids" }),
  audience_target_ids: z
    .array(idField("ID условия нацеливания"))
    .check(
      z.minLength(1, { error: "Список условий пуст" }),
      z.maxLength(MAX_IDS_PER_CALL, { error: `Не больше ${MAX_IDS_PER_CALL} условий за вызов` })
    )
    .optional()
    .meta({ description: "Условия для suspend, resume или delete" })
})
