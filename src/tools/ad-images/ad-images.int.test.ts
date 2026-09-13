// Сетевой smoke: форма ответа adimages.get на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, smokeRead } from "#testing/smoke"

const FIELDS = API_FIELDS.adimages.AdImageFieldEnum

describe.skipIf(!CONFIGURED)("smoke adimages.get", () => {
  it("принимает весь AdImageFieldEnum и отдаёт изображения известной формы", async () => {
    await smokeRead({
      service: "adimages",
      method: "get",
      params: { FieldNames: [...FIELDS], Page: { Limit: 5 } },
      collection: "AdImages",
      fields: FIELDS,
      money: false,
      // Изображение опознаётся по AdImageHash — поля на «Id» у него нет.
      ids: false
    })
  })
})
