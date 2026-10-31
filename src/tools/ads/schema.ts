import { z } from "zod"
import { AD_ACTIONS, AD_STATES, AD_STATUSES, AD_TYPES } from "#shared/config/enums"
import {
  MAX_AD_GROUPS_PER_CALL,
  MAX_ADS_PER_MODERATION,
  MAX_CAMPAIGNS_PER_ADS_CALL,
  MAX_IDS_PER_CALL,
  RESPONSIVE_AD_LIMITS
} from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listAdsSchema = z
  .object({
    ad_ids: z
      .array(idField("ID объявления"))
      .check(
        z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} объявлений` })
      )
      .optional()
      .meta({ description: "Конкретные объявления по ID" }),
    ad_group_ids: z
      .array(idField("ID группы объявлений"))
      .check(
        z.maxLength(MAX_AD_GROUPS_PER_CALL, {
          error: `За один вызов допустимо не больше ${MAX_AD_GROUPS_PER_CALL} групп`
        })
      )
      .optional()
      .meta({ description: "Группы, объявления которых нужно выбрать" }),
    campaign_ids: z
      .array(idField("ID кампании"))
      .check(
        z.maxLength(MAX_CAMPAIGNS_PER_ADS_CALL, {
          error: `За один вызов допустимо не больше ${MAX_CAMPAIGNS_PER_ADS_CALL} кампаний`
        })
      )
      .optional()
      .meta({ description: `Кампании, объявления которых нужно выбрать, до ${MAX_CAMPAIGNS_PER_ADS_CALL}` }),
    states: z
      .array(z.literal(AD_STATES))
      .optional()
      .meta({ description: "Фильтр по состоянию: ON — показывается, SUSPENDED — остановлено, ARCHIVED — в архиве" }),
    statuses: z.array(z.literal(AD_STATUSES)).optional().meta({ description: "Фильтр по статусу модерации" }),
    types: z.array(z.literal(AD_TYPES)).optional().meta({ description: "Фильтр по типу объявления" }),
    ...pageFields
  })
  .refine((params) => [params.ad_ids, params.ad_group_ids, params.campaign_ids].some((ids) => ids && ids.length > 0), {
    error: "Укажите хотя бы одно из ad_ids, ad_group_ids, campaign_ids: без них Директ не отбирает объявления"
  })

const titleField = z
  .string()
  .check(
    z.minLength(1, { error: "Заголовок не может быть пустым" }),
    z.maxLength(RESPONSIVE_AD_LIMITS.title, { error: `Заголовок длиннее ${RESPONSIVE_AD_LIMITS.title} символов` })
  )

const textField = z
  .string()
  .check(
    z.minLength(1, { error: "Текст не может быть пустым" }),
    z.maxLength(RESPONSIVE_AD_LIMITS.text, { error: `Текст длиннее ${RESPONSIVE_AD_LIMITS.text} символов` })
  )

const titlesField = z.array(titleField).check(
  z.minLength(1, { error: "Нужен хотя бы один заголовок" }),
  z.maxLength(RESPONSIVE_AD_LIMITS.titles, {
    error: `Заголовков допустимо не больше ${RESPONSIVE_AD_LIMITS.titles}`
  })
)

const textsField = z
  .array(textField)
  .check(
    z.minLength(1, { error: "Нужен хотя бы один текст" }),
    z.maxLength(RESPONSIVE_AD_LIMITS.texts, { error: `Текстов допустимо не больше ${RESPONSIVE_AD_LIMITS.texts}` })
  )

const TITLES_DESCRIPTION = `Заголовки, от 1 до ${RESPONSIVE_AD_LIMITS.titles}, каждый до ${RESPONSIVE_AD_LIMITS.title} символов`
const TEXTS_DESCRIPTION = `Тексты, от 1 до ${RESPONSIVE_AD_LIMITS.texts}, каждый до ${RESPONSIVE_AD_LIMITS.text} символов`

export const createResponsiveAdSchema = z.object({
  ad_group_id: idField("ID группы, в которой создаётся объявление"),
  titles: titlesField.meta({ description: TITLES_DESCRIPTION }),
  texts: textsField.meta({ description: TEXTS_DESCRIPTION }),
  href: z
    .string()
    .check(z.minLength(1, { error: "Ссылка не может быть пустой" }))
    .meta({ description: "Ссылка на сайт" })
})

export const updateResponsiveAdSchema = z.object({
  ad_id: idField("ID обновляемого объявления"),
  titles: titlesField
    .optional()
    .meta({ description: `${TITLES_DESCRIPTION}. Заменяют прежние целиком: передайте полный набор` }),
  texts: textsField
    .optional()
    .meta({ description: `${TEXTS_DESCRIPTION}. Заменяют прежние целиком: передайте полный набор` }),
  href: z
    .string()
    .check(z.minLength(1, { error: "Ссылка не может быть пустой" }))
    .optional()
    .meta({ description: "Новая ссылка на сайт" })
})

export const manageAdsSchema = z.object({
  ad_ids: z
    .array(idField("ID объявления"))
    .check(z.minLength(1, { error: "Список объявлений пуст" }))
    .meta({ description: "Объявления, над которыми выполняется действие" }),
  action: z.literal(AD_ACTIONS).meta({
    description: "Действие: suspend, resume, archive, unarchive, moderate или delete (необратимо)"
  })
})

export const moderateAdsSchema = z.object({
  ad_ids: z
    .array(idField("ID объявления"))
    .check(
      z.minLength(1, { error: "Список объявлений пуст" }),
      z.maxLength(MAX_ADS_PER_MODERATION, {
        error: `За один вызов допустимо не больше ${MAX_ADS_PER_MODERATION} объявлений`
      })
    )
    .meta({ description: "Объявления, отправляемые на модерацию" })
})
