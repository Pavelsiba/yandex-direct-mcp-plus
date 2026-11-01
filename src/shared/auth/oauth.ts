// Обмен с oauth.yandex.ru/token: код → пара токенов и обновление по refresh_token.
// Публичный клиент: client_secret не нужен ни там, ни там.
import { z } from "zod"
import { sendOnce } from "#shared/api/fetch"
import { parseJson } from "#shared/api/json"
import type { Credentials } from "#shared/auth/credentials"
import { OAUTH_TOKEN_URL } from "#shared/config/endpoints"

const tokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number()
})

const errorResponseSchema = z.object({ error: z.string(), error_description: z.string().optional() })

const RESTART_LOGIN = "Начните вход заново: start_login, затем finish_login с новым кодом."

type Grant = "code" | "refresh"

const BAD_CODE = `Код не подошёл: опечатка, истёк или уже использован. Проверьте код; если он верный — ${RESTART_LOGIN}`

// Текст адресован модели: что случилось и что делать, а не код OAuth.
const OAUTH_ERROR_ADVICE: Record<Grant, Record<string, string>> = {
  code: { invalid_grant: BAD_CODE, bad_verification_code: BAD_CODE },
  refresh: {
    invalid_grant: `Сохранённый вход больше не действует: доступ отозван в Яндекс ID или истёк. ${RESTART_LOGIN}`
  }
}

/** Совет по коду ошибки OAuth; для незнакомого кода — `undefined`. */
const getOAuthErrorAdvice = (grant: Grant, error: string): string | undefined => OAUTH_ERROR_ADVICE[grant][error]

async function requestToken(grant: Grant, params: Record<string, string>) {
  const response = await sendOnce(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString()
  })
  const body = await response.text()
  let data: unknown
  try {
    data = parseJson(body)
  } catch {
    throw new Error(`Яндекс OAuth ответил не JSON (HTTP ${response.status}). Повторите позже.`)
  }

  const failure = errorResponseSchema.safeParse(data)
  if (!response.ok || failure.success) {
    const { error = `HTTP ${response.status}`, error_description: description } = failure.data ?? {}
    const advice = getOAuthErrorAdvice(grant, error)
    const reason = description ? `${error}: ${description}` : error
    throw new Error(`Яндекс OAuth отказал (${reason}).${advice ? ` ${advice}` : ""}`)
  }

  const parsed = tokenResponseSchema.safeParse(data)
  if (!parsed.success) throw new Error("Яндекс OAuth вернул ответ без access_token. Повторите позже.")
  return parsed.data
}

function toCredentials(
  clientId: string,
  token: z.infer<typeof tokenResponseSchema>,
  now: number,
  previousRefresh?: string
): Credentials {
  return {
    clientId,
    accessToken: token.access_token,
    // Яндекс может не прислать новый refresh_token при обновлении — тогда жив прежний.
    refreshToken: token.refresh_token ?? previousRefresh,
    expiresAt: now + token.expires_in * 1000
  }
}

export async function exchangeCode(
  { clientId, code, verifier }: { clientId: string; code: string; verifier: string },
  now: number
): Promise<Credentials> {
  const token = await requestToken("code", {
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    code_verifier: verifier
  })
  return toCredentials(clientId, token, now)
}

export async function refreshCredentials(credentials: Credentials, now: number): Promise<Credentials> {
  const { clientId, refreshToken } = credentials
  if (!refreshToken) throw new Error(`Срок сохранённого входа истёк. ${RESTART_LOGIN}`)
  const token = await requestToken("refresh", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId
  })
  return toCredentials(clientId, token, now, refreshToken)
}
