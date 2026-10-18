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
    "Ключевые фразы в группах объявлений: фразы, ставки (руб), статусы. По умолчанию возвращается узкий набор полей; нужны другие (StatisticsSearch, StatisticsNetwork, Productivity, ServingStatus и прочие из KeywordFieldEnum) — перечислите их в fields.",
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
    "Изменить текст ключевых фраз и подстановочные переменные {param1}/{param2}. Правка текста может привести к появлению фразы с новым ID или к её удалению как дубликата — сверьтесь с list_keywords после вызова. Ставки меняет set_keyword_bids, статус — manage_keywords.",
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
    "Search.AuctionBids — для каждого объёма трафика (TrafficVolume, %: 100 — максимум, доступный фразе) " +
    "Bid — сколько поставить и Price — сколько спишется за клик; в сетях Network.Coverage — ставка под долю " +
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
