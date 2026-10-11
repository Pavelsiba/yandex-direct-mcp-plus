import { z } from "zod"
import { AD_ACTIONS, AD_STATES, AD_STATUSES, AD_TYPES } from "#shared/config/enums"
import {
  AD_TEXT_LIMITS,
  MAX_AD_GROUPS_PER_CALL,
  MAX_ADS_PER_MODERATION,
  MAX_CAMPAIGNS_PER_ADS_CALL,
  MAX_IDS_PER_CALL
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

export const createTextAdSchema = z.object({
  ad_group_id: idField("ID группы, в которой создаётся объявление"),
  title: z
    .string()
    .check(
      z.minLength(1, { error: "Заголовок не может быть пустым" }),
      z.maxLength(AD_TEXT_LIMITS.title, { error: `Заголовок длиннее ${AD_TEXT_LIMITS.title} символов` })
    )
    .meta({ description: `Заголовок объявления, до ${AD_TEXT_LIMITS.title} символов` }),
  title2: z
    .string()
    .check(z.maxLength(AD_TEXT_LIMITS.title2, { error: `Второй заголовок длиннее ${AD_TEXT_LIMITS.title2} символов` }))
    .optional()
    .meta({ description: `Второй заголовок, до ${AD_TEXT_LIMITS.title2} символов` }),
  text: z
    .string()
    .check(
      z.minLength(1, { error: "Текст не может быть пустым" }),
      z.maxLength(AD_TEXT_LIMITS.text, { error: `Текст длиннее ${AD_TEXT_LIMITS.text} символов` })
    )
    .meta({ description: `Текст объявления, до ${AD_TEXT_LIMITS.text} символов` }),
  href: z
    .string()
    .check(z.minLength(1, { error: "Ссылка не может быть пустой" }))
    .meta({ description: "Ссылка на сайт" })
})

export const updateTextAdSchema = z.object({
  ad_id: idField("ID обновляемого объявления"),
  title: z
    .string()
    .check(z.maxLength(AD_TEXT_LIMITS.title, { error: `Заголовок длиннее ${AD_TEXT_LIMITS.title} символов` }))
    .optional()
    .meta({ description: "Новый заголовок" }),
  title2: z
    .string()
    .check(z.maxLength(AD_TEXT_LIMITS.title2, { error: `Второй заголовок длиннее ${AD_TEXT_LIMITS.title2} символов` }))
    .optional()
    .meta({ description: "Новый второй заголовок" }),
  text: z
    .string()
    .check(z.maxLength(AD_TEXT_LIMITS.text, { error: `Текст длиннее ${AD_TEXT_LIMITS.text} символов` }))
    .optional()
    .meta({ description: "Новый текст объявления" }),
  href: z.string().optional().meta({ description: "Новая ссылка на сайт" })
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
