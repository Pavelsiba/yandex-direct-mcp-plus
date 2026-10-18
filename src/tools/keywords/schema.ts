import { z } from "zod"
import { API_FIELDS, type FieldOf } from "#shared/config/api-fields"
import { AUCTION_PLACEMENTS, KEYWORD_ACTIONS } from "#shared/config/enums"
import {
  AUTO_BID_RANGES,
  BID_TARGET_LIMITS,
  KEYWORD_TEXT_MAX,
  KEYWORD_USER_PARAM_MAX,
  MAX_KEYWORDS_PER_UPDATE
} from "#shared/config/limits"
import { fieldsField } from "#shared/lib/fields"
import { idField } from "#shared/lib/id"
import { rublesField } from "#shared/lib/money"
import { pageFields } from "#shared/lib/pagination"

// Минимум для ставки: фраз в группе сотни, Statistics и Productivity утроили бы ответ.
export const KEYWORD_LIST_FIELDS: FieldOf<"keywords", "KeywordFieldEnum">[] = [
  "Id",
  "Keyword",
  "CampaignId",
  "AdGroupId",
  "Status",
  "State",
  "Bid",
  "ContextBid"
]

export const listKeywordsSchema = z.object({
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(z.minLength(1, { error: "Укажите хотя бы одну группу" }))
    .meta({ description: "Группы, ключевые фразы которых нужно выбрать" }),
  fields: fieldsField(API_FIELDS.keywords.KeywordFieldEnum, KEYWORD_LIST_FIELDS),
  ...pageFields
})

const keywordText = z
  .string()
  .check(
    z.minLength(1, { error: "Ключевая фраза не может быть пустой" }),
    z.maxLength(KEYWORD_TEXT_MAX, { error: `Ключевая фраза длиннее ${KEYWORD_TEXT_MAX} символов` })
  )

export const addKeywordsSchema = z.object({
  ad_group_id: idField("ID группы, в которую добавляются фразы"),
  keywords: z
    .array(keywordText)
    .check(z.minLength(1, { error: "Список фраз пуст" }))
    .meta({ description: "Ключевые фразы; минус-слова внутри фразы записываются через дефис" })
})

// null снимает значение, пропуск оставляет прежнее; пустая строка — тоже значение.
const userParam = (variable: string) =>
  z
    .string()
    .check(z.maxLength(KEYWORD_USER_PARAM_MAX, { error: `Значение длиннее ${KEYWORD_USER_PARAM_MAX} символов` }))
    .nullable()
    .optional()
    .meta({ description: `Значение подстановочной переменной {${variable}} в ссылке объявления; null очищает` })

const keywordUpdate = z.object({
  keyword_id: idField("ID изменяемой ключевой фразы"),
  keyword: keywordText.optional().meta({
    description:
      "Новый текст фразы: не больше 7 слов без учёта стоп- и минус-слов, каждое слово до 35 символов. Директ может завести на месте изменённой фразы новую (с другим ID) или удалить её как дубликат уже существующей; у автотаргетинга текст не меняется вовсе"
  }),
  user_param1: userParam("param1"),
  user_param2: userParam("param2")
})

export const updateKeywordsSchema = z.object({
  keywords: z
    .array(keywordUpdate)
    .check(
      z.minLength(1, { error: "Список фраз пуст" }),
      z.maxLength(MAX_KEYWORDS_PER_UPDATE, {
        error: `За один вызов допустимо не больше ${MAX_KEYWORDS_PER_UPDATE} фраз`
      })
    )
    .meta({ description: "Фразы и их новые значения; поля, которые не переданы, остаются прежними" })
})

export const manageKeywordsSchema = z.object({
  keyword_ids: z
    .array(idField("ID ключевой фразы"))
    .check(z.minLength(1, { error: "Список фраз пуст" }))
    .meta({ description: "Фразы, над которыми выполняется действие" }),
  action: z.literal(KEYWORD_ACTIONS).meta({ description: "Действие: suspend, resume или delete (необратимо)" })
})

