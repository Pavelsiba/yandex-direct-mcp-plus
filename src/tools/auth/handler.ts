// Вход из диалога: ссылка → код от пользователя → сохранённая пара токенов.
// Ни один ответ не содержит токена — только откуда он берётся и до когда действует.
import type { z } from "zod"
import { deleteCredentials } from "#shared/auth/credentials"
import { finishLogin, startLogin } from "#shared/auth/login"
import { type AuthStatus, getAuthStatus } from "#shared/auth/token"
import { getCredentialsPath } from "#shared/config/env"
import type { finishLoginSchema } from "./schema.js"

const formatDate = (epochMs: number): string => new Date(epochMs).toISOString().slice(0, 10)

const ENV_WINS =
  "Пока задана переменная YANDEX_DIRECT_TOKEN, запросы идут с ней, а не с сохранённым входом: уберите её из конфигурации MCP-клиента, чтобы работал вход из диалога."

export async function handleStartLogin(): Promise<string> {
  const url = startLogin()
  const status = await getAuthStatus()
  return [
    "Покажите пользователю ссылку и попросите войти под аккаунтом Яндекса, у которого есть доступ к нужному кабинету Директа:",
    url,
    "После входа Яндекс покажет код подтверждения — его нужно прислать в чат и передать в finish_login.",
    ...(status.source === "env" ? [ENV_WINS] : [])
  ].join("\n")
}

export async function handleFinishLogin({ code }: z.infer<typeof finishLoginSchema>): Promise<string> {
  const { path, expiresAt } = await finishLogin(code)
  const status = await getAuthStatus()
  return [
    `Вход выполнен. Токен сохранён в ${path} и действует до ${formatDate(expiresAt)}; обновляется сам.`,
    ...(status.source === "env" ? [ENV_WINS] : [])
  ].join("\n")
}

const getStatusText = (status: AuthStatus, now: number): string => {
  switch (status.source) {
    case "request":
      return "Токен передан вместе с запросом (удалённый сервер)."
    case "env":
      return "Токен из переменной окружения YANDEX_DIRECT_TOKEN. Сохранённый вход, если он есть, не используется."
    case "none":
      return "Не подключено: токена нет. Войдите через start_login или задайте YANDEX_DIRECT_TOKEN."
    case "login": {
      const expired = status.expiresAt <= now
      const renewal = status.refreshable ? "обновится сам" : "обновить нельзя — понадобится новый вход"
      const term = expired
        ? `срок истёк ${formatDate(status.expiresAt)}`
        : `действует до ${formatDate(status.expiresAt)}`
      return `Вход из диалога, файл ${status.path}: ${term}, ${renewal}.`
    }
  }
}

// Первым аргументом SDK передаёт параметры вызова, поэтому часы и путь — вторыми.
export async function handleAuthStatus(_params: unknown, now: number = Date.now()): Promise<string> {
  return getStatusText(await getAuthStatus(), now)
}

export async function handleLogout(_params: unknown, path: string = getCredentialsPath()): Promise<string> {
  const removed = await deleteCredentials(path)
  const status = await getAuthStatus({ path })
  return [
    removed ? `Сохранённый вход удалён (${path}).` : "Сохранённого входа не было.",
    "Отозвать сам доступ приложения можно в Яндекс ID → «Устройства, сервисы и пароли».",
    ...(status.source === "env" ? ["Переменная YANDEX_DIRECT_TOKEN по-прежнему задана — запросы идут с ней."] : [])
  ].join("\n")
}
