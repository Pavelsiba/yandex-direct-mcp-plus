// Минус-фразы Директа перезаписываются целиком: и NegativeKeywords.Items, и привязки
// наборов. Инструменты этого домена названы set_*/link_* именно поэтому — они задают
// новое значение, а не дополняют старое. Чтобы добавить фразу, её читают и шлют слитой.
import { z } from "zod"
import { NEGATIVE_KEYWORD_SET_ACTIONS } from "#shared/config/enums"
import {
  MAX_AD_GROUPS_PER_CALL,
  MAX_CAMPAIGNS_PER_CALL,
  MAX_SHARED_SETS_PER_AD_GROUP,
  MAX_SHARED_SETS_PER_CALL,
  SHARED_SET_NAME_MAX
} from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

const negativeKeyword = z.string().check(z.minLength(1, { error: "Минус-фраза не может быть пустой" }))

export const getCampaignNegativeKeywordsSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании"))
    .check(
      z.minLength(1, { error: "Список кампаний пуст" }),
      z.maxLength(MAX_CAMPAIGNS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_CAMPAIGNS_PER_CALL} кампаний`
      })
    )
    .meta({ description: "Кампании, минус-фразы которых нужно прочитать" })
})

export const setCampaignNegativeKeywordsSchema = z.object({
  campaign_id: idField("ID кампании"),
  negative_keywords: z.array(negativeKeyword).meta({
    description:
      "Полный новый список минус-фраз кампании — прежний затирается целиком. Пустой массив очищает минус-фразы"
  })
})

export const setAdGroupNegativeKeywordsSchema = z.object({
  ad_group_id: idField("ID группы объявлений"),
  negative_keywords: z.array(negativeKeyword).meta({
    description: "Полный новый список минус-фраз группы — прежний затирается целиком. Пустой массив очищает"
  })
})

export const listNegativeKeywordSharedSetsSchema = z.object({
  set_ids: z
    .array(idField("ID общего набора минус-фраз"))
    .check(
      z.maxLength(MAX_SHARED_SETS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_SHARED_SETS_PER_CALL} наборов`
      })
    )
    .optional()
    .meta({ description: "Конкретные наборы; без них возвращаются все наборы аккаунта" }),
  ...pageFields
})

const sharedSetName = z
  .string()
  .check(
    z.minLength(1, { error: "Название не может быть пустым" }),
    z.maxLength(SHARED_SET_NAME_MAX, { error: `Название длиннее ${SHARED_SET_NAME_MAX} символов` })
  )

const addSharedSet = z.object({
  name: sharedSetName.meta({ description: "Название набора" }),
  negative_keywords: z
    .array(negativeKeyword)
    .check(z.minLength(1, { error: "Набор не может быть пустым" }))
    .meta({ description: "Минус-фразы набора" })
})

const updateSharedSet = z.object({
  set_id: idField("ID изменяемого набора"),
  name: sharedSetName.optional().meta({ description: "Новое название набора" }),
  negative_keywords: z
    .array(negativeKeyword)
    .optional()
    .meta({ description: "Полный новый список минус-фраз набора — прежний затирается целиком" })
})

// Функция, а не готовая проверка: один и тот же объект проверки не переиспользуется
// тремя схемами — каждая получает свой.
const sharedSetsPerCall = () =>
  z.maxLength(MAX_SHARED_SETS_PER_CALL, { error: `Не больше ${MAX_SHARED_SETS_PER_CALL} наборов за вызов` })

export const manageNegativeKeywordSharedSetsSchema = z.object({
  action: z.literal(NEGATIVE_KEYWORD_SET_ACTIONS).meta({
    description: "Что сделать с наборами: add, update или delete (необратимо)"
  }),
  add_sets: z
    .array(addSharedSet)
    .check(z.minLength(1, { error: "Список наборов пуст" }), sharedSetsPerCall())
    .optional()
    .meta({ description: "Наборы для создания; обязателен при action=add" }),
  update_sets: z
    .array(updateSharedSet)
    .check(z.minLength(1, { error: "Список наборов пуст" }), sharedSetsPerCall())
    .optional()
    .meta({ description: "Наборы для изменения; обязателен при action=update" }),
  set_ids: z
    .array(idField("ID общего набора минус-фраз"))
    .check(z.minLength(1, { error: "Список наборов пуст" }), sharedSetsPerCall())
    .optional()
    .meta({ description: "Наборы для удаления; обязателен при action=delete" })
})

export const linkNegativeKeywordSetsSchema = z.object({
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(
      z.minLength(1, { error: "Список групп пуст" }),
      z.maxLength(MAX_AD_GROUPS_PER_CALL, {
        error: `За один вызов допустимо не больше ${MAX_AD_GROUPS_PER_CALL} групп`
      })
    )
    .meta({ description: "Группы, которым назначаются наборы" }),
  set_ids: z
    .array(idField("ID общего набора минус-фраз"))
    .check(
      z.maxLength(MAX_SHARED_SETS_PER_AD_GROUP, {
        error: `К группе привязывается не больше ${MAX_SHARED_SETS_PER_AD_GROUP} наборов`
      })
    )
    .meta({
      description: "Полный новый список наборов группы — прежние привязки затираются. Пустой массив снимает все"
    })
})
