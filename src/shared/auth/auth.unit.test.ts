import { createHash } from "node:crypto"
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { apiPost } from "#shared/api/client"
import { type Credentials, deleteCredentials, readCredentials, writeCredentials } from "#shared/auth/credentials"
import { finishLogin, resetPendingLogin, startLogin } from "#shared/auth/login"
import { buildAuthorizeUrl, createPkcePair } from "#shared/auth/pkce"
import { getAuthStatus, requireRequestToken, resolveToken, runWithToken } from "#shared/auth/token"
import { OAUTH_CLIENT_ID } from "#shared/config/endpoints"
import { getCredentialsPath } from "#shared/config/env"
import {
  errorResponse,
  installFetchMock,
  lastRawBody,
  lastRequestUrl,
  mockFetch,
  okResponse
} from "#testing/fetch-mock"

installFetchMock()

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 1)
const fixedRandom = (size: number) => Buffer.alloc(size, 7)

let dir: string
let path: string

const saved = (overrides: Partial<Credentials> = {}): Credentials => ({
  clientId: OAUTH_CLIENT_ID,
  accessToken: "saved-access",
  refreshToken: "saved-refresh",
  expiresAt: NOW + 30 * DAY,
  ...overrides
})

const tokenResponse = (access: string, refresh?: string) =>
  okResponse({ access_token: access, refresh_token: refresh, expires_in: 31_536_000, token_type: "bearer" })

const lastForm = () => Object.fromEntries(new URLSearchParams(lastRawBody()))

beforeEach(async () => {
  mockFetch.mockReset()
  resetPendingLogin()
  delete process.env.YANDEX_DIRECT_TOKEN
  dir = await mkdtemp(join(tmpdir(), "yd-mcp-auth-"))
  process.env.XDG_CONFIG_HOME = dir
  path = getCredentialsPath()
})

afterEach(async () => {
  process.env.YANDEX_DIRECT_TOKEN = "test-token"
  delete process.env.XDG_CONFIG_HOME
  await rm(dir, { recursive: true, force: true })
})

describe("PKCE", () => {
  it("challenge — SHA-256 от verifier в base64url", () => {
    const { verifier, challenge } = createPkcePair(fixedRandom)

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{64}$/)
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"))
  })

  it("ссылка ведёт на страницу кода Яндекса и просит подтвердить аккаунт", () => {
    const url = new URL(buildAuthorizeUrl("client", "challenge"))

    expect(`${url.origin}${url.pathname}`).toBe("https://oauth.yandex.ru/authorize")
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: "client",
      redirect_uri: "https://oauth.yandex.ru/verification_code",
      code_challenge: "challenge",
      code_challenge_method: "S256",
      force_confirm: "yes"
    })
  })
})

describe("файл входа", () => {
  it("переживает запись и чтение, каталог создаётся сам", async () => {
    await writeCredentials(path, saved())

    expect(await readCredentials(path)).toEqual(saved())
  })

  it.skipIf(process.platform === "win32")("доступен только владельцу", async () => {
    await writeCredentials(path, saved())

    expect((await stat(path)).mode & 0o777).toBe(0o600)
  })

  it("отсутствие файла — не ошибка, а отсутствие входа", async () => {
    expect(await readCredentials(path)).toBeUndefined()
    expect(await deleteCredentials(path)).toBe(false)
  })

  it("повреждённый файл называет путь и как войти заново", async () => {
    await writeCredentials(path, saved())
    await writeFile(path, "{не json")

    await expect(readCredentials(path)).rejects.toThrow(/повреждён.*start_login/)
  })

  it("удаление убирает файл", async () => {
    await writeCredentials(path, saved())

    expect(await deleteCredentials(path)).toBe(true)
    expect(await readCredentials(path)).toBeUndefined()
  })
})

