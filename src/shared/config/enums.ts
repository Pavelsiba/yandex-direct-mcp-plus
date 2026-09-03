// Перечисления Директа, по набору на предметную область. Схема — единственная
// документация, которую видит модель: допустимые значения обязаны быть типом.
//
// Список фиксируется здесь ТОЛЬКО когда он закрыт — подтверждён справочником API
// (сверка 03.09.2026) или ограничен нашей же реализацией. Директ пополняет
// перечисления без предупреждения, и неполный литерал отклонял бы валидный вызов,
// поэтому неподтверждённое остаётся строкой с перечислением в описании.

// CampaignsService.get, SelectionCriteria.Statuses. UNKNOWN — только в ответе.
export const CAMPAIGN_STATUSES = ["ACCEPTED", "DRAFT", "MODERATION", "REJECTED"] as const

// Действия над ключевыми фразами: имя действия и есть метод сервиса keywords.
export const KEYWORD_ACTIONS = ["suspend", "resume", "delete"] as const

// Действия над объявлениями: тоже методы сервиса ads.
export const AD_ACTIONS = ["suspend", "resume", "archive", "unarchive", "moderate", "delete"] as const

// Действия над кампанией: отдельные методы API, набор закрыт.
export const CAMPAIGN_ACTIONS = ["suspend", "resume", "archive", "unarchive"] as const

// То же действие в update_campaign исторически принимается в верхнем регистре.
// Регистр — часть внешнего контракта, менять его нельзя: он зашит в чужие сценарии.
export const CAMPAIGN_STATUS_ACTIONS = ["SUSPEND", "RESUME", "ARCHIVE", "UNARCHIVE"] as const

// Типы, которые умеет создавать create_campaign. Список ограничен нашей реализацией,
// а не API: хендлер собирает только TextCampaign и DynamicTextCampaign.
export const CAMPAIGN_TYPES_CREATABLE = ["TEXT_CAMPAIGN", "DYNAMIC_TEXT_CAMPAIGN"] as const

// Типы кампаний для фильтра list_campaigns: CampaignTypeGetEnum без UNKNOWN —
// это значение приходит в ответе для неизвестного клиенту типа, фильтровать по нему нечего.
export const CAMPAIGN_TYPES = [
  "TEXT_CAMPAIGN",
  "MOBILE_APP_CAMPAIGN",
  "DYNAMIC_TEXT_CAMPAIGN",
  "CPM_BANNER_CAMPAIGN",
  "SMART_CAMPAIGN",
  "UNIFIED_CAMPAIGN"
] as const

// TextCampaignSearchStrategyTypeEnum без UNKNOWN. Набор шире, чем перечисляет
// страница add: схема допускает и AVERAGE_ROI, и MAX_PROFIT, и *_MULTIPLE_GOALS.
// Стратегии динамических кампаний — подмножество этого набора.
export const SEARCH_STRATEGIES = [
  "HIGHEST_POSITION",
  "IMPRESSIONS_BELOW_SEARCH",
  "WB_MAXIMUM_CLICKS",
  "WB_MAXIMUM_CONVERSION_RATE",
  "WEEKLY_CLICK_PACKAGE",
  "AVERAGE_CPC",
  "AVERAGE_CPA",
  "AVERAGE_CPA_MULTIPLE_GOALS",
  "AVERAGE_ROI",
  "AVERAGE_CRR",
  "PAY_FOR_CONVERSION",
  "PAY_FOR_CONVERSION_CRR",
  "PAY_FOR_CONVERSION_MULTIPLE_GOALS",
  "MAX_PROFIT",
  "SERVING_OFF"
] as const

// TextCampaignNetworkStrategyTypeEnum без UNKNOWN. От поисковой отличается началом:
// вместо HIGHEST_POSITION — NETWORK_DEFAULT и MAXIMUM_COVERAGE.
export const NETWORK_STRATEGIES = [
  "NETWORK_DEFAULT",
  "MAXIMUM_COVERAGE",
  "WB_MAXIMUM_CLICKS",
  "WB_MAXIMUM_CONVERSION_RATE",
  "WEEKLY_CLICK_PACKAGE",
  "AVERAGE_CPC",
  "AVERAGE_CPA",
  "AVERAGE_CPA_MULTIPLE_GOALS",
  "AVERAGE_ROI",
  "AVERAGE_CRR",
  "PAY_FOR_CONVERSION",
  "PAY_FOR_CONVERSION_CRR",
  "PAY_FOR_CONVERSION_MULTIPLE_GOALS",
  "MAX_PROFIT",
  "SERVING_OFF"
] as const

