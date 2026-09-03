import { describe, expect, it } from "vitest"
import { microsToRubles, rublesField, rublesToMicros } from "#shared/lib/money"

describe("конвертация денег", () => {
  it("переводит рубли в микроединицы и обратно", () => {
    expect(rublesToMicros(1000)).toBe(1_000_000_000)
    expect(microsToRubles(25_500_000)).toBe(25.5)
  })

  it("округляет копейки до целых микроединиц", () => {
    expect(rublesToMicros(0.0000001)).toBe(0)
    expect(rublesToMicros(12.3456789)).toBe(12_345_679)
  })
})

describe("rublesField", () => {
  it("конвертирует рубли в микроединицы прямо в схеме", () => {
    expect(rublesField("Бюджет").parse(1000)).toBe(1_000_000_000)
  })

  it("не пропускает ноль и отрицательные суммы", () => {
    const bid = rublesField("Ставка")

    expect(bid.safeParse(0).success).toBe(false)
    expect(bid.safeParse(-1).success).toBe(false)
  })

  it("пропускает ноль там, где он означает «ставка снята»", () => {
    expect(rublesField("Ставка", { allowZero: true }).parse(0)).toBe(0)
  })
})
