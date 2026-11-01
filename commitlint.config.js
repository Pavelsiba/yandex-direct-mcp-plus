// Конфиг на .js, а не .ts как в more-shop: там рантайм bun и TypeScript читается
// напрямую, здесь — Node, и .ts потребовал бы отдельного загрузчика ради четырёх строк.

// Коммиты на русском: из них semantic-release собирает CHANGELOG. Мерджи и git revert
// commitlint пропускает сам (defaultIgnores), dependabot коммитит мимо хука.
const CYRILLIC = /[А-Яа-яЁё]/

// @ts-check
/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "subject-russian": ({ subject }) => [
          !subject || CYRILLIC.test(subject),
          "описание коммита пишется по-русски: «feat(auth): добавлен вход из диалога»"
        ]
      }
    }
  ],
  rules: {
    "subject-russian": [2, "always"]
  }
}
