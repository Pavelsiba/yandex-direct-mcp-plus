// Сетевой smoke: форма ответа sitelinks.get на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, smokeRead } from "#testing/smoke"

// Весь SitelinksSetFieldEnum запросить нельзя: Sitelinks в FieldNames и SitelinkFieldNames
// взаимоисключающие (пробой 13.09.2026, ошибка 4004). Ключ Sitelinks в ответе всё равно
// есть — его наполняет SitelinkFieldNames, — поэтому в разрешённых он остаётся.
const FIELDS = API_FIELDS.sitelinks.SitelinksSetFieldEnum

describe.skipIf(!CONFIGURED)("smoke sitelinks.get", () => {
  it("принимает SitelinkFieldEnum и отдаёт наборы известной формы", async () => {
    await smokeRead({
      service: "sitelinks",
      method: "get",
      params: {
        FieldNames: ["Id"],
        SitelinkFieldNames: [...API_FIELDS.sitelinks.SitelinkFieldEnum],
        Page: { Limit: 5 }
      },
      collection: "SitelinksSets",
      fields: FIELDS,
      money: false
    })
  })
})
