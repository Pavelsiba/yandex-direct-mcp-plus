import { z } from "zod"
import { API_FIELDS, type FieldOf } from "#shared/config/api-fields"
import { fieldsField } from "#shared/lib/fields"
import { idField, regionIdField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const AD_GROUP_LIST_FIELDS: FieldOf<"adgroups", "AdGroupFieldEnum">[] = [
  "Id",
  "Name",
  "CampaignId",
  "RegionIds",
  "Status",
  "Type"
]

export const listAdGroupsSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании, десятичная строка"))
    .check(z.minLength(1, { error: "Укажите хотя бы одну кампанию" }))
    .meta({ description: "Кампании, группы которых нужно выбрать" }),
  fields: fieldsField(API_FIELDS.adgroups.AdGroupFieldEnum, AD_GROUP_LIST_FIELDS),
  ...pageFields
})

const REGION_IDS_DESCRIPTION =
  'Регионы показа, коды из get_regions: ["225"] — Россия, ["225","-213"] — Россия кроме Москвы, ["0"] — все регионы. ' +
  "Минус-регионы нельзя сочетать с 0 и нельзя отправлять одни, без обычного региона"

const nameField = (description: string) =>
  z
    .string()
    .check(z.minLength(1, { error: "Название не может быть пустым" }))
    .meta({ description })

const regionIdsField = (description: string) =>
  z
    .array(regionIdField("Код региона показа"))
    .check(z.minLength(1, { error: "Укажите хотя бы один регион" }))
    .meta({ description })

export const createAdGroupSchema = z.object({
  campaign_id: idField("ID кампании, в которой создаётся группа"),
  name: nameField("Название группы"),
  region_ids: regionIdsField(REGION_IDS_DESCRIPTION)
})

export const updateAdGroupSchema = z.object({
  ad_group_id: idField("ID группы объявлений, десятичная строка"),
  name: nameField("Новое название группы").optional(),
  region_ids: regionIdsField(
    `${REGION_IDS_DESCRIPTION}. Список заменяет прежний целиком: передайте полный набор регионов, а не только добавляемые`
  ).optional(),
  // Только непустота: разбор на «ключ=значение» отверг бы подстановки Директа ({keyword} и прочие).
  tracking_params: z
    .string()
    .check(z.minLength(1, { error: "Разметка не может быть пустой строкой — чтобы снять её, передайте null" }))
    .nullable()
    .optional()
    .meta({
      description:
        "UTM-разметка, дописывается к ссылкам объявлений группы. Без ведущего «?»: utm_source=yandex&utm_content={ad_id}. " +
        "Допустимы подстановки Директа в фигурных скобках. null снимает разметку"
    })
})

export const deleteAdGroupsSchema = z.object({
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(z.minLength(1, { error: "Список групп пуст" }))
    .meta({ description: "Группы, которые будут удалены безвозвратно" })
})
