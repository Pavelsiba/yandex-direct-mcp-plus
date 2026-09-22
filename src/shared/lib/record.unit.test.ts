import { describe, expect, it } from "vitest"
import { isRecord } from "#shared/lib/record"

describe("isRecord", () => {
  it("принимает объект", () => {
    expect(isRecord({})).toBe(true)
    expect(isRecord({ Id: "1" })).toBe(true)
  })

  it("не принимает массив и null", () => {
    expect(isRecord([])).toBe(false)
    expect(isRecord(null)).toBe(false)
  })

  it("не принимает примитивы", () => {
    expect(isRecord(undefined)).toBe(false)
    expect(isRecord(0)).toBe(false)
    expect(isRecord("Items")).toBe(false)
    expect(isRecord(false)).toBe(false)
  })
})
