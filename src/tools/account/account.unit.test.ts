// biome-ignore-all lint/plugin: тест разбирает тело запроса
import { beforeEach, describe, expect, it } from "vitest"
import { installFetchMock, lastRawBody, lastRequestUrl, mockFetch, okResponse } from "#testing/fetch-mock"
import { handleGetAccountBalance } from "./handler.js"

installFetchMock()

function lastBody() {
  return JSON.parse(lastRawBody())
}

describe("get_account_balance", () => {
  beforeEach(() => {
    mockFetch.mockReset()
    delete process.env.YANDEX_DIRECT_LOGIN
  })

  it("идёт в Live API v4 и кладёт токен в тело, а не в заголовок", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ data: { Accounts: [] } }))

    await handleGetAccountBalance({})

    expect(lastRequestUrl()).toContain("/live/v4/json/")
    expect(lastBody()).toEqual({ method: "AccountManagement", token: "test-token", param: { Action: "Get" } })
  })

  it("подставляет логин из окружения, когда логины не переданы", async () => {
    process.env.YANDEX_DIRECT_LOGIN = "agency-client"
    mockFetch.mockResolvedValueOnce(okResponse({ data: { Accounts: [] } }))

    await handleGetAccountBalance({})

    expect(lastBody().param.SelectionCriteria).toEqual({ Logins: ["agency-client"] })
  })

  it("отдаёт предпочтение явно переданным логинам", async () => {
    process.env.YANDEX_DIRECT_LOGIN = "agency-client"
    mockFetch.mockResolvedValueOnce(okResponse({ data: { Accounts: [] } }))

    await handleGetAccountBalance({ logins: ["another-client"] })

    expect(lastBody().param.SelectionCriteria).toEqual({ Logins: ["another-client"] })
  })

  it("не делит баланс на миллион: v4 присылает сумму в валюте аккаунта", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ data: { Accounts: [{ Amount: 1234.56 }] } }))

    const output = await handleGetAccountBalance({})

    expect(JSON.parse(output).data.Accounts[0].Amount).toBe(1234.56)
  })

  it("сообщает об ошибке v4, пришедшей телом", async () => {
    mockFetch.mockResolvedValueOnce(okResponse({ error_code: 54, error_str: "Нет прав на аккаунт" }))

    await expect(handleGetAccountBalance({})).rejects.toThrow("Ошибка API v4 [54]")
  })
})
