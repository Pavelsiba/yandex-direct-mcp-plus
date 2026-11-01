// Прогноз цены клика и трафика по фразам без кампании — есть только в Live v4. Отчёт хранится
// на стороне Директа и занимает место в очереди пользователя, поэтому удаляется в любом исходе.
import { z } from "zod"
import { DirectApiError } from "#shared/api/errors"
import { parseApiResult } from "#shared/api/parse"
import { apiV4 } from "#shared/api/v4"
import { FORECAST_POLL } from "#shared/config/limits"
import { forecastSchema, formatForecast } from "./format.js"
import type { getKeywordForecastSchema } from "./schema.js"

type Params = z.infer<typeof getKeywordForecastSchema>
type Wait = (ms: number) => Promise<void>

// «Report queue limit reached»: в очереди уже пять несформированных отчётов этого пользователя.
const QUEUE_FULL_CODE = 31

const createdSchema = z.object({ data: z.number() })
const statusListSchema = z.object({
  data: z.array(z.object({ ForecastID: z.number(), StatusForecast: z.string() }))
})

const sleep: Wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const seconds = (polls: number): number => (FORECAST_POLL.intervalMs * polls) / 1000

function buildForecastInfo(params: Params): Record<string, unknown> {
  const { phrases, region_ids, currency, auction_bids, negative_keywords } = params
  const info: Record<string, unknown> = { Phrases: phrases, Currency: currency }
  if (region_ids) info.GeoID = region_ids.map(Number)
  if (auction_bids) info.AuctionBids = "Yes"
  if (negative_keywords?.length) info.CommonMinusWords = negative_keywords
  return info
}

const isQueueFull = (error: unknown): boolean => error instanceof DirectApiError && error.code === QUEUE_FULL_CODE

async function createForecast(info: Record<string, unknown>, wait: Wait): Promise<number> {
  for (let attempt = 1; ; attempt++) {
    try {
      const created = await apiV4("CreateNewForecast", info)
      return parseApiResult(createdSchema, created, "ID отчёта прогноза").data
    } catch (error) {
      if (!isQueueFull(error)) throw error
      if (attempt > FORECAST_POLL.queueRetries) {
        throw new Error(
          `Очередь прогнозов Директа занята: у пользователя не больше пяти отчётов в работе, место не освободилось за ${seconds(FORECAST_POLL.queueRetries)} с. ` +
            "Отправляйте вызовы прогноза последовательно, а не параллельно, и повторите позже."
        )
      }
      await wait(FORECAST_POLL.intervalMs)
    }
  }
}

async function waitForForecast(id: number, wait: Wait): Promise<void> {
  for (let poll = 0; poll < FORECAST_POLL.maxPolls; poll++) {
    await wait(FORECAST_POLL.intervalMs)
    const { data } = parseApiResult(statusListSchema, await apiV4("GetForecastList"), "список прогнозов")
    const status = data.find((report) => report.ForecastID === id)?.StatusForecast

    if (status === "Done") return
    if (status === "Failed") {
      throw new Error(
        "Директ не смог сформировать прогноз (StatusForecast: Failed). Повторите вызов один раз; если снова Failed — сократите список фраз."
      )
    }
  }
  throw new Error(`Прогноз не сформировался за ${seconds(FORECAST_POLL.maxPolls)} с. Повторите вызов позже.`)
}

// Сбой удаления не должен заслонить прогноз или исходную ошибку: через пять часов Директ
// удалит отчёт сам.
async function deleteForecast(id: number): Promise<void> {
  try {
    await apiV4("DeleteForecastReport", id)
  } catch (error) {
    console.error(`[yd-mcp] Отчёт прогноза ${id} не удалён: ${error instanceof Error ? error.message : error}`)
  }
}

export async function handleGetKeywordForecast(params: Params, wait: Wait = sleep): Promise<string> {
  const id = await createForecast(buildForecastInfo(params), wait)

  try {
    await waitForForecast(id, wait)
    const forecast = parseApiResult(forecastSchema, await apiV4("GetForecast", id), "прогноз")
    return formatForecast(forecast.data, params.currency)
  } finally {
    await deleteForecast(id)
  }
}
