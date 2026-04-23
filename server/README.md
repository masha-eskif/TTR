# TTR relay

Крошечный WebSocket-сервер, который пересылает сообщения между двумя игроками в одной комнате.

## Протокол

Клиент при подключении сразу шлёт:

```json
{ "type": "join", "code": "ABC123", "role": "host" }
```

(или `"role": "guest"`).

Сервер отвечает `{ "type": "joined", ... }`. Когда в комнате обе стороны — обоим летит `{ "type": "peer-connected" }`. Всё остальное просто пересылается партнёру как есть.

При обрыве партнёру летит `{ "type": "peer-disconnected" }`.

## Локальный запуск

```bash
cd server
npm install
npm start
```

Порт берётся из `PORT` (по умолчанию 8080).

## Деплой

Render.com — Web Service, Root Directory = `server`, Build Command = `npm install`, Start Command = `npm start`.
