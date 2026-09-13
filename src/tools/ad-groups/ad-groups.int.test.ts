// biome-ignore-all lint/plugin: тест разбирает собственный вывод форматтера
// Сетевой тест: форма ID в ответе боевого API. Юнит здесь бесполезен по устройству —
// он сверяет вывод с нашей же фикстурой, а разрядность ID назначает Яндекс: короткий ID
// приезжает числом, 16+ знаков — строкой (json-bigint). Расхождение 12.09.2026 нашлось
// живым вызовом, а не прогоном тестов: наружу уходило то число, то строка, и зависело
// это от величины значения, а не от поля.
//
// Только чтение: полигон не нужен, ничего не создаётся и не меняется.
import { describe, expect, it } from "vitest"
import { apiPost } from "#shared/api/client"
import { handleListAdGroups } from "./handler.js"

const CONFIGURED = Boolean(process.env.YANDEX_DIRECT_TOKEN)

const ID_KEYS = /Ids?$/

type IdEntry = [key: string, value: unknown]

// Обход всего ответа, а не заранее названного списка полей: проверяется то, что Директ
// реально прислал, включая поля, о которых мы не знали. Ключ передаётся вглубь массива —
// у элементов `RegionIds` своего имени нет.
function collectIds(value: unknown, key = ""): IdEntry[] {
  if (Array.isArray(value)) return value.flatMap((item) => collectIds(item, key))

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([nestedKey, nested]) =>
      collectIds(nested, nestedKey)
    )
  }

  // null под ID-ключом — норма: так Директ отдаёт незаполненную ссылку (VCardId и прочие).
  if (value === null || value === undefined) return []
  return ID_KEYS.test(key) ? [[key, value]] : []
}

// Вывод инструмента начинается с уведомлений Директа (LimitedBy и per-item ошибки),
// тело идёт следом.
function parseOutput(output: string): unknown {
  return JSON.parse(output.slice(output.indexOf("{")))
}

async function firstCampaignId(): Promise<string> {
  const data = await apiPost("campaigns", "get", { FieldNames: ["Id"], Page: { Limit: 1 } })
  const campaign = (data as { result?: { Campaigns?: { Id?: unknown }[] } }).result?.Campaigns?.[0]

  expect(campaign, "В аккаунте нет ни одной кампании — форму ID проверять не на чем").toBeDefined()
  return String(campaign?.Id)
}

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
