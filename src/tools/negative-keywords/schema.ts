// В домене две разные сущности, отсюда и два набора инструментов. Собственные минус-фразы
// кампании или группы — список, живущий внутри неё. Общий набор — именованный список
// уровня аккаунта: он заводится один раз и переиспользуется, поэтому у него свой сервис,
// своя форма поля (голый массив, не { Items: [...] }) и отдельная привязка к объекту.
//
// Минус-фразы Директа перезаписываются целиком: и NegativeKeywords.Items, и привязки
// наборов. Инструменты этого домена названы set_*/link_* именно поэтому — они задают
// новое значение, а не дополняют старое. Режимы add и remove у set_*_negative_keywords
// прячут чтение и слияние внутрь сервера, чтобы «добавить одну фразу» не оборачивалось
// стёртым списком; link_* и наборы по-прежнему только заменяют.
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

const negativeKeyword = z
  .string()
  .check(
    z.minLength(1, { error: "Минус-фраза не может быть пустой" }),
    z.regex(/\S/, { error: "Минус-фраза не может состоять из одних пробелов" })
  )

// Режим общий для кампании и группы: снаружи это один и тот же вопрос «заменить,
// дописать или убрать». Значения по умолчанию нет намеренно: replace затирает список
// целиком, и пропуск поля на просьбе «добавь одну фразу» стёр бы всё остальное молча —
// Директ ответил бы успехом. Обязательное поле превращает пропуск в ошибку валидации
// до записи, то есть требует назвать намерение вслух.
const negativeKeywordsMode = () =>
  z.literal(["replace", "add", "remove"]).meta({
    description:
      "Обязателен. replace — заменить список целиком (пустой массив очищает, прежние фразы теряются), add — дописать к текущим, remove — убрать перечисленные. add и remove сначала читают текущий список, это дополнительный вызов API. Фразы сравниваются так же, как их сравнивает Директ: без учёта регистра, буквы ё и е равны, краевые и повторные пробелы не учитываются, операторы закрепления ! и + игнорируются"
  })

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
      "Минус-фразы кампании: при mode=replace — полный новый список взамен прежнего, при add — что дописать, при remove — что убрать"
  }),
  mode: negativeKeywordsMode()
})

export const setAdGroupNegativeKeywordsSchema = z.object({
  ad_group_id: idField("ID группы объявлений"),
  negative_keywords: z.array(negativeKeyword).meta({
    description:
      "Минус-фразы группы: при mode=replace — полный новый список взамен прежнего, при add — что дописать, при remove — что убрать"
  }),
  mode: negativeKeywordsMode()
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

// Набор привязывается и к группе, и к кампании — это одно и то же действие над разными
// объектами, поэтому инструмент один. Оба списка необязательны по отдельности, но пустым
// вызов быть не может: проверку несёт сам объект, иначе «ничего не сделал» вернулось бы
// успехом.
export const linkNegativeKeywordSetsSchema = z
  .object({
    ad_group_ids: z
      .array(idField("ID группы объявлений"))
      .check(
        z.maxLength(MAX_AD_GROUPS_PER_CALL, {
          error: `За один вызов допустимо не больше ${MAX_AD_GROUPS_PER_CALL} групп`
        })
      )
      .optional()
      .meta({ description: "Группы, которым назначаются наборы" }),
    campaign_ids: z
      .array(idField("ID кампании"))
      .check(
        z.maxLength(MAX_CAMPAIGNS_PER_CALL, {
          error: `За один вызов допустимо не больше ${MAX_CAMPAIGNS_PER_CALL} кампаний`
        })
      )
      .optional()
      .meta({
        description:
          "Кампании, которым назначаются наборы. Привязка на уровне кампании действует на все её группы. Тип кампании сервер читает сам — это дополнительный вызов API; общие наборы поддерживают TEXT_CAMPAIGN, DYNAMIC_TEXT_CAMPAIGN, MOBILE_APP_CAMPAIGN и UNIFIED_CAMPAIGN"
      }),
    set_ids: z
      .array(idField("ID общего набора минус-фраз"))
      .check(
        z.maxLength(MAX_SHARED_SETS_PER_AD_GROUP, {
          error: `К объекту привязывается не больше ${MAX_SHARED_SETS_PER_AD_GROUP} наборов`
        })
      )
      .meta({
        description: "Полный новый список наборов объекта — прежние привязки затираются. Пустой массив снимает все"
      })
  })
  .check((ctx) => {
    if (ctx.value.ad_group_ids?.length || ctx.value.campaign_ids?.length) return

    ctx.issues.push({
      code: "custom",
      input: ctx.value,
      message: "Укажите ad_group_ids и/или campaign_ids — кому назначаются наборы"
    })
  })
