import { defineConfig } from "vitest/config"

// Два уровня, уровень зашит в имя файла:
//   *.unit.test.ts — без сети: fetch подменён, проверяем тело запроса и разбор ответа.
//   *.int.test.ts  — против песочницы Директа (YANDEX_DIRECT_SANDBOX=1), сеть настоящая.
// Пока существуют только unit; проект int заведён заранее, чтобы сетевые тесты нельзя
// было случайно подмешать в общий прогон.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          globals: true,
          environment: "node",
          include: ["src/**/*.unit.test.ts"]
        }
      },
      {
        test: {
          name: "int",
          globals: true,
          environment: "node",
          include: ["src/**/*.int.test.ts"],
          // Песочница одна на прогон, параллельные файлы мешали бы друг другу.
          fileParallelism: false
        }
      }
    ],
    // Негативные кейсы намеренно дёргают пути с console.error (повтор запроса,
    // ошибка API) — в зелёном прогоне это шум, читающийся как настоящая авария.
    silent: "passed-only"
  }
})