const targetIds = (label: string, max: number | undefined, description: string) => {
  const ids = z.array(idField(label))
  return (max === undefined ? ids : ids.check(z.maxLength(max, { error: `За один вызов — не больше ${max}` })))
    .optional()
    .meta({ description })
}

// «Ровно один уровень целей» проверяет хендлер: это сочетание полей, а не поле.
// У записи пакет ограничен по каждому уровню, у чтения — только выдача (pageFields).
const bidTargetFields = (subject: string, limits?: typeof BID_TARGET_LIMITS) => ({
  keyword_ids: targetIds(
    "ID ключевой фразы или автотаргетинга",
    limits?.keywords,
    `${subject} по указанным фразам и автотаргетингам`
  ),
  ad_group_ids: targetIds("ID группы объявлений", limits?.adGroups, `${subject} по всем фразам указанных групп`),
  campaign_ids: targetIds("ID кампании", limits?.campaigns, `${subject} по всем фразам указанных кампаний`)
})

export const setKeywordBidsSchema = z.object({
  ...bidTargetFields("Ставки", BID_TARGET_LIMITS),
  search_bid: rublesField(
    "Ставка на поиске в рублях. Применяется только при ручной стратегии на поиске (HIGHEST_POSITION)"
  ).optional(),
  network_bid: rublesField(
    "Ставка в сетях (РСЯ) в рублях. Применяется только при ручной стратегии в сетях (MAXIMUM_COVERAGE)"
  ).optional(),
  autotargeting_auto_bid: z
    .boolean()
    .optional()
    .meta({
      description:
        "Автоставка автотаргетинга на поиске: true — Директ подбирает ставку сам, false — действует search_bid. " +
        "Если для keyword_ids передать search_bid без этого поля, Директ выключит автоставку; чтобы сохранить её, передайте true"
    })
})

const percentField = (range: { min: number; max: number }, description: string) =>
  z
    .int()
    .check(
      z.gte(range.min, { error: `Не меньше ${range.min}%` }),
      z.lte(range.max, { error: `Не больше ${range.max}%` })
    )
    .meta({ description: `${description}, ${range.min}–${range.max}%` })

const increasePercent = percentField(
  AUTO_BID_RANGES.increasePercent,
  "Надбавка к рассчитанной ставке; без неё ставка ровно под цель"
).optional()

export const setAutoKeywordBidsSchema = z.object({
  ...bidTargetFields("Ставки", BID_TARGET_LIMITS),
  search: z
    .object({
      traffic_volume: percentField(
        AUTO_BID_RANGES.trafficVolume,
        "Желаемый объём трафика на поиске: 100 — максимум, доступный фразе"
      ),
      increase_percent: increasePercent,
      bid_ceiling: rublesField("Потолок ставки на поиске в рублях").optional()
    })
    .optional()
    .meta({ description: "Правило ставки на поиске: под объём трафика. Только при ручной стратегии на поиске" }),
  network: z
    .object({
      coverage: percentField(AUTO_BID_RANGES.coverage, "Желаемая частота показа — доля аудитории в сетях"),
      increase_percent: increasePercent,
      bid_ceiling: rublesField("Потолок ставки в сетях в рублях").optional()
    })
    .optional()
    .meta({ description: "Правило ставки в сетях: под долю аудитории. Только при ручной стратегии в сетях" })
})

export const getKeywordAuctionSchema = z.object({
  ...bidTargetFields("Аукцион"),
  placements: z
    .array(z.literal(AUCTION_PLACEMENTS))
    .check(z.minLength(1, { error: "Укажите хотя бы одну площадку" }))
    .default([...AUCTION_PLACEMENTS])
    .meta({
      description:
        "Чьи торги показать: search — поиск, network — сети. По умолчанию обе; у кампании с выключенными " +
        "показами на одной из площадок запрашивайте только другую"
    }),
  ...pageFields
})
