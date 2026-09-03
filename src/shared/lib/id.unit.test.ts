import { describe, expect, it } from "vitest"
import { apiId, apiIds, idField } from "#shared/lib/id"

const campaignId = idField("ID кампании")

describe("idField", () => {
  it("принимает 19-значный ID строкой", () => {
    expect(campaignId.parse("1915016273214320641")).toBe("1915016273214320641")
  })

  // Число до схемы уже испорчено: JSON.parse округлил его в SDK, спасать нечего.
  it("отклоняет ID, пришедший числом, и объясняет почему", () => {
    // biome-ignore lint/correctness/noPrecisionLoss: округление здесь и проверяется
    const result = campaignId.safeParse(1915016273214320641)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("потерял точность")
  })

  it("отклоняет нулевые, отрицательные и нечисловые строки", () => {
    for (const value of ["0", "-5", "12.5", "abc", ""]) {
      expect(campaignId.safeParse(value).success, value).toBe(false)
    }
  })
})

describe("apiId", () => {
  it("переводит строку в BigInt без потери точности", () => {
    expect(apiId("1915016273214320641")).toBe(1915016273214320641n)
  })

  it("переводит список ID разом", () => {
    expect(apiIds(["1", "1915016273214320641"])).toEqual([1n, 1915016273214320641n])
  })
})
