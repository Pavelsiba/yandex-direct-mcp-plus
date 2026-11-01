// biome-ignore-all lint/plugin/no-native-json: тест разбирает собственный вывод форматтера
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { FUNDS_MONEY_KEYS, formatResult, hasItemErrors, MONEY_KEYS } from "#shared/lib/format"

// Поля xsd:long, которые не деньги: ID и счётчики. ID опознаются по окончанию, остальное — поимённо.
const NOT_MONEY = new Set([
  "Clicks",
  "ClicksPerWeek",
  "Impressions",
  "InterestKey",
  "Items",
  "Limit",
  "LimitedBy",
  "NumberOfItems",
  "NumberOfListings",
  "Offset",
  "Position",
  "Weight",
  // Стратегия ROI: коэффициент и процент, не суммы в валюте.
  "Profitability",
  "RoiCoef"
])

function longFieldsFromSnapshot(markdown: string): string[] {
  const sections = [...markdown.matchAll(/^### Поля xsd:long\n\n(.+)$/gm)]
  return [...new Set(sections.flatMap((section) => [...section[1].matchAll(/`([^`]+)`/g)].map((m) => m[1])))]
}

describe("денежные ключи", () => {
  const longFields = longFieldsFromSnapshot(readFileSync("docs/api-v5.md", "utf8"))

  it("снимок WSDL содержит поля xsd:long — иначе проверке не на чем стоять", () => {
    expect(longFields.length).toBeGreaterThan(50)
  })

  it("каждое поле xsd:long из WSDL отнесено к деньгам или не-деньгам", () => {
    const unclassified = longFields.filter(
      (name) => !/Ids?$/.test(name) && !MONEY_KEYS.has(name) && !FUNDS_MONEY_KEYS.has(name) && !NOT_MONEY.has(name)
    )
    expect(unclassified).toEqual([])
  })

  it("переводит в рубли бюджет на обучение стратегии", () => {
    const output = JSON.parse(
      formatResult({ result: { ExplorationBudget: { MinimumExplorationBudget: 500_000_000 }, AverageCpa: 1_500_000 } })
    )

    expect(output.result.ExplorationBudget.MinimumExplorationBudget).toBe(500)
    expect(output.result.AverageCpa).toBe(1.5)
  })
})

describe("formatResult", () => {
  it("переводит денежные поля из микроединиц в рубли", () => {
    const output = JSON.parse(
      formatResult({ result: { Campaigns: [{ DailyBudget: { Amount: 1_000_000_000 }, Bid: 25_500_000 }] } })
    )

    expect(output.result.Campaigns[0].DailyBudget.Amount).toBe(1000)
    expect(output.result.Campaigns[0].Bid).toBe(25.5)
  })

  it("переводит в рубли средства кампании без общего счёта", () => {
    const output = JSON.parse(
      formatResult({
        result: {
          Campaigns: [
            {
              Funds: {
                Mode: "CAMPAIGN_FUNDS",
                CampaignFunds: {
                  Sum: 5_000_000_000,
                  Balance: 1_234_560_000,
                  BalanceBonus: 0,
                  SumAvailableForTransfer: 500_000_000
                }
              }
            }
          ]
        }
      })
    )

    expect(output.result.Campaigns[0].Funds).toEqual({
      Mode: "CAMPAIGN_FUNDS",
      CampaignFunds: { Sum: 5000, Balance: 1234.56, BalanceBonus: 0, SumAvailableForTransfer: 500 }
    })
  })

  it("переводит в рубли расход кампании на общем счёте", () => {
    const output = JSON.parse(
      formatResult({
        result: {
          Campaigns: [
            { Funds: { Mode: "SHARED_ACCOUNT_FUNDS", SharedAccountFunds: { Refund: 0, Spend: 7_500_000_000 } } }
          ]
        }
      })
    )

    expect(output.result.Campaigns[0].Funds.SharedAccountFunds).toEqual({ Refund: 0, Spend: 7500 })
  })

  it("не трогает Sum и Balance вне Funds", () => {
    const output = JSON.parse(formatResult({ result: { Sum: 3, Balance: 7 } }))

    expect(output.result).toEqual({ Sum: 3, Balance: 7 })
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

  // Проба 13.09.2026: CounterIds приезжает обёрткой { Items: [...] }, и без переноса
  // имени родителя через обёртку ID уходил наружу числом.
  it("отдаёт строкой ID, завёрнутые в Items", () => {
    const output = JSON.parse(
      formatResult({
        result: {
          Campaigns: [
            {
              TextCampaign: {
                CounterIds: { Items: [112345678] },
                NegativeKeywordSharedSetIds: { Items: [1234567, 7654321] }
              }
            }
          ]
        }
      })
    )

    expect(output.result.Campaigns[0].TextCampaign.CounterIds.Items).toEqual(["112345678"])
    expect(output.result.Campaigns[0].TextCampaign.NegativeKeywordSharedSetIds.Items).toEqual(["1234567", "7654321"])
  })

  // Тот же ответ Директа несёт два разных Value: ценность цели в микроединицах и
  // строковый флаг настройки. Обёртка Items не должна путать одно с другим.
  it("различает денежный Value целей и строковый Value настроек", () => {
    const output = JSON.parse(
      formatResult({
        result: {
          Campaigns: [
            {
              TextCampaign: {
                Settings: [{ Option: "ADD_METRICA_TAG", Value: "NO" }],
                PriorityGoals: {
                  Items: [{ GoalId: 601234567, Value: 50_000_000, IsMetrikaSourceOfValue: "NO" }]
                }
              }
            }
          ]
        }
      })
    )

    const { Settings, PriorityGoals } = output.result.Campaigns[0].TextCampaign
    expect(Settings[0].Value).toBe("NO")
    expect(PriorityGoals.Items[0].Value).toBe(50)
    expect(PriorityGoals.Items[0].GoalId).toBe("601234567")
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

  it("дописывает к отказу по объекту, что делать", () => {
    const output = formatResult({
      result: {
        AddResults: [
          { Errors: [{ Code: 3500, Message: "Не поддерживается", Details: "Создание визиток не поддерживается" }] }
        ]
      }
    })

    expect(output).toMatch(/❌ AddResults\[0\] \[3500\].*\n\s+Что делать: .*бесполезно/)
  })

  it("выносит отказ Live v4 из data.ActionsResult строкой ❌ с подсказкой", () => {
    const output = formatResult(
      {
        data: {
          ActionsResult: [
            {
              Login: "ivan-petrov@yandex.ru",
              AccountID: null,
              Errors: [{ FaultCode: 259, FaultString: "This client does not exist", FaultDetail: "" }]
            }
          ],
          Accounts: []
        }
      },
      { money: false }
    )

    expect(output).toMatch(
      /^❌ ActionsResult\[0\] \[259\] This client does not exist\n\s+Что делать: .*не адрес почты.*YANDEX_DIRECT_LOGIN/
    )
    expect(hasItemErrors(output)).toBe(true)
  })

  it("не добавляет шапку к ответу v4 без отказов", () => {
    const output = formatResult({ data: { ActionsResult: [], Accounts: [{ AccountID: 1, Amount: "10.00" }] } })

    expect(output.startsWith("{")).toBe(true)
  })
})

describe("hasItemErrors", () => {
  it("находит отказ по объекту и в склейке нескольких ответов", () => {
    const failed = formatResult({ result: { UpdateResults: [{ Errors: [{ Code: 8800, Message: "Не найден" }] }] } })
    const succeeded = formatResult({ result: { SuspendResults: [{ Id: 1 }] } })

    expect(hasItemErrors(`${succeeded}\n\n${failed}`)).toBe(true)
  })

  it("не считает ошибкой успех и предупреждение", () => {
    const output = formatResult({
      result: { AddResults: [{ Id: 1 }, { Id: 2, Warnings: [{ Code: 10000, Message: "Повтор" }] }] }
    })

    expect(hasItemErrors(output)).toBe(false)
  })
})
