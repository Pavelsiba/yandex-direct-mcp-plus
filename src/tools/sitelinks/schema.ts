import { z } from "zod"
import { MAX_IDS_PER_CALL, SITELINK_LIMITS } from "#shared/config/limits"
import { idField } from "#shared/lib/id"
import { pageFields } from "#shared/lib/pagination"

export const listSitelinksSchema = z.object({
  sitelink_set_ids: z
    .array(idField("ID набора быстрых ссылок"))
    .check(z.maxLength(MAX_IDS_PER_CALL, { error: `За один вызов допустимо не больше ${MAX_IDS_PER_CALL} наборов` }))
    .optional()
    .meta({ description: "Конкретные наборы; без них возвращаются все наборы аккаунта" }),
  ...pageFields
})

const sitelink = z.object({
  title: z
    .string()
    .check(
      z.minLength(1, { error: "Текст ссылки не может быть пустым" }),
      z.maxLength(SITELINK_LIMITS.title, { error: `Текст ссылки длиннее ${SITELINK_LIMITS.title} символов` })
    )
    .meta({ description: `Текст быстрой ссылки, до ${SITELINK_LIMITS.title} символов` }),
  href: z
    .string()
    .check(z.maxLength(SITELINK_LIMITS.href, { error: `Ссылка длиннее ${SITELINK_LIMITS.href} символов` }))
    .optional()
    .meta({ description: "URL с протоколом и доменом" }),
  description: z
    .string()
    .check(
      z.maxLength(SITELINK_LIMITS.description, { error: `Описание длиннее ${SITELINK_LIMITS.description} символов` })
    )
    .optional()
    .meta({ description: `Описание ссылки, до ${SITELINK_LIMITS.description} символов` })
})

// Набор создаётся целиком: Директ не умеет дописать ссылку в существующий набор.
export const setSitelinksSchema = z.object({
  sitelinks: z
    .array(sitelink)
    .check(
      z.minLength(1, { error: "Набор не может быть пустым" }),
      z.maxLength(SITELINK_LIMITS.perSet, { error: `В наборе не больше ${SITELINK_LIMITS.perSet} ссылок` })
    )
    .meta({ description: `Новый набор из 1–${SITELINK_LIMITS.perSet} быстрых ссылок` })
})
