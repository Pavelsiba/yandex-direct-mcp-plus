import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import {
  handleAddKeywords,
  handleGetKeywordAuction,
  handleListKeywords,
  handleManageKeywords,
  handleSetKeywordBids,
  handleUpdateKeywords
} from "./handler.js"
import {
  addKeywordsSchema,
  getKeywordAuctionSchema,
  listKeywordsSchema,
  manageKeywordsSchema,
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
    "Сколько стоит показ: ставки и списываемые цены по позициям, ставки конкурентов, минимальная цена входа. " +
    "Всё в рублях. Позиции — P11–P14 (спецразмещение над выдачей) и P21–P24 (гарантия под выдачей); у каждой " +
    "Bid — сколько надо поставить, Price — сколько спишется на деле. Отбор по одному уровню: фразы, группы или " +
    "кампании. Цену аукциона показывает для любой кампании, но ставкой она управляется только при ручном " +
    "управлении: на автостратегии (любая WB_*, AVERAGE_CPA, AVERAGE_CPC и прочие) ставки назначает Директ, и " +
    "set_keyword_bids там ничего не даст. Стратегию кампании проверяйте через get_strategy.",
  annotations: READ,
  schema: getKeywordAuctionSchema,
  handler: handleGetKeywordAuction
})

export const setKeywordBidsTool = defineTool({
  name: "set_keyword_bids",
  title: "Установить ставки",
  description:
    "Установить ставки (поиск/сети, в рублях) на уровне фраз, групп или кампаний (сервис Bids). Работает только " +
    "при ручном управлении ставками: на автостратегии Директ назначает ставки сам, вызов пройдёт без ошибки, но " +
    "на показы не повлияет. Сначала get_strategy, затем get_keyword_auction — сколько стоит нужная позиция.",
  annotations: IDEMPOTENT,
  schema: setKeywordBidsSchema,
  handler: handleSetKeywordBids
})
