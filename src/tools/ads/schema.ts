import { z } from "zod"
import { AD_ACTIONS } from "#shared/config/enums"
import { AD_TEXT_LIMITS, MAX_ADS_PER_MODERATION } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listAdsSchema = z.object({
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(z.minLength(1, { error: "Укажите хотя бы одну группу" }))
    .meta({ description: "Группы, объявления которых нужно выбрать" }),
  ...pageFields
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
