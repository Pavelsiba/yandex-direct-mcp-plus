import { describe, expect, it } from "vitest"
import { isAuthorized, matchRoute, readHttpConfig } from "#app/http-access"

const SECRET = "s".repeat(32)

describe("настройки удалённого сервера", () => {
  it("не запускается без секрета или с коротким секретом", () => {
    expect(() => readHttpConfig({})).toThrow("YD_MCP_SECRET")
    expect(() => readHttpConfig({ YD_MCP_SECRET: "s".repeat(31) })).toThrow("короче 32")
  })

  it("по умолчанию слушает localhost и пускает только localhost", () => {
    const config = readHttpConfig({ YD_MCP_SECRET: SECRET })

    expect(config).toEqual({
      secret: SECRET,
      port: 3000,
      host: "127.0.0.1",
      allowedHosts: ["localhost", "127.0.0.1", "[::1]"]
    })
  })

  it("берёт порт, адрес и список хостов из окружения", () => {
    const config = readHttpConfig({
      YD_MCP_SECRET: SECRET,
      YD_MCP_PORT: "8080",
      YD_MCP_HOST: "0.0.0.0",
      YD_MCP_ALLOWED_HOSTS: " MCP.example.ru , localhost,"
    })

    expect(config).toMatchObject({ port: 8080, host: "0.0.0.0", allowedHosts: ["mcp.example.ru", "localhost"] })
  })

  it("отклоняет порт вне диапазона", () => {
    expect(() => readHttpConfig({ YD_MCP_SECRET: SECRET, YD_MCP_PORT: "70000" })).toThrow("YD_MCP_PORT")
    expect(() => readHttpConfig({ YD_MCP_SECRET: SECRET, YD_MCP_PORT: "порт" })).toThrow("YD_MCP_PORT")
  })
})

describe("маршруты", () => {
  it("различает вход MCP, вход с секретом в пути и проверку живости", () => {
    expect(matchRoute("/mcp")).toEqual({ kind: "mcp" })
    expect(matchRoute("/mcp/abc%2Bdef")).toEqual({ kind: "mcp", pathSecret: "abc+def" })
    expect(matchRoute("/health")).toEqual({ kind: "health" })
  })

  it("не принимает лишних сегментов и битых кодов в пути", () => {
    expect(matchRoute("/mcp/a/b")).toEqual({ kind: "unknown" })
    expect(matchRoute("/mcp/%E0%A4%A")).toEqual({ kind: "unknown" })
    expect(matchRoute("/")).toEqual({ kind: "unknown" })
  })
})

describe("проверка секрета", () => {
  it("пускает по заголовку Bearer и по секрету в пути", () => {
    expect(isAuthorized({}, `Bearer ${SECRET}`, SECRET)).toBe(true)
    expect(isAuthorized({}, `bearer   ${SECRET}`, SECRET)).toBe(true)
    expect(isAuthorized({ pathSecret: SECRET }, undefined, SECRET)).toBe(true)
  })

  it("не пускает без секрета, с чужим секретом и с иной схемой авторизации", () => {
    expect(isAuthorized({}, undefined, SECRET)).toBe(false)
    expect(isAuthorized({}, "Bearer чужой", SECRET)).toBe(false)
    expect(isAuthorized({}, `Basic ${SECRET}`, SECRET)).toBe(false)
  })

  it("при секрете в пути не подменяет его заголовком", () => {
    expect(isAuthorized({ pathSecret: "чужой" }, `Bearer ${SECRET}`, SECRET)).toBe(false)
  })
})
