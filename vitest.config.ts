import { defineConfig } from "vitest/config"

// Два уровня, уровень зашит в имя файла:
//   *.unit.test.ts — без сети: fetch подменён, проверяем тело запроса и разбор ответа.
//   *.int.test.ts  — против боевого API, сеть настоящая: писать только на кампанию-полигон.
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
          // Аккаунт один на прогон, параллельные файлы мешали бы друг другу.
          fileParallelism: false,
          // Дефолтных 5 с не хватает: один кейс — несколько круговых вызовов к API,
          // а add и remove вдобавок читают текущий список перед записью.
          testTimeout: 60_000,
          hookTimeout: 60_000
        }
      }
    ],
    // Негативные кейсы намеренно дёргают пути с console.error (повтор запроса,
    // ошибка API) — в зелёном прогоне это шум, читающийся как настоящая авария.
    silent: "passed-only"
  }
})