describe("источник токена", () => {
  it("без токена и без входа объясняет оба способа подключиться", async () => {
    await expect(resolveToken({ now: NOW, path })).rejects.toThrow(/start_login.*YANDEX_DIRECT_TOKEN/)
  })

  it("переменная окружения главнее сохранённого входа", async () => {
    await writeCredentials(path, saved())
    process.env.YANDEX_DIRECT_TOKEN = "env-token"

    expect(await resolveToken({ now: NOW, path })).toEqual({ token: "env-token", source: "env" })
  })

  it("токен запроса главнее переменной окружения", async () => {
    process.env.YANDEX_DIRECT_TOKEN = "env-token"

    const resolved = await runWithToken("user-token", () => resolveToken({ now: NOW, path }))

    expect(resolved).toEqual({ token: "user-token", source: "request" })
  })

  describe("режим «только токен запроса»", () => {
    afterEach(() => requireRequestToken(false))

    it("не откатывается к окружению и файлу входа", async () => {
      await writeCredentials(path, saved())
      process.env.YANDEX_DIRECT_TOKEN = "env-token"
      requireRequestToken()

      await expect(resolveToken({ now: NOW, path })).rejects.toThrow(/runWithToken не вызван/)
      expect(await getAuthStatus({ path })).toEqual({ source: "none", path })
    })

    it("берёт токен запроса", async () => {
      requireRequestToken()

      const resolved = await runWithToken("user-token", () => resolveToken({ now: NOW, path }))

      expect(resolved).toEqual({ token: "user-token", source: "request" })
    })
  })

  it("свежий сохранённый вход отдаётся без обращения к сети", async () => {
    await writeCredentials(path, saved())

    expect(await resolveToken({ now: NOW, path })).toEqual({ token: "saved-access", source: "login" })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("за сутки до истечения обновляет токен по refresh_token без client_secret и сохраняет", async () => {
    await writeCredentials(path, saved({ expiresAt: NOW + DAY / 2 }))
    mockFetch.mockResolvedValueOnce(tokenResponse("fresh-access", "fresh-refresh"))

    expect((await resolveToken({ now: NOW, path })).token).toBe("fresh-access")
    expect(lastRequestUrl()).toBe("https://oauth.yandex.ru/token")
    expect(lastForm()).toEqual({
      grant_type: "refresh_token",
      refresh_token: "saved-refresh",
      client_id: OAUTH_CLIENT_ID
    })
    expect(await readCredentials(path)).toEqual({
      clientId: OAUTH_CLIENT_ID,
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
      expiresAt: NOW + 31_536_000_000
    })
  })

  it("без нового refresh_token в ответе сохраняет прежний", async () => {
    await writeCredentials(path, saved({ expiresAt: NOW - 1 }))
    mockFetch.mockResolvedValueOnce(tokenResponse("fresh-access"))

    await resolveToken({ now: NOW, path })

    expect((await readCredentials(path))?.refreshToken).toBe("saved-refresh")
  })

  it("параллельные запросы обновляют токен один раз", async () => {
    await writeCredentials(path, saved({ expiresAt: NOW - 1 }))
    mockFetch.mockResolvedValue(tokenResponse("fresh-access", "fresh-refresh"))

    const tokens = await Promise.all([resolveToken({ now: NOW, path }), resolveToken({ now: NOW, path })])

    expect(tokens.map((resolved) => resolved.token)).toEqual(["fresh-access", "fresh-access"])
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("неудачное обновление до истечения срока не мешает работать на прежнем токене", async () => {
    await writeCredentials(path, saved({ expiresAt: NOW + DAY / 2 }))
    mockFetch.mockResolvedValueOnce(errorResponse(500, '{"error":"server_error"}'))

    expect((await resolveToken({ now: NOW, path })).token).toBe("saved-access")
  })

  it("отозванный refresh_token после истечения срока отправляет входить заново", async () => {
    await writeCredentials(path, saved({ expiresAt: NOW - 1 }))
    mockFetch.mockResolvedValueOnce(
      errorResponse(400, '{"error":"invalid_grant","error_description":"Invalid refresh token"}')
    )

    await expect(resolveToken({ now: NOW, path })).rejects.toThrow(/invalid_grant.*отозван.*start_login/)
  })

  it("истёкший вход без refresh_token не идёт в сеть", async () => {
    await writeCredentials(path, saved({ expiresAt: NOW - 1, refreshToken: undefined }))

    await expect(resolveToken({ now: NOW, path })).rejects.toThrow(/истёк.*start_login/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("статус называет источник и срок, но не токен", async () => {
    await writeCredentials(path, saved())

    const status = await getAuthStatus({ path })

    expect(status).toEqual({ source: "login", path, expiresAt: NOW + 30 * DAY, refreshable: true })
  })
})

describe("вход из диалога", () => {
  it("меняет код на токен с verifier, чей challenge ушёл в ссылку", async () => {
    const challenge = new URL(startLogin(fixedRandom)).searchParams.get("code_challenge")
    mockFetch.mockResolvedValueOnce(tokenResponse("new-access", "new-refresh"))

    const result = await finishLogin("1234567", { now: NOW, path })

    const form = lastForm()
    expect(form).toMatchObject({ grant_type: "authorization_code", code: "1234567", client_id: OAUTH_CLIENT_ID })
    expect(form).not.toHaveProperty("client_secret")
    expect(
      createHash("sha256")
        .update(form.code_verifier ?? "")
        .digest("base64url")
    ).toBe(challenge)
    expect(result).toEqual({ path, expiresAt: NOW + 31_536_000_000 })
    expect((await readCredentials(path))?.accessToken).toBe("new-access")
  })

  it("без start_login не идёт в сеть", async () => {
    await expect(finishLogin("1234567", { now: NOW, path })).rejects.toThrow(/start_login/)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("после неверного кода можно прислать верный, не начиная заново", async () => {
    startLogin(fixedRandom)
    mockFetch
      .mockResolvedValueOnce(errorResponse(400, '{"error":"invalid_grant","error_description":"Code has expired"}'))
      .mockResolvedValueOnce(tokenResponse("new-access", "new-refresh"))

    await expect(finishLogin("0000000", { now: NOW, path })).rejects.toThrow(/Код не подошёл/)
    await finishLogin("1234567", { now: NOW, path })

    expect(await readCredentials(path)).toBeDefined()
  })

  it("успешный вход гасит verifier: второй finish_login требует нового start_login", async () => {
    startLogin(fixedRandom)
    mockFetch.mockResolvedValueOnce(tokenResponse("new-access", "new-refresh"))
    await finishLogin("1234567", { now: NOW, path })

    await expect(finishLogin("1234567", { now: NOW, path })).rejects.toThrow(/start_login/)
  })
})

describe("ошибка 53 по источнику токена", () => {
  const authFailure = () => okResponse({ error: { error_code: 53, error_string: "Ошибка авторизации" } })

  it("для токена из окружения советует заменить переменную", async () => {
    process.env.YANDEX_DIRECT_TOKEN = "env-token"
    mockFetch.mockResolvedValueOnce(authFailure())

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/взят из YANDEX_DIRECT_TOKEN/)
  })

  it("для токена запроса отправляет обновлять его туда, откуда он пришёл", async () => {
    mockFetch.mockResolvedValueOnce(authFailure())

    await expect(runWithToken("user-token", () => apiPost("campaigns", "get"))).rejects.toThrow(
      /передан вместе с запросом/
    )
  })

  it("уходит в Директ с токеном запроса в заголовке", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ result: {} }))

    await runWithToken("user-token", () => apiPost("campaigns", "get"))

    expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer user-token")
  })

  it("для сохранённого входа отправляет входить заново", async () => {
    await writeCredentials(path, saved())
    mockFetch.mockResolvedValueOnce(authFailure())

    await expect(apiPost("campaigns", "get")).rejects.toThrow(/Сохранённый вход больше не действует.*start_login/)
  })

  it("файл входа не читается, пока токен приходит извне", async () => {
    await writeCredentials(path, saved())
    await writeFile(path, "мусор")
    process.env.YANDEX_DIRECT_TOKEN = "env-token"

    expect((await resolveToken({ now: NOW, path })).source).toBe("env")
  })
})
