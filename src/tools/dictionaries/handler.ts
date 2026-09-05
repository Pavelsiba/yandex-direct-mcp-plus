import { z } from "zod"
import { apiPost } from "#shared/api/client"
import { parseApiResult } from "#shared/api/parse"
import { formatResult } from "#shared/lib/format"
import type { getRegionsSchema, listTimeZonesSchema } from "./schema.js"

// Схемы ответа нестрогие (`looseObject`): обязательны только поля, на которые опирается
// инструмент, остальное проходит насквозь и попадает в вывод. Директ добавляет поля без
// предупреждения — строгая схема превратила бы такое добавление в отказ инструмента.
const geoRegionSchema = z.looseObject({
  GeoRegionId: z.number(),
  GeoRegionName: z.string()
})

const timeZoneSchema = z.looseObject({
  TimeZone: z.string(),
  TimeZoneName: z.string()
})

// Имя справочника связано с типом его записей здесь и только здесь: перепутать пару
// или ошибиться в имени теперь нельзя — это ловит компилятор.
const DICTIONARIES = {
  GeoRegions: geoRegionSchema,
  TimeZones: timeZoneSchema
} as const

type DictionaryName = keyof typeof DICTIONARIES
type DictionaryItem<Name extends DictionaryName> = z.infer<(typeof DICTIONARIES)[Name]>

// Справочники Директа — тысячи записей и почти неизменны, поэтому держатся
// в памяти процесса: иначе каждый вызов тратил бы баллы API на одно и то же.
let cache: { [Name in DictionaryName]?: DictionaryItem<Name>[] } = {}

// Кэш переживает импорты, поэтому тесту нужен явный сброс: без него проверка
// «сходил в сеть один раз» зависела бы от того, загрузил ли справочник кто-то раньше.
export function clearDictionaryCache(): void {
  cache = {}
}

async function loadDictionary<Name extends DictionaryName>(name: Name): Promise<DictionaryItem<Name>[]> {
  const cached = cache[name]
  if (cached) return cached

  const data = (await apiPost("dictionaries", "get", { DictionaryNames: [name] })) as {
    result?: Record<string, unknown>
  }
  const items: DictionaryItem<Name>[] = parseApiResult(
    z.array(DICTIONARIES[name]),
    data?.result?.[name] ?? [],
    `справочник ${name}`
  )
  // Запись по generic-ключу компилятор не выводит: для него `cache[name]` — пересечение
  // всех вариантов. Чтение (`cache[name]` выше) типизировано точно, каст только здесь.
  cache[name] = items as (typeof cache)[Name]
  return items
}

function filterByName<Item>(items: Item[], names: (item: Item) => string[], search?: string): Item[] {
  if (!search) return items

  const needle = search.toLowerCase()
  return items.filter((item) =>
    names(item).some((name) =>
      String(name ?? "")
        .toLowerCase()
        .includes(needle)
    )
  )
}

function limitedOutput<Item>(matched: Item[], limit: number): string {
  const limited = matched.slice(0, limit)

  const note =
    matched.length > limited.length
      ? `ℹ️ Показано ${limited.length} из ${matched.length}. Уточните search или увеличьте limit.\n\n`
      : ""

  // Записи справочника короткие, но вывод всё равно идёт через общий форматтер:
  // один формат ответа на все инструменты, никаких исключений.
  return note + formatResult(limited, { money: false })
}

export async function handleGetRegions(params: z.infer<typeof getRegionsSchema>): Promise<string> {
  const regions = await loadDictionary("GeoRegions")
  return limitedOutput(
    filterByName(regions, (region) => [region.GeoRegionName], params.search),
    params.limit
  )
}

export async function handleListTimeZones(params: z.infer<typeof listTimeZonesSchema>): Promise<string> {
  const zones = await loadDictionary("TimeZones")
  // Ищем и по коду (Europe/Moscow), и по названию: модель приходит то с одним, то с другим.
  return limitedOutput(
    filterByName(zones, (zone) => [zone.TimeZone, zone.TimeZoneName], params.search),
    params.limit
  )
}
