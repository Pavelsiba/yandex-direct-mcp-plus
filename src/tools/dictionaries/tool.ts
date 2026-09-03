import { defineTool, READ } from "#shared/lib/tool"
import { handleGetRegions } from "./handler.js"
import { getRegionsSchema } from "./schema.js"

export const getRegionsTool = defineTool({
  name: "get_regions",
  title: "Справочник регионов",
  description: "Справочник кодов регионов (GeoRegions) для таргетинга. Фильтр по названию. 225 = Россия.",
  annotations: READ,
  schema: getRegionsSchema,
  handler: handleGetRegions
})
