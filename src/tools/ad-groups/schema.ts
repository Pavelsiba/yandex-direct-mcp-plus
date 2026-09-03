import { z } from "zod"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listAdGroupsSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании, десятичная строка"))
    .min(1, { error: "Укажите хотя бы одну кампанию" })
    .meta({ description: "Кампании, группы которых нужно выбрать" }),
  ...pageFields
})

export const createAdGroupSchema = z.object({
  campaign_id: idField("ID кампании, в которой создаётся группа"),
  name: z.string().min(1, { error: "Название не может быть пустым" }).meta({ description: "Название группы" }),
  region_ids: z
    .array(idField("ID региона показа"))
    .min(1, { error: "Укажите хотя бы один регион" })
    .meta({ description: 'Регионы показа, например ["225"] — Россия. Коды берутся из get_regions' })
})

export const deleteAdGroupsSchema = z.object({
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .min(1, { error: "Список групп пуст" })
    .meta({ description: "Группы, которые будут удалены безвозвратно" })
})
