// Дескрипторы инструментов домена: имя, описание и аннотация живут рядом с хендлером.
import { defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import {
  handleCreateCampaign,
  handleGetCampaign,
  handleGetStrategy,
  handleListCampaigns,
  handleManageCampaigns,
  handleSetStrategy,
  handleUpdateCampaign
} from "./handler.js"
import {
  createCampaignSchema,
  getCampaignSchema,
  getStrategySchema,
  listCampaignsSchema,
  manageCampaignsSchema,
  setStrategySchema,
  updateCampaignSchema
} from "./schema.js"

export const listCampaignsTool = defineTool({
  name: "list_campaigns",
  title: "Список кампаний",
  description: "Список рекламных кампаний Яндекс.Директ с фильтрацией по статусу и типу. Бюджеты — в рублях.",
  annotations: READ,
  schema: listCampaignsSchema,
  handler: handleListCampaigns
})

export const getCampaignTool = defineTool({
  name: "get_campaign",
  title: "Кампания по ID",
  description: "Детальная информация о кампании по ID: бюджет (руб), статус, даты, статистика.",
  annotations: READ,
  schema: getCampaignSchema,
  handler: handleGetCampaign
})

export const createCampaignTool = defineTool({
  name: "create_campaign",
  title: "Создать кампанию",
  description:
    "Создать новую рекламную кампанию. Бюджет в рублях. ⚠️ Тестовой среды у Директа нет: кампания создаётся в боевом аккаунте. Деньги она начнёт тратить после модерации и включения, поэтому созданную для проверки оставляйте черновиком.",
  annotations: WRITE,
  schema: createCampaignSchema,
  handler: handleCreateCampaign
})

export const updateCampaignTool = defineTool({
  name: "update_campaign",
  title: "Обновить кампанию",
  description: "Обновить кампанию: название, бюджет (руб) и/или статус (SUSPEND/RESUME/ARCHIVE/UNARCHIVE).",
  annotations: IDEMPOTENT,
  schema: updateCampaignSchema,
  handler: handleUpdateCampaign
})

export const manageCampaignsTool = defineTool({
  name: "manage_campaigns",
  title: "Управление кампаниями",
  description: "Запустить, остановить, архивировать или разархивировать несколько кампаний.",
  annotations: IDEMPOTENT,
  schema: manageCampaignsSchema,
  handler: handleManageCampaigns
})

export const getStrategyTool = defineTool({
  name: "get_strategy",
  title: "Стратегия кампании",
  description: "Получить текущую стратегию показов текстово-графической кампании.",
  annotations: READ,
  schema: getStrategySchema,
  handler: handleGetStrategy
})

export const setStrategyTool = defineTool({
  name: "set_strategy",
  title: "Изменить стратегию кампании",
  description:
    "Изменить стратегию текстово-графической кампании: ручная, максимум кликов, средняя цена клика или конверсии, " +
    "оплата за конверсию. Цены — в рублях, цель Метрики — goal_id.",
  annotations: IDEMPOTENT,
  schema: setStrategySchema,
  handler: handleSetStrategy
})
