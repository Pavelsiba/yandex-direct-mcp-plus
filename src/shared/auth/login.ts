// Вход из диалога в два шага. Verifier ждёт кода в памяти процесса: на диск он не пишется,
// и после перезапуска сервера вход начинается заново.
import { writeCredentials } from "#shared/auth/credentials"
import { exchangeCode } from "#shared/auth/oauth"
import { buildAuthorizeUrl, createPkcePair } from "#shared/auth/pkce"
import { OAUTH_CLIENT_ID } from "#shared/config/endpoints"
import { getCredentialsPath } from "#shared/config/env"

let pendingVerifier: string | undefined

/** Новая ссылка на вход; прежняя незавершённая попытка при этом теряет силу. */
export function startLogin(random?: (size: number) => Buffer): string {
  const { verifier, challenge } = createPkcePair(random)
  pendingVerifier = verifier
  return buildAuthorizeUrl(OAUTH_CLIENT_ID, challenge)
}

export async function finishLogin(
  code: string,
  // biome-ignore lint/plugin/determinism: параметр по умолчанию — шов, тест передаёт свои часы
  { now = Date.now(), path = getCredentialsPath() }: { now?: number; path?: string } = {}
): Promise<{ path: string; expiresAt: number }> {
  if (!pendingVerifier) {
    throw new Error(
      "Вход не начат: сначала start_login. Если ссылку уже открывали, сервер с тех пор перезапускался — начните заново."
    )
  }
  // При отказе verifier остаётся: опечатку в коде можно исправить, не начиная вход заново.
  const credentials = await exchangeCode({ clientId: OAUTH_CLIENT_ID, code, verifier: pendingVerifier }, now)
  await writeCredentials(path, credentials)
  pendingVerifier = undefined
  return { path, expiresAt: credentials.expiresAt }
}

// Только для тестов: состояние модуля между кейсами.
export function resetPendingLogin(): void {
  pendingVerifier = undefined
}
