.PHONY: proto backend-test frontend-install up down

proto:
	PATH="$(shell go env GOPATH)/bin:$$PATH" protoc -I proto --go_out=backend --go-grpc_out=backend proto/focus_todo/v1/focus_todo.proto

backend-test:
	cd backend && GOCACHE=/tmp/go-build GOMODCACHE=/tmp/go-mod go test ./...

frontend-install:
	cd frontend && npm install

up:
	docker compose up -d --build

down:
	docker compose down
