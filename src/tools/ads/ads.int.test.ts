// Сетевой smoke: форма ответа ads.get на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, firstCampaignId, smokeRead } from "#testing/smoke"

// Настройки объявления лежат в отдельном объекте, имя которого зависит от типа: TextAd,
// MobileAppAd и соседи. В AdFieldEnum этих ключей нет — перечисление описывает общие поля,
// а не вложенный объект, поэтому имена типов добавляются к разрешённым.
const AD_TYPE_KEYS = ["TextAd", "TextImageAd", "MobileAppAd", "DynamicTextAd", "SmartAdBuilderAd"]

const FIELDS = [...API_FIELDS.ads.AdFieldEnum, ...AD_TYPE_KEYS]

describe.skipIf(!CONFIGURED)("smoke ads.get", () => {
  it("принимает весь AdFieldEnum и отдаёт объявления известной формы", async () => {
    await smokeRead({
      service: "ads",
      method: "get",
      params: {
        SelectionCriteria: { CampaignIds: [BigInt(await firstCampaignId())] },
        FieldNames: [...API_FIELDS.ads.AdFieldEnum],
        TextAdFieldNames: ["Title", "Text", "Href"],
        Page: { Limit: 5 }
      },
      collection: "Ads",
      fields: FIELDS
    })
  })
})
