import { z } from "zod"
import { idField, regionIdField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listAdGroupsSchema = z.object({
  campaign_ids: z
    .array(idField("ID кампании, десятичная строка"))
    .check(z.minLength(1, { error: "Укажите хотя бы одну кампанию" }))
    .meta({ description: "Кампании, группы которых нужно выбрать" }),
  ...pageFields
})

export const createAdGroupSchema = z.object({
  campaign_id: idField("ID кампании, в которой создаётся группа"),
  name: z
    .string()
    .check(z.minLength(1, { error: "Название не может быть пустым" }))
    .meta({ description: "Название группы" }),
  region_ids: z
    .array(regionIdField("Код региона показа"))
    .check(z.minLength(1, { error: "Укажите хотя бы один регион" }))
    .meta({
      description:
        'Регионы показа, коды из get_regions: ["225"] — Россия, ["225","-213"] — Россия кроме Москвы, ["0"] — все регионы. ' +
        "Минус-регионы нельзя сочетать с 0 и нельзя отправлять одни, без обычного региона"
    })
})

export const deleteAdGroupsSchema = z.object({
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(z.minLength(1, { error: "Список групп пуст" }))
    .meta({ description: "Группы, которые будут удалены безвозвратно" })
})
