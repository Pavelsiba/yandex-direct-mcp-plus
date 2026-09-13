// Сетевой smoke: форма ответа dictionaries.getGeoRegions на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, smokeRead } from "#testing/smoke"

const FIELDS = API_FIELDS.dictionaries.GeoRegionFieldEnum

describe.skipIf(!CONFIGURED)("smoke dictionaries.getGeoRegions", () => {
  it("принимает весь GeoRegionFieldEnum и отдаёт регионы известной формы", async () => {
    await smokeRead({
      service: "dictionaries",
      method: "getGeoRegions",
      params: { SelectionCriteria: { Name: "Москва" }, FieldNames: [...FIELDS], Page: { Limit: 5 } },
      collection: "GeoRegions",
      fields: FIELDS,
      money: false
    })
  })
})
