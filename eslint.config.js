// @ts-check

import js from "@eslint/js"
import tseslint from "typescript-eslint"
import stylistic from "@stylistic/eslint-plugin"

// Форматирование выровнено с соседним проектом more-shop: без `;`, двойные кавычки,
// без trailing commas, отступ 2. Правила форматирования живут в @stylistic — в ядре
// ESLint их больше нет.
export default tseslint.config(
  { ignores: ["dist/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    plugins: { "@stylistic": stylistic },
    rules: {
      "@stylistic/semi": ["error", "never"],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/comma-dangle": ["error", "never"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/quote-props": ["error", "as-needed"],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/eol-last": ["error", "always"],
      "@stylistic/no-trailing-spaces": "error",

      // Билтины только с префиксом node: — иначе резолвер может подхватить пакет
      // из node_modules с тем же именем.
      "no-restricted-imports": ["error", {
        patterns: [{
          regex: "^(fs|path|url|crypto|http|https|os|util|stream|buffer|events|child_process)$",
          message: "Билтины импортируются с префиксом node: (node:fs, node:path)."
        }]
      }],

      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    // Инвариант 64-битных ID: разбор и сериализация JSON — только через json-bigint
    // в транспортном слое. Родной JSON.parse молча округляет 19-значные ID
    // (см. docs/architecture.md). Список путей сузится после рефакторинга раскладки.
    files: ["**/*.ts"],
    // Тесты разбирают тело запроса ради проверки маппинга — это допустимо, но
    // проверка самих ID обязана сравнивать сырую строку (rawBody), а не разобранный
    // объект: JSON.parse округлит 19-значный ID и тест станет ложно-зелёным.
    ignores: ["src/client.ts", "src/format.ts", "src/shared/**", "**/*.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", {
        selector: "MemberExpression[object.name='JSON'][property.name=/^(parse|stringify)$/]",
        message: "JSON.parse/stringify запрещены вне shared/api и format: 64-битные ID теряют точность. Используйте json-bigint."
      }]
    }
  }
)
