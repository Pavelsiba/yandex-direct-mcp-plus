// Удалённый вход для одного владельца: настройки HTTP-сервера и проверка его секрета.
// Чистые функции — окружение и запрос приходят параметрами, сеть их не касается.
import { createHash, timingSafeEqual } from "node:crypto"

export type HttpConfig = {
  readonly secret: string
  readonly port: number
  readonly host: string
  readonly allowedHosts: readonly string[]
}

// Короче — подбирается: секрет даёт право менять ставки и бюджеты боевого аккаунта.
const SECRET_MIN_LENGTH = 32
const DEFAULT_PORT = 3000
const LOCALHOST = ["localhost", "127.0.0.1", "[::1]"]

const MCP_PATH = "/mcp"
const HEALTH_PATH = "/health"

export function readHttpConfig(env: Record<string, string | undefined>): HttpConfig {
  const secret = env.YD_MCP_SECRET ?? ""
  if (secret.length < SECRET_MIN_LENGTH) {
    throw new Error(
      `YD_MCP_SECRET не задан или короче ${SECRET_MIN_LENGTH} символов: без секрета удалённый сервер не запускается. ` +
        "Сгенерировать: openssl rand -hex 32"
    )
  }

  const port = env.YD_MCP_PORT ? Number(env.YD_MCP_PORT) : DEFAULT_PORT
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`YD_MCP_PORT — номер порта от 1 до 65535, получено: ${env.YD_MCP_PORT}`)
  }

  // Пустой список хостов — только localhost: наружу сервер открывается явным решением.
  const allowedHosts = (env.YD_MCP_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)

  return {
    secret,
    port,
    host: env.YD_MCP_HOST || "127.0.0.1",
    allowedHosts: allowedHosts.length > 0 ? allowedHosts : LOCALHOST
  }
}

export type Route = { kind: "mcp"; pathSecret?: string } | { kind: "health" } | { kind: "unknown" }

// Секрет в пути — для коннекторов claude.ai и Claude Desktop: им заголовок не задать.
export function matchRoute(pathname: string): Route {
  if (pathname === HEALTH_PATH) return { kind: "health" }
  if (pathname === MCP_PATH) return { kind: "mcp" }

  const prefix = `${MCP_PATH}/`
  if (pathname.startsWith(prefix)) {
    const rest = pathname.slice(prefix.length)
    if (rest && !rest.includes("/")) {
      const pathSecret = safeDecode(rest)
      if (pathSecret !== undefined) return { kind: "mcp", pathSecret }
    }
  }
  return { kind: "unknown" }
}

function safeDecode(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment)
  } catch {
    return undefined
  }
}

function bearerToken(authorization: string | undefined): string | undefined {
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  return match?.[1].trim()
}

// Сравниваются хэши, а не строки: timingSafeEqual требует равной длины, и длина секрета
// иначе утекала бы по времени ответа.
function sameSecret(presented: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest()
  return timingSafeEqual(digest(presented), digest(expected))
}

export function isAuthorized(
  route: { pathSecret?: string },
  authorization: string | undefined,
  expected: string
): boolean {
  const presented = route.pathSecret ?? bearerToken(authorization)
  return presented !== undefined && sameSecret(presented, expected)
}
