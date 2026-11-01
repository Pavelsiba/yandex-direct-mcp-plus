// Чтение окружения. Значения читаются на каждый запрос, а не при импорте модуля:
// иначе тест не смог бы подменить их между кейсами, а сервер — стартовать без них.
import { homedir } from "node:os"
import { join } from "node:path"

// Готовый токен главнее сохранённого входа: CI и прежние конфигурации не ломаются.
export function getEnvToken(): string | undefined {
  return process.env.YANDEX_DIRECT_TOKEN || undefined
}

// Client-Login обязателен для агентских токенов.
// Док: https://yandex.ru/dev/direct/doc/en/concepts/headers
export function getClientLogin(): string | undefined {
  return process.env.YANDEX_DIRECT_LOGIN
}

export function getCredentialsPath(): string {
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config")
  return join(configHome, "yd-mcp", "credentials.json")
}
