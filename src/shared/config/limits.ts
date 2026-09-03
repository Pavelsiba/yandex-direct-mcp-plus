// Настройки транспорта и выборок: крутилки живут здесь. Структурные константы
// (вроде «список не пуст») остаются на месте объявления, в схеме инструмента.

export const REQUEST_TIMEOUT_MS = 15_000
export const MAX_RETRIES = 3
export const MAX_RETRY_DELAY_MS = 8_000

// Отчёт формируется офлайн: сервер отвечает 201/202 и просит повторить позже.
export const REPORT_MAX_POLLS = 6
export const REPORT_DEFAULT_RETRY_IN_SEC = 5
export const REPORT_MAX_RETRY_IN_SEC = 15

// Page.Limit в v5 ограничен десятью тысячами.
export const PAGE_MAX_LIMIT = 10_000

// Ограничения самого Директа на размер выборки в одном вызове.
export const MAX_CAMPAIGNS_PER_CALL = 1_000
export const MAX_AD_GROUPS_PER_CALL = 1_000
export const MAX_ADS_PER_MODERATION = 10_000
export const MAX_SHARED_SETS_PER_CALL = 30
export const MAX_SHARED_SETS_PER_AD_GROUP = 3
export const SHARED_SET_NAME_MAX = 255

// Универсальный потолок на список ID в SelectionCriteria большинства сервисов.
export const MAX_IDS_PER_CALL = 10_000

// Длины текстов объявления, справочник TextAd.
export const AD_TEXT_LIMITS = { title: 56, title2: 30, text: 81 } as const

// Быстрые ссылки: длины полей и размер набора.
export const SITELINK_LIMITS = { title: 30, href: 1024, description: 60, perSet: 8 } as const

// Уточнения (Callout).
export const CALLOUT_TEXT_MAX = 25
export const MAX_CALLOUTS_PER_CALL = 1_000

// Изображения объявлений.
export const AD_IMAGE_NAME_MAX = 255
export const MAX_IMAGES_PER_CALL = 100

// Ретаргетинг: длины полей и срок учёта цели.
export const RETARGETING_LIMITS = { name: 250, description: 4096, membershipDays: 540 } as const

// Коэффициент корректировки ставки, в процентах.
export const BID_MODIFIER_RANGE = { min: 0, max: 1300 } as const

// Корректировки читаются не больше чем по десяти кампаниям за вызов.
export const MAX_CAMPAIGNS_PER_ADJUSTMENT_CALL = 10

// Аудиторные цели читаются не больше чем по сотне кампаний за вызов.
export const MAX_CAMPAIGNS_PER_AUDIENCE_CALL = 100

// Ограничения ChangesService на размер выборки.
export const MAX_CAMPAIGNS_PER_CHANGES_CALL = 3_000
export const MAX_AD_GROUPS_PER_CHANGES_CALL = 10_000
export const MAX_ADS_PER_CHANGES_CALL = 50_000

// Выдача справочника регионов: сколько строк отдавать модели за раз.
export const REGIONS_DEFAULT_LIMIT = 50
export const REGIONS_MAX_LIMIT = 500

// Временной таргетинг: почасовой коэффициент задаётся в процентах от текущей ставки,
// шаг 10, ноль — показов в этот час нет. Праздничный коэффициент начинается с 10:
// ноль там запрещён, показы в праздники отключает отдельный флаг.
export const HOURS_IN_DAY = 24
export const HOURLY_BID_RANGE = { min: 0, max: 200, step: 10 } as const
export const HOLIDAY_BID_RANGE = { min: 10, max: 200, step: 10 } as const

// Выдача справочника часовых поясов: сколько строк отдавать модели за раз.
export const TIME_ZONES_DEFAULT_LIMIT = 50
export const TIME_ZONES_MAX_LIMIT = 500
