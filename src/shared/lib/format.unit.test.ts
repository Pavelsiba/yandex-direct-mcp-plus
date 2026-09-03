// biome-ignore-all lint/plugin: тест разбирает собственный вывод форматтера
import { describe, expect, it } from "vitest"
import { formatResult } from "#shared/lib/format"

describe("formatResult", () => {
  it("переводит денежные поля из микроединиц в рубли", () => {
    const output = JSON.parse(
      formatResult({ result: { Campaigns: [{ DailyBudget: { Amount: 1_000_000_000 }, Bid: 25_500_000 }] } })
    )

    expect(output.result.Campaigns[0].DailyBudget.Amount).toBe(1000)
    expect(output.result.Campaigns[0].Bid).toBe(25.5)
  })

  it("не трогает счётчики и ID, похожие на деньги", () => {
    const output = JSON.parse(formatResult({ result: { Campaigns: [{ Id: "1915016273214320641", Clicks: 1200 }] } }))

    expect(output.result.Campaigns[0].Id).toBe("1915016273214320641")
    expect(output.result.Campaigns[0].Clicks).toBe(1200)
  })

  it("оставляет суммы как есть при money: false", () => {
    const output = JSON.parse(formatResult({ result: { Amount: 5_000_000 } }, { money: false }))

    expect(output.result.Amount).toBe(5_000_000)
  })

  it("подсказывает offset следующей страницы при обрезанной выборке", () => {
    const output = formatResult({ result: { LimitedBy: 500 } })

    expect(output).toContain("LimitedBy=500")
    expect(output).toContain("offset=500")
  })

  // Частичный успех Директ прячет в теле: без этой шапки модель прочитала бы «успех».
  it("поднимает per-item ошибки и предупреждения наверх ответа", () => {
    const output = formatResult({
      result: {
        AddResults: [
          { Id: 1 },
          { Errors: [{ Code: 5001, Message: "Недопустимое значение", Details: "Поле Name" }] },
          { Warnings: [{ Code: 10, Message: "Объявление уйдёт на модерацию" }] }
        ]
      }
    })

    expect(output).toContain("❌ AddResults[1] [5001] Недопустимое значение — Поле Name")
    expect(output).toContain("⚠️ AddResults[2] [10] Объявление уйдёт на модерацию")
  })
})
