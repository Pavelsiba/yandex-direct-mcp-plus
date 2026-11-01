// Настройки транспорта и ограничения Директа. Структурные константы (вроде «список
// не пуст») остаются в схеме инструмента.

export const REQUEST_TIMEOUT_MS = 15_000
export const MAX_RETRIES = 3
export const MAX_RETRY_DELAY_MS = 8_000

// Сколько символов тела ответа показывать в тексте ошибки: HTML-заглушка иначе забила бы его.
export const ERROR_BODY_PREVIEW_MAX = 300

// Отчёт формируется офлайн: сервер отвечает 201/202 и просит повторить позже.
export const REPORT_MAX_POLLS = 6
export const REPORT_DEFAULT_RETRY_IN_SEC = 5
export const REPORT_MAX_RETRY_IN_SEC = 15

// Прогноз Live v4 формируется в среднем до минуты; готовность опрашивается по GetForecastList.
// queueRetries — сколько раз ждать места в очереди: в ней не больше пяти несформированных
// отчётов на пользователя, место освобождается за секунды.
export const FORECAST_POLL = { intervalMs: 5_000, maxPolls: 18, queueRetries: 6 } as const
export const FORECAST_MAX_PHRASES = 100

export const PAGE_MAX_LIMIT = 10_000

export const MAX_CAMPAIGNS_PER_CALL = 1_000
export const MAX_AD_GROUPS_PER_CALL = 1_000
export const MAX_ADS_PER_MODERATION = 10_000
export const MAX_CAMPAIGNS_PER_ADS_CALL = 10
export const MAX_SHARED_SETS_PER_CALL = 30
export const MAX_SHARED_SETS_PER_AD_GROUP = 3
export const SHARED_SET_NAME_MAX = 255

export const MAX_PRIORITY_GOALS = 30

// Общий потолок на список ID в SelectionCriteria; им же ограничены визитки, для которых
// своего числа в справке нет.
export const MAX_IDS_PER_CALL = 10_000

export const RESPONSIVE_AD_LIMITS = { title: 56, text: 81, titles: 7, texts: 3 } as const

export const SITELINK_LIMITS = { title: 30, href: 1024, description: 60, perSet: 8 } as const
export const MAX_SITELINK_SETS_PER_CALL = 1_000

export const CALLOUT_TEXT_MAX = 25
export const MAX_CALLOUTS_PER_CALL = 1_000

export const AD_IMAGE_NAME_MAX = 255
export const MAX_IMAGES_PER_CALL = 100

export const RETARGETING_LIMITS = { name: 250, description: 4096, membershipDays: 540 } as const
export const MAX_RETARGETING_LISTS_PER_CALL = 1_000

export const KEYWORD_TEXT_MAX = 4_096
export const KEYWORD_USER_PARAM_MAX = 255
export const MAX_KEYWORDS_PER_UPDATE = 1_000

// Пакет ставок KeywordBids.set/setAuto: предел свой для каждого уровня целей.
export const BID_TARGET_LIMITS = { campaigns: 10, adGroups: 1_000, keywords: 10_000 } as const
// Правило setAuto, проценты: объём трафика на поиске, доля аудитории в сетях, надбавка.
export const AUTO_BID_RANGES = {
  trafficVolume: { min: 5, max: 100 },
  coverage: { min: 1, max: 100 },
  increasePercent: { min: 0, max: 1_000 }
} as const

// Коэффициент корректировки, проценты.
export const BID_MODIFIER_RANGE = { min: 0, max: 1300 } as const
export const MAX_ADJUSTMENTS_PER_CALL = 1_000
export const MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL = 10

export const MAX_CAMPAIGNS_PER_AUDIENCE_CALL = 100

export const MAX_CAMPAIGNS_PER_CHANGES_CALL = 3_000
export const MAX_AD_GROUPS_PER_CHANGES_CALL = 10_000
export const MAX_ADS_PER_CHANGES_CALL = 50_000

// Сколько строк справочника отдавать модели за раз.
export const REGIONS_DEFAULT_LIMIT = 50
export const REGIONS_MAX_LIMIT = 500
export const TIME_ZONES_DEFAULT_LIMIT = 50
export const TIME_ZONES_MAX_LIMIT = 500

// Почасовой коэффициент — проценты от ставки, 0 отключает показы в этот час. В праздники
// ноль запрещён: показы там отключает отдельный флаг.
export const HOURS_IN_DAY = 24
export const HOURLY_BID_RANGE = { min: 0, max: 200, step: 10 } as const
export const HOLIDAY_BID_RANGE = { min: 10, max: 200, step: 10 } as const
