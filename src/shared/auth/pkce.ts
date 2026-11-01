// PKCE (RFC 7636, S256) и ссылка на вход. Verifier не покидает процесс: без него код из чата
// на токен не меняется, поэтому показывать код в диалоге безопасно.
import { createHash, randomBytes } from "node:crypto"
import { OAUTH_AUTHORIZE_URL, OAUTH_REDIRECT_URI } from "#shared/config/endpoints"

export type PkcePair = { verifier: string; challenge: string }

// 48 байт дают 64 символа base64url — середина допустимых 43–128.
export function createPkcePair(random: (size: number) => Buffer = randomBytes): PkcePair {
  const verifier = random(48).toString("base64url")
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") }
}

export function buildAuthorizeUrl(clientId: string, challenge: string): string {
  const url = new URL(OAUTH_AUTHORIZE_URL)
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: "S256",
    // Без него Яндекс молча входит под уже открытым в браузере аккаунтом — а он бывает не тем.
    force_confirm: "yes"
  }).toString()
  return url.toString()
}
