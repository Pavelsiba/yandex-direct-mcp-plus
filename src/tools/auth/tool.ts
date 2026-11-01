import { DESTRUCTIVE, defineTool, IDEMPOTENT, READ, WRITE } from "#shared/lib/tool"
import { handleAuthStatus, handleFinishLogin, handleLogout, handleStartLogin } from "./handler.js"
import { authStatusSchema, finishLoginSchema, logoutSchema, startLoginSchema } from "./schema.js"

export const startLoginTool = defineTool({
  name: "start_login",
  title: "Вход в Яндекс.Директ: ссылка",
  description:
    "Первый шаг входа из диалога, без ручного токена: возвращает ссылку на вход в Яндекс. Ссылку показать пользователю, код со страницы Яндекса передать в finish_login. Повторный вызов делает прежнюю ссылку недействительной.",
  annotations: IDEMPOTENT,
  schema: startLoginSchema,
  handler: handleStartLogin
})

export const finishLoginTool = defineTool({
  name: "finish_login",
  title: "Вход в Яндекс.Директ: код",
  description:
    "Второй шаг входа: меняет код подтверждения от пользователя на токен и сохраняет его на этом компьютере. Токен в ответ не попадает.",
  annotations: WRITE,
  schema: finishLoginSchema,
  handler: handleFinishLogin
})

export const authStatusTool = defineTool({
  name: "auth_status",
  title: "Подключение к Директу",
  description:
    "Откуда сервер берёт токен (переменная окружения, вход из диалога или запрос) и до когда он действует. В сеть не ходит, баллов не тратит.",
  annotations: READ,
  schema: authStatusSchema,
  handler: handleAuthStatus
})

export const logoutTool = defineTool({
  name: "logout",
  title: "Выход из Директа",
  description:
    "Удаляет сохранённый вход из диалога с этого компьютера. Переменную YANDEX_DIRECT_TOKEN не трогает; доступ приложения отзывается в Яндекс ID.",
  annotations: DESTRUCTIVE,
  schema: logoutSchema,
  handler: handleLogout
})
