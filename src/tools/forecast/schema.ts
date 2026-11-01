import { z } from "zod"
import { FORECAST_CURRENCIES } from "#shared/config/enums"
import { FORECAST_MAX_PHRASES } from "#shared/config/limits"
import { regionIdField } from "#shared/lib/id"

const textField = (description: string) =>
  z
    .string()
    .check(z.minLength(1, { error: "Фраза не может быть пустой" }))
    .meta({ description })

export const getKeywordForecastSchema = z.object({
  phrases: z
    .array(textField("Ключевая фраза; минус-слова допустимы, многословную минус-фразу — в скобках"))
    .check(
      z.minLength(1, { error: "Укажите хотя бы одну фразу" }),
      z.maxLength(FORECAST_MAX_PHRASES, { error: `Не больше ${FORECAST_MAX_PHRASES} фраз за вызов` })
    )
    .meta({
      description: `Фразы для прогноза, до ${FORECAST_MAX_PHRASES}. Пересекающиеся фразы прогнозируются с учётом друг друга`
    }),
  region_ids: z
    .array(regionIdField("Код региона"))
    .check(z.minLength(1, { error: "Укажите хотя бы один регион или не передавайте поле" }))
    .optional()
    .meta({
      description:
        'Регионы, коды из get_regions: ["65"] — Новосибирск, ["225","-213"] — Россия кроме Москвы. По умолчанию — все регионы'
    }),
  currency: z
    .literal(FORECAST_CURRENCIES)
    .default("RUB")
    .meta({ description: "Валюта цен и бюджетов в ответе; по умолчанию RUB" }),
  auction_bids: z.boolean().default(false).meta({
    description: "Добавить по каждой фразе ставку и списываемую цену для каждой позиции показа (AuctionBids)"
  }),
  negative_keywords: z
    .array(textField("Минус-фраза"))
    .optional()
    .meta({ description: "Минус-фразы, общие для всех фраз прогноза" })
})
