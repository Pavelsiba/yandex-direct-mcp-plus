import { z } from "zod"
import { KEYWORD_ACTIONS } from "#shared/config/enums"
import { KEYWORD_TEXT_MAX, KEYWORD_USER_PARAM_MAX, MAX_KEYWORDS_PER_UPDATE } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { rublesField } from "#shared/lib/money"
import { pageFields } from "#shared/lib/pagination"

export const listKeywordsSchema = z.object({
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .check(z.minLength(1, { error: "Укажите хотя бы одну группу" }))
    .meta({ description: "Группы, ключевые фразы которых нужно выбрать" }),
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

// Подстановочная переменная: null снимает значение (поле nillable), пропуск поля
// оставляет прежнее. Пустой строкой это не выражается — она сама себе значение.
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

// Меняет текст фразы и подстановочные переменные. Ставки живут в set_keyword_bids,
// статус — в manage_keywords: у Директа это другие методы, не Keywords.update.
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

export const getKeywordAuctionSchema = z.object({
  keyword_ids: z.array(idField("ID ключевой фразы")).optional().meta({ description: "Аукцион по указанным фразам" }),
  ad_group_ids: z
    .array(idField("ID группы объявлений"))
    .optional()
    .meta({ description: "Аукцион по всем фразам указанных групп" }),
  campaign_ids: z
    .array(idField("ID кампании"))
    .optional()
    .meta({ description: "Аукцион по всем фразам указанных кампаний" }),
  ...pageFields
})
