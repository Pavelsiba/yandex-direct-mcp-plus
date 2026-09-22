import { API_FIELDS } from "./api-fields.js"

// Перечисления Директа для литералов схем. Здесь только закрытые списки — из WSDL или
// ограниченные нашей реализацией: неполный литерал отклонил бы валидный вызов.

// UNKNOWN бывает только в ответе.
export const CAMPAIGN_STATUSES = ["ACCEPTED", "DRAFT", "MODERATION", "REJECTED"] as const

export const KEYWORD_ACTIONS = ["suspend", "resume", "delete"] as const

export const AD_ACTIONS = ["suspend", "resume", "archive", "unarchive", "moderate", "delete"] as const

export const CAMPAIGN_ACTIONS = ["suspend", "resume", "archive", "unarchive", "delete"] as const

// Верхний регистр — внешний контракт update_campaign, к CAMPAIGN_ACTIONS не приводить.
export const CAMPAIGN_STATUS_ACTIONS = ["SUSPEND", "RESUME", "ARCHIVE", "UNARCHIVE"] as const

// WSDL здесь не источник: динамические и смарт в нём есть, но боевой API их не создаёт (3500).
export const CAMPAIGN_TYPES_CREATABLE = ["TEXT_CAMPAIGN"] as const

// CampaignTypeGetEnum без UNKNOWN: оно только в ответе, фильтровать по нему нечего.
export const CAMPAIGN_TYPES = [
  "TEXT_CAMPAIGN",
  "MOBILE_APP_CAMPAIGN",
  "DYNAMIC_TEXT_CAMPAIGN",
  "CPM_BANNER_CAMPAIGN",
  "SMART_CAMPAIGN",
  "UNIFIED_CAMPAIGN"
] as const

// TextCampaignSearchStrategyTypeEnum без UNKNOWN — по WSDL, страница add перечисляет не всё.
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

// TextCampaignNetworkStrategyTypeEnum без UNKNOWN.
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

export const NEGATIVE_KEYWORD_SET_ACTIONS = ["add", "update", "delete"] as const

export const AD_EXTENSION_STATES = ["ON", "DELETED"] as const
export const AD_EXTENSION_STATUSES = ["ACCEPTED", "DRAFT", "MODERATION", "REJECTED"] as const

export const AD_IMAGE_TYPES = ["REGULAR", "WIDE", "FIXED_IMAGE", "AUTO"] as const

export const AD_IMAGE_ACTIONS = ["add", "get", "delete"] as const

export const ASSOCIATED_FLAGS = ["YES", "NO"] as const

export const RETARGETING_TYPES = ["RETARGETING", "AUDIENCE"] as const
export const RETARGETING_RULE_OPERATORS = ["ALL", "ANY", "NONE"] as const

// Один список и для фильтра get_bid_adjustments, и для вида корректировки при добавлении.
export const BID_ADJUSTMENT_TYPES = [
  "MOBILE_ADJUSTMENT",
  "TABLET_ADJUSTMENT",
  "DESKTOP_ADJUSTMENT",
  "DESKTOP_ONLY_ADJUSTMENT",
  "SMART_TV_ADJUSTMENT",
  "DEMOGRAPHICS_ADJUSTMENT",
  "RETARGETING_ADJUSTMENT",
  "REGIONAL_ADJUSTMENT",
  "VIDEO_ADJUSTMENT",
  "SMART_AD_ADJUSTMENT",
  "SERP_LAYOUT_ADJUSTMENT",
  "INCOME_GRADE_ADJUSTMENT",
  "AD_GROUP_ADJUSTMENT"
] as const

// Срезы корректировок — из general.xsd, в WSDL сервисов их нет.
export const OPERATING_SYSTEM_TYPES = ["IOS", "ANDROID"] as const
export const GENDERS = ["GENDER_MALE", "GENDER_FEMALE"] as const
export const AGE_RANGES = ["AGE_0_17", "AGE_18_24", "AGE_25_34", "AGE_35_44", "AGE_45", "AGE_45_54", "AGE_55"] as const
export const SERP_LAYOUTS = ["ALONE", "SUGGEST"] as const
export const INCOME_GRADES = ["VERY_HIGH", "HIGH", "ABOVE_AVERAGE"] as const

export const BID_ADJUSTMENT_LEVELS = ["CAMPAIGN", "AD_GROUP"] as const

export const AUDIENCE_TARGET_STATES = ["ON", "SUSPENDED"] as const
export const AUDIENCE_TARGET_ACTIONS = ["add", "set_bids", "suspend", "resume", "delete"] as const

export const STRATEGY_PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const

export const DYNAMIC_TARGET_ACTIONS = ["add", "set_bids", "suspend", "resume", "delete"] as const
export const WEBPAGE_CONDITION_OPERANDS = ["URL", "DOMAIN", "PAGE_TITLE", "PAGE_CONTENT", "OFFERS_LIST_URL"] as const
export const WEBPAGE_CONDITION_OPERATORS = ["EQUALS_ANY", "NOT_EQUALS_ALL", "CONTAINS_ANY", "NOT_CONTAINS_ALL"] as const

// Наши имена методов checkCampaigns / check / checkDictionaries.
export const CHANGES_MODES = ["campaigns", "objects", "dictionaries"] as const
export const CHANGES_FIELD_NAMES = API_FIELDS.changes.CheckFieldEnum

// Ограничение наше: set_strategy собирает настройки только для этих стратегий. Сочетание
// поиска и сетей не проверяется — таблица совместимости у Директа и меняется без нас.
export const SETTABLE_SEARCH_STRATEGIES = [
  "HIGHEST_POSITION",
  "WB_MAXIMUM_CLICKS",
  "WB_MAXIMUM_CONVERSION_RATE",
  "AVERAGE_CPC",
  "AVERAGE_CPA",
  "PAY_FOR_CONVERSION",
  "SERVING_OFF"
] as const

export const SETTABLE_NETWORK_STRATEGIES = [
  "NETWORK_DEFAULT",
  "MAXIMUM_COVERAGE",
  "WB_MAXIMUM_CLICKS",
  "WB_MAXIMUM_CONVERSION_RATE",
  "AVERAGE_CPC",
  "AVERAGE_CPA",
  "PAY_FOR_CONVERSION",
  "SERVING_OFF"
] as const

// В API день — число 1–7 в строке Schedule; наружу буквенный код: число модель путает с часом.
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const
