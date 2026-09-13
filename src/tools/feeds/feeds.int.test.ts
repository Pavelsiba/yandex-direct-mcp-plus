// Сетевой smoke: форма ответа feeds.get на боевом API. Только чтение.
import { describe, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, smokeRead } from "#testing/smoke"

// Источник фида лежит в объекте своего типа — FileFeed или UrlFeed; в FeedFieldEnum
// этих ключей нет, они приходят в ответ на отдельные *FieldNames.
const FIELDS = [...API_FIELDS.feeds.FeedFieldEnum, "FileFeed", "UrlFeed"]

describe.skipIf(!CONFIGURED)("smoke feeds.get", () => {
  it("принимает весь FeedFieldEnum и отдаёт фиды известной формы", async () => {
    await smokeRead({
      service: "feeds",
      method: "get",
      params: {
        FieldNames: [...API_FIELDS.feeds.FeedFieldEnum],
        FileFeedFieldNames: [...API_FIELDS.feeds.FileFeedFieldEnum],
        UrlFeedFieldNames: [...API_FIELDS.feeds.UrlFeedFieldEnum],
        Page: { Limit: 5 }
      },
      collection: "Feeds",
      fields: FIELDS,
      money: false
    })
  })
})
