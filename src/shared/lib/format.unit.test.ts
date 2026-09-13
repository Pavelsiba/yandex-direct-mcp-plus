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

  it("отдаёт ID строкой независимо от его длины", () => {
    const output = JSON.parse(
      formatResult({
        result: {
          AdGroups: [{ Id: 1234567890, CampaignId: 123456789, RegionIds: [225, -213, 0] }],
          Keywords: [{ Id: "1915016273214320641" }]
        }
      })
    )

    expect(output.result.AdGroups[0].Id).toBe("1234567890")
    expect(output.result.AdGroups[0].CampaignId).toBe("123456789")
    expect(output.result.AdGroups[0].RegionIds).toEqual(["225", "-213", "0"])
    expect(output.result.Keywords[0].Id).toBe("1915016273214320641")
  })

  // `Bid` и `AuctionBids` кончаются на `id`/`ids`: без учёта регистра ставки стали бы строками.
  it("не принимает ставки за ID", () => {
    const output = JSON.parse(
      formatResult({ result: { Keywords: [{ Bid: 25_500_000, ContextBid: 10_000_000, AuctionBids: [1, 2] }] } })
    )

    expect(output.result.Keywords[0].Bid).toBe(25.5)
    expect(output.result.Keywords[0].ContextBid).toBe(10)
    expect(output.result.Keywords[0].AuctionBids).toEqual([1, 2])
  })

  it("приводит ID к строке и при money: false", () => {
    const output = JSON.parse(formatResult({ result: { Campaigns: [{ Id: 123456789 }] } }, { money: false }))

    expect(output.result.Campaigns[0].Id).toBe("123456789")
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
