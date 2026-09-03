// Чтение окружения. Токен читается на каждый запрос, а не при импорте модуля:
// иначе тест не смог бы подменить его между кейсами, а сервер — стартовать без него.

export function isSandbox(): boolean {
  const flag = process.env.YANDEX_DIRECT_SANDBOX
  return flag === "1" || flag === "true"
}

export function getToken(): string {
  const token = process.env.YANDEX_DIRECT_TOKEN
  if (!token) {
    throw new Error("Переменная окружения YANDEX_DIRECT_TOKEN не задана")
  }
  return token
}

// Client-Login обязателен для агентских токенов.
// Док: https://yandex.ru/dev/direct/doc/en/concepts/headers
export function getClientLogin(): string | undefined {
  return process.env.YANDEX_DIRECT_LOGIN
}
