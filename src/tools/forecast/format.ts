// Прогноз — таблица TSV, строка на фразу: JSON с ключами на каждой фразе раздувал ответ
// в разы, а модели нужны те же цифры.
import { z } from "zod"

const auctionBidSchema = z.object({ Position: z.string(), Bid: z.number(), Price: z.number() })

export const forecastSchema = z.object({
  data: z.object({
    Phrases: z.array(
      z.object({ Phrase: z.string(), AuctionBids: z.array(auctionBidSchema).optional() }).catchall(z.unknown())
    ),
    Common: z.record(z.string(), z.unknown())
  })
})

type Forecast = z.infer<typeof forecastSchema>["data"]
type Phrase = Forecast["Phrases"][number]

// IsRubric по справке всегда No, Currency повторяется в каждой фразе — в таблицу не идут.
const PHRASE_COLUMNS = [
  "Shows",
  "Clicks",
  "CTR",
  "Min",
  "Max",
  "FirstPlaceClicks",
  "FirstPlaceCTR",
  "PremiumMin",
  "PremiumMax",
  "PremiumClicks",
  "PremiumCTR"
] as const
const TOTAL_COUNTS = ["Shows", "Clicks", "FirstPlaceClicks", "PremiumClicks"] as const
// В Common те же имена, что у цены клика во фразах, означают бюджет за месяц.
const TOTAL_BUDGETS = ["Min", "Max", "PremiumMin"] as const

const cell = (value: unknown): string => (value === undefined || value === null ? "" : String(value))

const auctionPositions = (phrases: Phrase[]): string[] =>
  [...new Set(phrases.flatMap((phrase) => (phrase.AuctionBids ?? []).map((bid) => bid.Position)))].sort()

function phraseRow(phrase: Phrase, positions: string[]): string {
  const bids = new Map((phrase.AuctionBids ?? []).map((bid) => [bid.Position, bid]))
  const auction = positions.flatMap((position) => [cell(bids.get(position)?.Bid), cell(bids.get(position)?.Price)])
  return [phrase.Phrase, ...PHRASE_COLUMNS.map((column) => cell(phrase[column])), ...auction].join("\t")
}

function totalLine(common: Forecast["Common"], currency: string): string {
  const counts = TOTAL_COUNTS.map((key) => `${key} ${cell(common[key])}`).join(", ")
  const budgets = TOTAL_BUDGETS.map((key) => `${key} ${cell(common[key])}`).join(", ")
  return `Итого по всем фразам: ${counts}; бюджет за месяц, ${currency}: ${budgets}`
}

export function formatForecast({ Phrases, Common }: Forecast, currency: string): string {
  const positions = auctionPositions(Phrases)
  const regions = cell(Common.Geo) || "все"
  const header = [
    "Phrase",
    ...PHRASE_COLUMNS,
    ...positions.flatMap((position) => [`${position} Bid`, `${position} Price`])
  ].join("\t")

  return [
    `Прогноз за прошедший месяц. Валюта: ${currency}. Регионы: ${regions}.`,
    "",
    header,
    ...Phrases.map((phrase) => phraseRow(phrase, positions)),
    "",
    totalLine(Common, currency)
  ].join("\n")
}
