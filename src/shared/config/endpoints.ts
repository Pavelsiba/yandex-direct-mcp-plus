// Эндпоинты Директа. Песочница — изолированные данные под тем же OAuth-токеном,
// реальных трат нет. Док: https://yandex.com/dev/direct/doc/en/concepts/sandbox
import { isSandbox } from "#shared/config/env"

export function baseUrl(): string {
  return isSandbox() ? "https://api-sandbox.direct.yandex.com/json/v5/" : "https://api.direct.yandex.com/json/v5/"
}

export function reportUrl(): string {
  return `${baseUrl()}reports`
}

// Финансовая информация (баланс) живёт только в Live API v4, в v5 её нет.
export function v4Url(): string {
  return isSandbox()
    ? "https://api-sandbox.direct.yandex.ru/live/v4/json/"
    : "https://api.direct.yandex.ru/live/v4/json/"
}
