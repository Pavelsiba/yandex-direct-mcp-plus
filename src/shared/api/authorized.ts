// Обёртка запроса к Директу: берёт токен из источника и, если Директ его отверг (53),
// подменяет совет под этот источник — разбор ошибок про источник не знает.
import { AUTH_ERROR_CODE, authErrorMessage, DirectApiError } from "#shared/api/errors"
import { resolveToken } from "#shared/auth/token"

export async function withToken<T>(action: (token: string) => Promise<T>): Promise<T> {
  const { token, source } = await resolveToken()
  try {
    return await action(token)
  } catch (error) {
    if (error instanceof DirectApiError && error.code === AUTH_ERROR_CODE) {
      throw new DirectApiError(authErrorMessage(source), AUTH_ERROR_CODE, error.requestId)
    }
    throw error
  }
}
