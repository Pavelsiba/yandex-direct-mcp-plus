import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { readCredentials, writeCredentials } from "#shared/auth/credentials"
import { resetPendingLogin } from "#shared/auth/login"
import { OAUTH_CLIENT_ID } from "#shared/config/endpoints"
import { getCredentialsPath } from "#shared/config/env"
import { installFetchMock, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleAuthStatus, handleFinishLogin, handleLogout, handleStartLogin } from "./handler.js"

installFetchMock()

const NOW = Date.UTC(2026, 10, 1)
let dir: string

beforeEach(async () => {
  mockFetch.mockReset()
  resetPendingLogin()
  delete process.env.YANDEX_DIRECT_TOKEN
  dir = await mkdtemp(join(tmpdir(), "yd-mcp-auth-tool-"))
  process.env.XDG_CONFIG_HOME = dir
})

afterEach(async () => {
  process.env.YANDEX_DIRECT_TOKEN = "test-token"
  delete process.env.XDG_CONFIG_HOME
  await rm(dir, { recursive: true, force: true })
})

describe("start_login и finish_login", () => {
  it("ссылка, затем код — вход сохранён, токена в ответе нет", async () => {
    const started = await handleStartLogin()
    expect(started).toContain(`https://oauth.yandex.ru/authorize?response_type=code&client_id=${OAUTH_CLIENT_ID}`)
    expect(started).toContain("finish_login")

    mockFetch.mockResolvedValueOnce(
      okResponse({ access_token: "secret-access", refresh_token: "secret-refresh", expires_in: 31_536_000 })
    )
    const finished = await handleFinishLogin({ code: "1234567" })

    expect(finished).toContain("Вход выполнен")
    expect(finished).not.toContain("secret")
    expect((await readCredentials(getCredentialsPath()))?.accessToken).toBe("secret-access")
  })

  it("предупреждает, что переменная окружения перекроет вход из диалога", async () => {
    process.env.YANDEX_DIRECT_TOKEN = "env-token"

    expect(await handleStartLogin()).toContain("уберите её")
  })
})

describe("auth_status", () => {
  it("без токена подсказывает, как подключиться", async () => {
    expect(await handleAuthStatus({}, NOW)).toMatch(/Не подключено.*start_login/)
  })

  it("для токена из окружения не упоминает файл", async () => {
    process.env.YANDEX_DIRECT_TOKEN = "env-token"

    expect(await handleAuthStatus({}, NOW)).toContain("YANDEX_DIRECT_TOKEN")
  })

  it("для сохранённого входа называет срок и обновляемость", async () => {
    await writeCredentials(getCredentialsPath(), {
      clientId: OAUTH_CLIENT_ID,
      accessToken: "secret-access",
      refreshToken: "secret-refresh",
      expiresAt: Date.UTC(2027, 10, 1)
    })

    const status = await handleAuthStatus({}, NOW)

    expect(status).toContain("действует до 2027-11-01, обновится сам")
    expect(status).not.toContain("secret")
  })

  it("истёкший вход без refresh_token называет истёкшим", async () => {
    await writeCredentials(getCredentialsPath(), {
      clientId: OAUTH_CLIENT_ID,
      accessToken: "secret-access",
      expiresAt: NOW - 1
    })

    expect(await handleAuthStatus({}, NOW)).toContain("срок истёк 2026-10-31, обновить нельзя")
  })
})

describe("logout", () => {
  it("удаляет сохранённый вход", async () => {
    const path = getCredentialsPath()
    await writeCredentials(path, { clientId: OAUTH_CLIENT_ID, accessToken: "a", expiresAt: NOW })

    expect(await handleLogout({}, path)).toContain("Сохранённый вход удалён")
    expect(await readCredentials(path)).toBeUndefined()
  })

  it("без входа говорит, что удалять нечего, и не падает", async () => {
    expect(await handleLogout({}, getCredentialsPath())).toContain("Сохранённого входа не было")
  })
})
