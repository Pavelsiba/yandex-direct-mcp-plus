// biome-ignore-all lint/plugin: протокол хуков Claude Code, 64-битных ID здесь нет
// Запрет шелл-командам трогать секреты. Вызывается из .claude/settings.json на
// PreToolUse для Bash и PowerShell: читает JSON с stdin, смотрит на текст команды.
//
// Правило, которое этот файл лишь напоминает, а не заменяет: значение токена не
// читается и не печатается никогда, а сработавший запрет — повод остановиться и
// сказать пользователю, а не переписать команду. 05.09.2026 прежняя версия была
// обойдена заменой process.env на process["env"] плюс вырезка --env-file; обе дыры
// закрыты ниже.
//
// Проверяется текст команды, а не её действие: полной защиты такой хук дать не может.
// Настоящий барьер — правило в CLAUDE.md и deny на Read/Write в settings.json.

const RULES = [
  [/(?<![A-Za-z0-9_])\.env(?![A-Za-z0-9])/, "путь к файлу .env"],
  [/--env-file/, "флаг --env-file: файл окружения программе передаёт npm-скрипт, не команда"],
  [/process\s*(?:\.\s*env|\[\s*['"`]env)/, "обращение к process.env из команды"],
  [/\$env:/i, "обращение к $env: из PowerShell"],
  [/\bprintenv\b|Get-(?:ChildItem|Item|Content)\s+Env:/i, "перечисление переменных окружения"],
  [/YANDEX_DIRECT_TOKEN/, "имя переменной с OAuth-токеном"],
  [/\bdotenv\b/, "загрузка .env через dotenv"]
]

let input = ""
process.stdin.on("data", (chunk) => {
  input += chunk
})

process.stdin.on("end", () => {
  let command = ""
  try {
    command = JSON.parse(input).tool_input.command || ""
  } catch {
    // Разобрать не смогли — молчим: сломанный хук не должен глушить весь шелл.
    return
  }

  const hit = RULES.find(([pattern]) => pattern.test(command))
  if (!hit) return

  const reason =
    `Команда отклонена: ${hit[1]}. Секреты проекта не читаются и не печатаются — ` +
    `ни целиком, ни длиной, ни «только чтобы проверить». Обходить запрет другой формой ` +
    `записи, другой утилитой или флагом запрещено: скажи пользователю, что нужно, и ` +
    `попроси его самого. Правило — в CLAUDE.md, раздел «Секреты».`

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason
      }
    })
  )
})
