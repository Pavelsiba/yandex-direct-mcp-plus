// Транспорт: заголовки, повторы, таймаут. Знает про HTTP и токен, не знает про домен.
import { getClientLogin, getToken } from "#shared/config/env"
import { MAX_RETRIES, MAX_RETRY_DELAY_MS, REQUEST_TIMEOUT_MS } from "#shared/config/limits"

export function commonHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
    "Accept-Language": "ru"
  }
  const clientLogin = getClientLogin()
  if (clientLogin) headers["Client-Login"] = clientLogin
  return headers
}

// Units = «израсходовано/остаток/суточный лимит» баллов API. В stdout писать нельзя —
// там транспорт MCP, поэтому stderr.
export function logUnits(response: Response): void {
  const units = response.headers?.get?.("Units")
  if (units) console.error(`[yd-mcp] Баллы API (потрачено/остаток/лимит): ${units}`)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type Transport = (url: string, options: RequestInit) => Promise<Response>

// Шов для тестов. Раньше они подменяли globalThis.fetch — глобал один на процесс, и
// подмена задевала всё, что в нём живёт, включая SDK. Здесь шов свой, объявлен типом
// и виден в коде; сеть трогает единственная строка ниже.
let transport: Transport = (url, options) => fetch(url, options)

export function setTransport(next: Transport): void {
  transport = next
}

export async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await transport(url, { ...options, signal: controller.signal })
      clearTimeout(timer)

      if (response.ok) return response

      if (response.status >= 500 && attempt < retries) {
        const backoff = Math.min(1000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS)
        console.error(`[yd-mcp] ${response.status} от ${url}, повтор через ${backoff}мс (${attempt}/${retries})`)
        await delay(backoff)
        continue
      }

      const body = await response.text().catch(() => "")
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${body}`)
    } catch (error) {
      clearTimeout(timer)
      if (attempt === retries) throw error
      if (error instanceof DOMException && error.name === "AbortError") {
        console.error(`[yd-mcp] Таймаут ${url}, повтор (${attempt}/${retries})`)
        continue
      }
      throw error
    }
  }
  throw new Error("Все попытки исчерпаны")
}
