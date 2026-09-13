// Сетевой smoke: форма ответа audiencetargets.get на боевом API. Только чтение.
//
// Условие для этой проверки заведено пробой 13.09.2026 на группе кампании-полигона:
// в аккаунте их не было, а на пустой коллекции strict-схема не запускается ни разу.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, firstRetargetingListId, smokeRead } from "#testing/smoke"

const FIELDS = API_FIELDS.audiencetargets.AudienceTargetFieldEnum

describe.skipIf(!CONFIGURED)("smoke audiencetargets.get", () => {
  it("принимает весь AudienceTargetFieldEnum и отдаёт условия известной формы", async () => {
    await smokeRead({
      service: "audiencetargets",
      method: "get",
      params: {
        SelectionCriteria: { RetargetingListIds: [BigInt(await firstRetargetingListId())] },
        FieldNames: [...FIELDS],
        Page: { Limit: 5 }
      },
      collection: "AudienceTargets",
      fields: FIELDS
    })
  })
})
