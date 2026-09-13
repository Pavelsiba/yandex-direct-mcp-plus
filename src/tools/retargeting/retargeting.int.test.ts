// Сетевой smoke: форма ответа retargetinglists.get на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, smokeRead } from "#testing/smoke"

const FIELDS = API_FIELDS.retargetinglists.RetargetingListFieldEnum

describe.skipIf(!CONFIGURED)("smoke retargetinglists.get", () => {
  it("принимает весь RetargetingListFieldEnum и отдаёт списки известной формы", async () => {
    await smokeRead({
      service: "retargetinglists",
      method: "get",
      params: { FieldNames: [...FIELDS], Page: { Limit: 5 } },
      collection: "RetargetingLists",
      fields: FIELDS,
      money: false
    })
  })
})
