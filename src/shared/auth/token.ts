// Источник токена для каждого запроса к Директу. Порядок: токен запроса (его подставляет
// хостинг через runWithToken) → YANDEX_DIRECT_TOKEN → сохранённый вход из диалога.
// Модуль — часть публичного API пакета: хостинг импортирует отсюда runWithToken и requireRequestToken.
import { AsyncLocalStorage } from "node:async_hooks"
import { type Credentials, readCredentials, writeCredentials } from "#shared/auth/credentials"
import { refreshCredentials } from "#shared/auth/oauth"
import { getCredentialsPath, getEnvToken } from "#shared/config/env"
import { TOKEN_REFRESH_MARGIN_MS } from "#shared/config/limits"

export type TokenSource = "request" | "env" | "login"

export type ResolvedToken = { token: string; source: TokenSource }

type ClockAndPath = { now?: number; path?: string }

const NO_TOKEN = [
  "Яндекс.Директ не подключён: токена нет.",
  "Войдите из диалога: start_login, покажите пользователю ссылку, код со страницы Яндекса передайте в finish_login.",
  "Либо задайте YANDEX_DIRECT_TOKEN в конфигурации MCP-клиента и перезапустите сервер."
].join(" ")

const requestToken = new AsyncLocalStorage<string>()

/** Выполняет `action` с токеном пользователя: все запросы к Директу внутри пойдут с ним. */
export function runWithToken<T>(token: string, action: () => T): T {
  return requestToken.run(token, action)
}

// На общем сервере откат к окружению или файлу отдал бы чужой кабинет запросу, который
// хостинг забыл обернуть в runWithToken.
let requestOnly = false

const NO_REQUEST_TOKEN =
  "Запрос пришёл без токена пользователя: сервер работает в режиме «только токен запроса», а runWithToken не вызван. Это ошибка хостинга, а не пользователя."

/** Режим общего сервера: токен берётся только из runWithToken, окружение и файл входа не читаются. */
export function requireRequestToken(enabled = true): void {
  requestOnly = enabled
}

// Параллельные запросы при истёкшем токене обновляют его один раз: второй refresh тем же
// refresh_token Яндекс мог бы уже не принять.
const refreshing = new Map<string, Promise<Credentials>>()

function refreshOnce(path: string, credentials: Credentials, now: number): Promise<Credentials> {
  const pending = refreshing.get(path)
  if (pending) return pending
  const next = refreshCredentials(credentials, now)
    .then(async (fresh) => {
      await writeCredentials(path, fresh)
      return fresh
    })
    .finally(() => refreshing.delete(path))
  refreshing.set(path, next)
  return next
}

async function loginToken(path: string, now: number): Promise<string> {
  const credentials = await readCredentials(path)
  if (!credentials) throw new Error(NO_TOKEN)
  if (credentials.expiresAt - TOKEN_REFRESH_MARGIN_MS > now) return credentials.accessToken

  try {
    return (await refreshOnce(path, credentials, now)).accessToken
  } catch (error) {
    // Обновление заранее не удалось, но срок ещё не вышел — работаем на прежнем токене.
    if (credentials.expiresAt > now) return credentials.accessToken
    throw error
  }
}

export async function resolveToken({
  now = Date.now(),
  path = getCredentialsPath()
}: ClockAndPath = {}): Promise<ResolvedToken> {
  const fromRequest = requestToken.getStore()
  if (fromRequest) return { token: fromRequest, source: "request" }
  if (requestOnly) throw new Error(NO_REQUEST_TOKEN)
  const fromEnv = getEnvToken()
  if (fromEnv) return { token: fromEnv, source: "env" }
  return { token: await loginToken(path, now), source: "login" }
}

export type AuthStatus =
  | { source: "request" | "env" }
  | { source: "login"; path: string; expiresAt: number; refreshable: boolean }
  | { source: "none"; path: string }

/** Что сейчас служит токеном — без самого токена и без обращения к сети. */
export async function getAuthStatus({
  path = getCredentialsPath()
}: Pick<ClockAndPath, "path"> = {}): Promise<AuthStatus> {
  if (requestToken.getStore()) return { source: "request" }
  if (requestOnly) return { source: "none", path }
  if (getEnvToken()) return { source: "env" }
  const credentials = await readCredentials(path)
  if (!credentials) return { source: "none", path }
  return { source: "login", path, expiresAt: credentials.expiresAt, refreshable: Boolean(credentials.refreshToken) }
}
