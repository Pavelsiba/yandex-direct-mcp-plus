import { FORECAST_POLL } from "#shared/config/limits"
import { defineTool, READ } from "#shared/lib/tool"
import { handleGetKeywordForecast } from "./handler.js"
import { getKeywordForecastSchema } from "./schema.js"

const MAX_WAIT_SECONDS = (FORECAST_POLL.intervalMs * FORECAST_POLL.maxPolls) / 1000

// READ: временный отчёт прогноза удаляется тем же вызовом, в аккаунте ничего не остаётся.
export const getKeywordForecastTool = defineTool({
  name: "get_keyword_forecast",
  title: "Прогноз по фразам",
  description:
    "Прогноз трафика и цены клика по списку фраз без кампании — для подбора семантики. Отдаёт таблицу TSV, строка на фразу: " +
    "Shows — показы за прошедший месяц; Clicks, CTR — нижний блок без первого места; FirstPlaceClicks, FirstPlaceCTR — первое место; " +
    "PremiumClicks, PremiumCTR — спецразмещение; Min и Max — цена клика за вход в нижний блок и за первое место в нём; " +
    "PremiumMin и PremiumMax — то же в спецразмещении. С auction_bids — колонки «P<блок><место> Bid» (ставка за позицию) и «… Price» " +
    "(списываемая цена): P11–P14 — спецразмещение, P21–P24 — нижний блок. Строка «Итого» — суммы по всем фразам, где Min/Max/PremiumMin " +
    `уже бюджет за месяц, а не цена клика. Деньги — в валюте из currency. Ждёт готовности отчёта до ${MAX_WAIT_SECONDS} секунд.`,
  annotations: READ,
  schema: getKeywordForecastSchema,
  handler: handleGetKeywordForecast
})