// Действия над общими наборами минус-фраз: методы сервиса negativekeywordsharedsets.
export const NEGATIVE_KEYWORD_SET_ACTIONS = ["add", "update", "delete"] as const

// Состояния и статусы уточнений (AdExtensions.get, SelectionCriteria).
export const AD_EXTENSION_STATES = ["ON", "DELETED"] as const
export const AD_EXTENSION_STATUSES = ["ACCEPTED", "DRAFT", "MODERATION", "REJECTED"] as const

// AdImageAddTypeEnum: AUTO просит Директ определить тип по размеру картинки.
export const AD_IMAGE_TYPES = ["REGULAR", "WIDE", "FIXED_IMAGE", "AUTO"] as const

// Что делает manage_ad_images: методы сервиса adimages.
export const AD_IMAGE_ACTIONS = ["add", "get", "delete"] as const

// Признак «привязан к объявлению» в SelectionCriteria ряда сервисов.
export const ASSOCIATED_FLAGS = ["YES", "NO"] as const

// RetargetingListTypeEnum и RetargetingListRuleOperatorEnum.
export const RETARGETING_TYPES = ["RETARGETING", "AUDIENCE"] as const
export const RETARGETING_RULE_OPERATORS = ["ALL", "ANY", "NONE"] as const

// Типы корректировок, которые читает get_bid_adjustments. BidModifierTypeEnum шире
// (регионы, видео, доход, SERP-раскладка) — эти сервер пока не покрывает, см. roadmap.
export const BID_ADJUSTMENT_TYPES = [
  "MOBILE_ADJUSTMENT",
  "TABLET_ADJUSTMENT",
  "DESKTOP_ADJUSTMENT",
  "DESKTOP_ONLY_ADJUSTMENT",
  "DEMOGRAPHICS_ADJUSTMENT"
] as const

// BidModifierLevelEnum.
export const BID_ADJUSTMENT_LEVELS = ["CAMPAIGN", "AD_GROUP"] as const

// AudienceTargetStateEnum и действия сервиса audiencetargets (setBids — наш set_bids).
export const AUDIENCE_TARGET_STATES = ["ON", "SUSPENDED"] as const
export const AUDIENCE_TARGET_ACTIONS = ["add", "set_bids", "suspend", "resume", "delete"] as const

// Приоритет цели для автоматических стратегий.
export const STRATEGY_PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const

// Динамические цели: действия сервиса dynamictextadtargets и условия отбора страниц
// (WebpageConditionOperandEnum, StringConditionOperatorEnum).
export const DYNAMIC_TARGET_ACTIONS = ["add", "set_bids", "suspend", "resume", "delete"] as const
export const WEBPAGE_CONDITION_OPERANDS = ["URL", "DOMAIN", "PAGE_TITLE", "PAGE_CONTENT", "OFFERS_LIST_URL"] as const
export const WEBPAGE_CONDITION_OPERATORS = ["EQUALS_ANY", "NOT_EQUALS_ALL", "CONTAINS_ANY", "NOT_CONTAINS_ALL"] as const

// Режимы get_changes (наши имена методов checkCampaigns/check) и CheckFieldEnum.
export const CHANGES_MODES = ["campaigns", "objects"] as const
export const CHANGES_FIELD_NAMES = ["CampaignIds", "AdGroupIds", "AdIds", "CampaignsStat"] as const

// Стратегии, которые умеет выставлять set_strategy. Ограничение нашей реализации:
// хендлер собирает настройки только для WbMaximumClicks и NetworkDefault.
export const SETTABLE_SEARCH_STRATEGIES = ["HIGHEST_POSITION", "WB_MAXIMUM_CLICKS", "SERVING_OFF"] as const
export const SETTABLE_NETWORK_STRATEGIES = ["NETWORK_DEFAULT", "WB_MAXIMUM_CLICKS", "SERVING_OFF"] as const

// Дни недели расписания показов. В API день — первое число строки Schedule
// (1 — понедельник … 7 — воскресенье); наружу отдаются буквенные коды: число
// модель путает с часом, а порядок дней в неделе Директа не совпадает с ISO-датой.
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const
