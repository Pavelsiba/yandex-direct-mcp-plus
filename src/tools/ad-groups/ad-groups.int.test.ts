// Сетевой тест: форма ID в ответе боевого API. Юнит здесь бесполезен по устройству —
// он сверяет вывод с нашей же фикстурой, а разрядность ID назначает Яндекс: короткий ID
// приезжает числом, 16+ знаков — строкой (json-bigint). Расхождение 12.09.2026 нашлось
// живым вызовом, а не прогоном тестов: наружу уходило то число, то строка, и зависело
// это от величины значения, а не от поля.
//
// Только чтение: полигон не нужен, ничего не создаётся и не меняется.
import { describe, expect, it } from "vitest"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, collectIds, firstCampaignId, parseOutput, smokeRead } from "#testing/smoke"
import { handleListAdGroups } from "./handler.js"

describe.skipIf(!CONFIGURED)("форма ID в ответе боевого API", () => {
  it("отдаёт каждый ID строкой, какой бы разрядности он ни был", async () => {
    const output = await handleListAdGroups({ campaign_ids: [await firstCampaignId()], limit: 10 })
    const ids = collectIds(parseOutput(output))

    // Без этой проверки пустой ответ прошёл бы молча — тот самый ложно-зелёный тест,
    // от которого уходим: утверждение «все ID строки» на нуле ID всегда верно.
    expect(
      ids.map(([key]) => key),
      "в ответе не оказалось ни одного поля ID"
    ).toEqual(expect.arrayContaining(["Id", "CampaignId", "RegionIds"]))
    expect(ids.filter(([, value]) => typeof value !== "string")).toEqual([])
  })
})

const GROUP_FIELDS = API_FIELDS.adgroups.AdGroupFieldEnum

describe.skipIf(!CONFIGURED)("smoke adgroups.get", () => {
  it("принимает весь AdGroupFieldEnum и отдаёт группы известной формы", async () => {
    await smokeRead({
      service: "adgroups",
      method: "get",
      params: {
        SelectionCriteria: { CampaignIds: [BigInt(await firstCampaignId())] },
        FieldNames: [...GROUP_FIELDS],
        Page: { Limit: 5 }
      },
      collection: "AdGroups",
      fields: GROUP_FIELDS,
      money: false
    })
  })
})
