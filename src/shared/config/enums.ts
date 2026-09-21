import { API_FIELDS } from "./api-fields.js"

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

// Действия над кампанией: отдельные методы API, набор закрыт. delete необратим и
// доступен не всегда: кампанию с накопленной статистикой, поступившими средствами или
// в статусе CONVERTED Директ удалять отказывается — такую только архивировать.
export const CAMPAIGN_ACTIONS = ["suspend", "resume", "archive", "unarchive", "delete"] as const

// То же действие в update_campaign исторически принимается в верхнем регистре.
// Регистр — часть внешнего контракта, менять его нельзя: он зашит в чужие сценарии.
export const CAMPAIGN_STATUS_ACTIONS = ["SUSPEND", "RESUME", "ARCHIVE", "UNARCHIVE"] as const

// Типы, которые умеет создавать create_campaign. WSDL здесь не источник: в CampaignAddItem
// есть и DynamicTextCampaign, и SmartCampaign, но боевой API с 22.05.2026 их не создаёт —
// DYNAMIC_TEXT_CAMPAIGN отбит ошибкой 3500 (13.09.2026). Единая перфоманс-кампания — #46.
export const CAMPAIGN_TYPES_CREATABLE = ["TEXT_CAMPAIGN"] as const

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

// BidModifierTypeEnum целиком: тем же набором фильтрует get_bid_adjustments и выбирает
// вид корректировки add_bid_adjustments — в API это один список.
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

// Срезы, на которые вешается корректировка: OperatingSystemTypeEnum, GenderEnum,
// AgeRangeEnum, SerpLayoutEnum и IncomeGradeEnum из general.xsd.
export const OPERATING_SYSTEM_TYPES = ["IOS", "ANDROID"] as const
export const GENDERS = ["GENDER_MALE", "GENDER_FEMALE"] as const
export const AGE_RANGES = ["AGE_0_17", "AGE_18_24", "AGE_25_34", "AGE_35_44", "AGE_45", "AGE_45_54", "AGE_55"] as const
export const SERP_LAYOUTS = ["ALONE", "SUGGEST"] as const
export const INCOME_GRADES = ["VERY_HIGH", "HIGH", "ABOVE_AVERAGE"] as const

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

// Режимы get_changes — наши имена методов checkCampaigns/check/checkDictionaries.
// Поля же берутся из снимка WSDL: это ровно CheckFieldEnum, и рукописная копия
// разошлась бы с ним молча.
export const CHANGES_MODES = ["campaigns", "objects", "dictionaries"] as const
export const CHANGES_FIELD_NAMES = API_FIELDS.changes.CheckFieldEnum

// Стратегии, которые умеет выставлять set_strategy. Список по-прежнему уже полного
// (в TextCampaignStrategyBase двенадцать структур настроек), но покрывает переход
// «клики → конверсии»: ручная, максимум кликов, средняя цена клика, средняя цена
// конверсии и оплата за конверсию. Ограничение наше, не Директа — хендлер собирает
// настройки только для этих типов.
//
// Сочетание сторон схемой не проверяется: таблица совместимости живёт у Директа
// и меняется без нас, а лишний запрет здесь отклонял бы валидный вызов.
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

// Дни недели расписания показов. В API день — первое число строки Schedule
// (1 — понедельник … 7 — воскресенье); наружу отдаются буквенные коды: число
// модель путает с часом, а порядок дней в неделе Директа не совпадает с ISO-датой.
export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const
