# Удалённый сервер

Тот же сервер, что запускает `npx`, но по HTTP (Streamable HTTP): к нему подключаются
по адресу — из claude.ai в браузере и с телефона, из Claude Desktop и Claude Code без
установки Node. Вариант для одного владельца: токен Директа один, свой. Вход для
многих пользователей со своими токенами — #56.

## Настройки

| Переменная | Обязательна | Назначение |
| ---------- | :---------: | ---------- |
| `YANDEX_DIRECT_TOKEN` | да | OAuth-токен Директа, как у локального сервера |
| `YANDEX_DIRECT_LOGIN` | нет | Логин клиента для агентского токена |
| `YD_MCP_SECRET` | да | Секрет входа, не короче 32 символов: `openssl rand -hex 32`. Без него сервер не стартует |
| `YD_MCP_ALLOWED_HOSTS` | да, за прокси | Домен, по которому к серверу обращаются (`mcp.example.ru`); через запятую, если их несколько. Без неё — только localhost |
| `YD_MCP_PORT` | нет | Порт, по умолчанию 3000 |
| `YD_MCP_HOST` | нет | Адрес, который слушает процесс; в образе — `0.0.0.0` |

Секрет даёт право менять ставки и бюджеты: кто его знает, тот управляет рекламой.

## Запуск в Docker

Настройки — файлом на сервере, не в командной строке и не в образе:

```bash
sudo install -m 600 /dev/null /opt/yd-mcp/yd-mcp.env   # и вписать туда переменные
docker build -t yd-mcp .
docker run -d --name yd-mcp --restart unless-stopped \
  --env-file /opt/yd-mcp/yd-mcp.env \
  -p 127.0.0.1:3000:3000 \
  yd-mcp
```

Порт публикуется только на `127.0.0.1`: наружу сервер смотрит через nginx с HTTPS.
Если nginx сам в контейнере — общая сеть Docker и `proxy_pass http://yd-mcp:3000`
вместо публикации порта.

`/health` отвечает `ok` без секрета — для `HEALTHCHECK` образа и мониторинга.

## nginx

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name mcp.example.ru;

    ssl_certificate     /etc/letsencrypt/live/mcp.example.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.example.ru/privkey.pem;

    location /mcp {
        # Секрет может стоять в пути — в журнал запросов он попадать не должен.
        access_log off;

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        # Ответ может идти потоком (SSE), буфер его задержал бы.
        proxy_buffering off;
        # Отчёты Директа формируются до пары минут.
        proxy_read_timeout 300s;
    }

    location = /health {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

`Host` передаётся как есть, и он должен совпасть с `YD_MCP_ALLOWED_HOSTS` — чужой
хост сервер отбивает с 403.

## Подключение клиента

Адрес — `https://mcp.example.ru/mcp`, секрет — одним из двух способов:

- **заголовком** `Authorization: Bearer <секрет>` — Claude Code:

  ```bash
  claude mcp add --transport http yandex-direct https://mcp.example.ru/mcp \
    --header "Authorization: Bearer <секрет>"
  ```

- **в пути** `https://mcp.example.ru/mcp/<секрет>` — коннекторы claude.ai и Claude
  Desktop: заголовок там не задать. Такой адрес сам по себе пароль — не публиковать и
  не пересылать.

Сервер без сессий: каждый запрос самостоятелен, принимается только `POST`.

## Если на токене включено ограничение по IP

В настройках доступа к API Директа добавить внешний IP сервера — иначе Директ отклонит
запросы с него.
