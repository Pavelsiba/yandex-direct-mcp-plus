// Сетевой smoke: форма ответа changes на боевом API. Только чтение.
//
// Общей обвязкой не пользуется: коллекции объектов у changes нет вовсе. checkDictionaries
// отдаёт один Timestamp, и это законный «сколько сейчас на сервере Директа», а не пустая
// выборка. Проверяется то, что здесь проверяемо: запрос принят и ответ той же формы.
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { apiPost } from "#shared/api/client"
import { API_FIELDS } from "#shared/config/api-fields"
import { CONFIGURED, firstCampaignId } from "#testing/smoke"

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

describe.skipIf(!CONFIGURED)("smoke changes", () => {
  it("checkDictionaries отдаёт момент отсчёта в формате ISO", async () => {
    const raw = await apiPost("changes", "checkDictionaries", {})
    const parsed = z
      .strictObject({ Timestamp: z.string().check(z.regex(TIMESTAMP)) })
      .safeParse((raw as { result?: unknown }).result)

    expect(parsed.success, parsed.error && z.prettifyError(parsed.error)).toBe(true)
  })

  it("check принимает весь CheckFieldEnum", async () => {
    const timestamp = ((await apiPost("changes", "checkDictionaries", {})) as { result: { Timestamp: string } }).result
      .Timestamp

    const raw = (await apiPost("changes", "check", {
      Timestamp: timestamp,
      CampaignIds: [BigInt(await firstCampaignId())],
      FieldNames: [...API_FIELDS.changes.CheckFieldEnum]
    })) as { result?: { Timestamp?: string } }

    expect(raw.result?.Timestamp).toMatch(TIMESTAMP)
  })
})
