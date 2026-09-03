import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import type { getRegionsSchema, listTimeZonesSchema } from "./schema.js"

type GeoRegion = {
  GeoRegionId: number
  GeoRegionName: string
  GeoRegionType?: string
  ParentId?: number | null
}

type TimeZone = {
  TimeZone: string
  TimeZoneName: string
  UtcOffset?: number
}

// Справочники Директа — тысячи записей и почти неизменны, поэтому держатся
// в памяти процесса: иначе каждый вызов тратил бы баллы API на одно и то же.
const cache = new Map<string, unknown[]>()

async function loadDictionary<Item>(name: string): Promise<Item[]> {
  const cached = cache.get(name)
  if (cached) return cached as Item[]

  const data = (await apiPost("dictionaries", "get", { DictionaryNames: [name] })) as {
    result?: Record<string, Item[]>
  }
  const items = data?.result?.[name] ?? []
  cache.set(name, items)
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
  const regions = await loadDictionary<GeoRegion>("GeoRegions")
  return limitedOutput(
    filterByName(regions, (region) => [region.GeoRegionName], params.search),
    params.limit
  )
}

export async function handleListTimeZones(params: z.infer<typeof listTimeZonesSchema>): Promise<string> {
  const zones = await loadDictionary<TimeZone>("TimeZones")
  // Ищем и по коду (Europe/Moscow), и по названию: модель приходит то с одним, то с другим.
  return limitedOutput(
    filterByName(zones, (zone) => [zone.TimeZone, zone.TimeZoneName], params.search),
    params.limit
  )
}
