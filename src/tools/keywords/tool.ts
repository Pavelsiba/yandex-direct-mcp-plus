import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import {
  handleAddKeywords,
  handleGetKeywordAuction,
  handleListKeywords,
  handleManageKeywords,
  handleSetAutoKeywordBids,
  handleSetKeywordBids,
  handleUpdateKeywords
} from "./handler.js"
import {
  addKeywordsSchema,
  getKeywordAuctionSchema,
  listKeywordsSchema,
  manageKeywordsSchema,
  setAutoKeywordBidsSchema,
  setKeywordBidsSchema,
  updateKeywordsSchema
} from "./schema.js"

export const listKeywordsTool = defineTool({
  name: "list_keywords",
  title: "Список ключевых слов",
  description:
    "Ключевые фразы в группах объявлений: фразы, ставки (руб), статусы. По умолчанию возвращается узкий набор полей; нужны другие (StatisticsSearch, StatisticsNetwork, Productivity, ServingStatus и прочие из KeywordFieldEnum) — перечислите их в fields. Автотаргетинг — спецфраза ---autotargeting в той же группе; его категории запросов — с autotargeting: true.",
  annotations: READ,
  schema: listKeywordsSchema,
  handler: handleListKeywords
})

export const addKeywordsTool = defineTool({
  name: "add_keywords",
  title: "Добавить ключевые слова",
  description: "Добавить ключевые фразы в группу объявлений.",
  annotations: WRITE,
  schema: addKeywordsSchema,
  handler: handleAddKeywords
})

export const updateKeywordsTool = defineTool({
  name: "update_keywords",
  title: "Изменить ключевые слова",
  description:
    "Изменить текст ключевых фраз, подстановочные переменные {param1}/{param2} и настройки автотаргетинга. Правка текста может привести к появлению фразы с новым ID или к её удалению как дубликата — сверьтесь с list_keywords после вызова. " +
    "Автотаргетинг — фраза ---autotargeting: её ID берётся из list_keywords, категории запросов и брендов задаются autotargeting_categories / autotargeting_brand_options. Выключить автотаргетинг целиком — manage_keywords с suspend (delete Директ отбивает). " +
    "Ставки меняет set_keyword_bids, статус — manage_keywords.",
  annotations: WRITE,
  schema: updateKeywordsSchema,
  handler: handleUpdateKeywords
})

export const manageKeywordsTool = defineTool({
  name: "manage_keywords",
  title: "Управление ключевыми словами",
  description: "Действие над ключевыми фразами: suspend/resume/delete. ⚠️ delete необратимо.",
  annotations: DESTRUCTIVE,
  schema: manageKeywordsSchema,
  handler: handleManageKeywords
})

export const getKeywordAuctionTool = defineTool({
  name: "get_keyword_auction",
  title: "Аукцион по фразам",
  description:
    "Сколько стоит трафик по фразам: текущие ставки и торги на поиске и в сетях. Всё в рублях. На поиске " +
    "Search.AuctionBids — для каждого объёма трафика фразы TrafficVolume Bid — сколько поставить и Price — " +
    "сколько спишется за клик. Объём трафика — индекс кликабельности места показа: 100 — первое место " +
    "премиум-показов, следующие места — 85, 75, 65; выше 100 — места кликабельнее первого, например показ в " +
    "расширенном формате. В сетях Network.Coverage — ставка под долю " +
    "аудитории (Probability, %). Отбор по одному уровню: фразы, группы или кампании. Торги видны при любой " +
    "стратегии, но ставкой управляются только при ручной: на автостратегии (WB_*, AVERAGE_CPA, AVERAGE_CPC и " +
    "прочие) ставки назначает Директ. Стратегию кампании проверяйте через get_strategy.",
  annotations: READ,
  schema: getKeywordAuctionSchema,
  handler: handleGetKeywordAuction
})

export const setKeywordBidsTool = defineTool({
  name: "set_keyword_bids",
  title: "Установить ставки",
  description:
    "Установить фиксированные ставки (поиск/сети, в рублях) на уровне фраз, групп или кампаний и включить или " +
    "выключить автоставку автотаргетинга. Ставки применяются только при ручной стратегии: на автостратегии их " +
    "назначает Директ, и ставка, не подходящая стратегии, не применится. Сначала get_strategy, затем " +
    "get_keyword_auction — сколько стоит нужный объём трафика; ставку под объём ставит set_auto_keyword_bids.",
  annotations: IDEMPOTENT,
  schema: setKeywordBidsSchema,
  handler: handleSetKeywordBids
})

export const setAutoKeywordBidsTool = defineTool({
  name: "set_auto_keyword_bids",
  title: "Ставки под объём трафика",
  description:
    "Назначить ставки по правилу вместо суммы: на поиске — под желаемый объём трафика (5–100%), в сетях — под " +
    "долю аудитории, с надбавкой в процентах и потолком в рублях. Директ рассчитает ставку по текущим торгам " +
    "один раз, следить за ними дальше не будет; назначенные ставки покажет get_keyword_auction. Только при " +
    "ручной стратегии на соответствующей площадке — иначе Директ отклонит вызов. Отдельному автотаргетингу " +
    "правило не задаётся: используйте ad_group_ids или campaign_ids.",
  annotations: WRITE,
  schema: setAutoKeywordBidsSchema,
  handler: handleSetAutoKeywordBids
})
