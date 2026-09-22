// Предпросмотр записи: внутри runDryRun пишущий запрос не уходит в Директ, а откладывается.
// Контекст — AsyncLocalStorage, чтобы хендлеры не знали о режиме и не передавали флаг вниз.
import { AsyncLocalStorage } from "node:async_hooks"

export type HeldRequest = {
  service: string
  method: string
  params: Record<string, unknown>
}

// Всё, чего здесь нет, считается записью: незнакомый метод безопаснее придержать, чем отправить.
const READ_METHODS = new Set([
  "get",
  "getGeoRegions",
  "check",
  "checkCampaigns",
  "checkDictionaries",
  "hasSearchVolume"
])

// Ответ-заглушка вместо настоящего: хендлер доходит до конца и не спотыкается о пустоту.
const HELD_RESPONSE = { result: {} }

const heldRequests = new AsyncLocalStorage<HeldRequest[]>()

export async function runDryRun<T>(action: () => Promise<T>): Promise<{ output: T; requests: HeldRequest[] }> {
  const requests: HeldRequest[] = []
  const output = await heldRequests.run(requests, action)
  return { output, requests }
}

// Ответ-заглушка, если запрос отложен; undefined — запрос надо отправить.
export function holdWrite(service: string, method: string, params: Record<string, unknown>): unknown {
  const requests = heldRequests.getStore()
  if (!requests || READ_METHODS.has(method)) return undefined

  requests.push({ service, method, params })
  return HELD_RESPONSE
}
