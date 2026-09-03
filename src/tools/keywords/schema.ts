import { z } from "zod"
import { KEYWORD_ACTIONS } from "#shared/config/enums"
import { idField } from "#shared/lib/id"
import { rublesField } from "#shared/lib/money"
import { pageFields } from "#shared/lib/pagination"

export const listKeywordsSchema = z.object({
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .min(1, { error: "Укажите хотя бы одну группу" })
    .meta({ description: "Группы, ключевые фразы которых нужно выбрать" }),
  ...pageFields
})

export const addKeywordsSchema = z.object({
  ad_group_id: idField("ID группы, в которую добавляются фразы"),
  keywords: z
    .array(z.string().min(1, { error: "Ключевая фраза не может быть пустой" }))
    .min(1, { error: "Список фраз пуст" })
    .meta({ description: "Ключевые фразы; минус-слова внутри фразы записываются через дефис" })
})

export const manageKeywordsSchema = z.object({
  keyword_ids: z
    .array(idField("ID ключевой фразы"))
    .min(1, { error: "Список фраз пуст" })
    .meta({ description: "Фразы, над которыми выполняется действие" }),
  action: z.literal(KEYWORD_ACTIONS).meta({ description: "Действие: suspend, resume или delete (необратимо)" })
})

// Ставка ставится ровно на один уровень целей: фразы, группы или кампании.
// Проверку «ровно один» делает хендлер — она про сочетание полей, а не про поле.
export const setKeywordBidsSchema = z.object({
  keyword_ids: z.array(idField("ID ключевой фразы")).optional().meta({ description: "Ставки на уровне фраз" }),
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .optional()
    .meta({ description: "Ставки на все фразы указанных групп" }),
  campaign_ids: z
    .array(idField("ID кампании"))
    .optional()
    .meta({ description: "Ставки на все фразы указанных кампаний" }),
  bid: rublesField("Ставка на поиске в рублях").optional(),
  context_bid: rublesField("Ставка в сетях (РСЯ) в рублях").optional()
})
