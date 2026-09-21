// Дескрипторы инструментов домена: имя, описание и аннотация живут рядом с хендлером.
import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import {
  handleCreateCampaign,
  handleGetCampaign,
  handleGetStrategy,
  handleListCampaigns,
  handleManageCampaigns,
  handleSetPriorityGoals,
  handleSetStrategy,
  handleUpdateCampaign
} from "./handler.js"
import {
  createCampaignSchema,
  getCampaignSchema,
  getStrategySchema,
  listCampaignsSchema,
  manageCampaignsSchema,
  setPriorityGoalsSchema,
  setStrategySchema,
  updateCampaignSchema
} from "./schema.js"

export const listCampaignsTool = defineTool({
  name: "list_campaigns",
  title: "Список кампаний",
  description:
    "Список рекламных кампаний Яндекс.Директ с фильтрацией по статусу и типу. Бюджеты — в рублях. По умолчанию возвращается узкий набор полей; нужны другие (Funds, TimeZone, NegativeKeywords и прочие из CampaignFieldEnum) — перечислите их в fields. " +
    "Кампаний «Баннер на поиске» (MCBANNER) API не отдаёт вовсе: их нет в списке, и это граница API, " +
    "а не ошибка логина или фильтра — такие кампании видны только в веб-интерфейсе.",
  annotations: READ,
  schema: listCampaignsSchema,
  handler: handleListCampaigns
})

export const getCampaignTool = defineTool({
  name: "get_campaign",
  title: "Кампания по ID",
  description:
    "Детальная информация о кампании по ID: бюджет (руб), статус и пояснение к нему, даты, статистика, " +
    "UTM-разметка, цели и их ценность (PriorityGoals), счётчики Метрики, модель атрибуции и прочие настройки. " +
    "Реальные ID целей — PriorityGoals.Items[].GoalId; GoalId 13 в стратегии — служебное «ключевые цели», " +
    "то есть оптимизация по этим PriorityGoals. Пустой ответ по ID из веб-интерфейса не значит, что номер " +
    "неверный: кампании «Баннер на поиске» (MCBANNER) API не отдаёт, по ID они приходят пустыми.",
  annotations: READ,
  schema: getCampaignSchema,
  handler: handleGetCampaign
})

export const createCampaignTool = defineTool({
  name: "create_campaign",
  title: "Создать кампанию",
  description:
    "Создать новую текстово-графическую кампанию. Бюджет в рублях. Смарт-баннеры и динамические объявления Директ через API не создаёт с 22.05.2026, единую перфоманс-кампанию этот сервер пока не создаёт: такие кампании заводятся в интерфейсе Директа, дальше их можно читать и править здесь. ⚠️ Тестовой среды у Директа нет: кампания создаётся в боевом аккаунте. Деньги она начнёт тратить после модерации и включения, поэтому созданную для проверки оставляйте черновиком.",
  annotations: WRITE,
  schema: createCampaignSchema,
  handler: handleCreateCampaign
})

export const updateCampaignTool = defineTool({
  name: "update_campaign",
  title: "Обновить кампанию",
  description:
    "Обновить кампанию: название, бюджет (руб), UTM-разметку и/или статус (SUSPEND/RESUME/ARCHIVE/UNARCHIVE). Разметка действует на ссылки всех объявлений кампании.",
  annotations: IDEMPOTENT,
  schema: updateCampaignSchema,
  handler: handleUpdateCampaign
})

export const manageCampaignsTool = defineTool({
  name: "manage_campaigns",
  title: "Управление кампаниями",
  description:
    "Запустить, остановить, архивировать, разархивировать или удалить кампании. ⚠️ delete необратимо и недоступен кампании с накопленной статистикой — такую только архивировать.",
  annotations: DESTRUCTIVE,
  schema: manageCampaignsSchema,
  handler: handleManageCampaigns
})

export const getStrategyTool = defineTool({
  name: "get_strategy",
  title: "Стратегия кампании",
  description:
    "Получить текущую стратегию показов текстово-графической кампании вместе с целями (PriorityGoals), счётчиками и " +
    "моделью атрибуции. Реальные ID целей Метрики, по которым работает кампания, — " +
    "TextCampaign.PriorityGoals.Items[].GoalId (рядом их ценность Value в рублях), счётчики — CounterIds. " +
    "GoalId внутри BiddingStrategy бывает служебным: 13 — «оптимизировать по ключевым целям», то есть по тем же " +
    "PriorityGoals; 12 — «Вовлечённые сессии». Названий целей API Директа не отдаёт — они есть только в Метрике.",
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

export const setPriorityGoalsTool = defineTool({
  name: "set_priority_goals",
  title: "Цели стратегии",
  description:
    "Задать цели стратегии кампании (PriorityGoals) и их ценность в рублях — по ним автостратегия оптимизирует " +
    "ставки, в том числе «максимум конверсий» со служебным GoalId 13. Режим mode обязателен: add добавляет цели или " +
    "меняет ценность уже заданных, remove убирает названные, replace заменяет список целиком (пустой массив очищает). " +
    "Текущий список сервер читает сам. Чтобы добавить цель к существующим, нужен add: replace с одной целью сотрёт " +
    "остальные. ⚠️ Смена целей перезапускает обучение стратегии. Поддерживаются текстово-графические, динамические, " +
    "смарт и единые перфоманс-кампании; ID целей — из Метрики.",
  annotations: DESTRUCTIVE,
  schema: setPriorityGoalsSchema,
  handler: handleSetPriorityGoals
})
