import { describe, expect, it } from "vitest"
import { z } from "zod"
import { parseApiResult } from "#shared/api/parse"

const campaignSchema = z.looseObject({ Id: z.string() })

describe("parseApiResult", () => {
  it("отдаёт разобранное значение", () => {
    expect(parseApiResult(campaignSchema, { Id: "1915016273214320641" }, "кампанию")).toEqual({
      Id: "1915016273214320641"
    })
  })

  it("называет сущность и место расхождения, когда форма не совпала", () => {
    expect(() => parseApiResult(campaignSchema, { Id: 42 }, "кампанию")).toThrow(
      /кампанию в неожиданной форме[\s\S]*Id/
    )
  })
})
