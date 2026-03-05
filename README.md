# FocusTodo Clone

FocusTodoクローン（Pomodoro Timer / Task管理 / 統計）のMVPです。

## Stack
- Frontend: Next.js (App Router + BFF Route Handlers)
- Backend: Go + Gin + gRPC
- Database: Postgres

## Quick Start
```bash
make up
```

- Frontend: http://localhost:3000
- Backend health: http://localhost:8080/healthz
- gRPC: localhost:9090

## Development
```bash
make backend-test
make proto
```

## TDD & Commit rules
`AGENTS.md` の運用ルールに従います。
