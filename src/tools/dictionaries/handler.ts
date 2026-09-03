import type { z } from "zod"
import { apiPost } from "#shared/api/client"
import { formatResult } from "#shared/lib/format"
import type { getRegionsSchema } from "./schema.js"

type GeoRegion = {
  GeoRegionId: number
  GeoRegionName: string
  GeoRegionType?: string
  ParentId?: number | null
}

// Справочник GeoRegions — тысячи записей и почти неизменен, поэтому держится
// в памяти процесса: иначе каждый вызов тратил бы баллы API на одно и то же.
let regionsCache: GeoRegion[] | null = null

async function loadRegions(): Promise<GeoRegion[]> {
  if (regionsCache) return regionsCache

  const data = (await apiPost("dictionaries", "get", { DictionaryNames: ["GeoRegions"] })) as {
    result?: { GeoRegions?: GeoRegion[] }
  }
  regionsCache = data?.result?.GeoRegions ?? []
  return regionsCache
}

function filterRegions(regions: GeoRegion[], search?: string): GeoRegion[] {
  if (!search) return regions

  const needle = search.toLowerCase()
  return regions.filter((region) =>
    String(region.GeoRegionName ?? "")
      .toLowerCase()
      .includes(needle)
  )
}

export async function handleGetRegions(params: z.infer<typeof getRegionsSchema>): Promise<string> {
  const matched = filterRegions(await loadRegions(), params.search)
  const limited = matched.slice(0, params.limit)

  const note =
    matched.length > limited.length
      ? `ℹ️ Показано ${limited.length} из ${matched.length}. Уточните search или увеличьте limit.\n\n`
      : ""

  // Коды регионов короткие, но вывод всё равно идёт через общий форматтер:
  // один формат ответа на все инструменты, никаких исключений.
  return note + formatResult(limited, { money: false })
}
