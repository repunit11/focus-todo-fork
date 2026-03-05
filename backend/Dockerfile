FROM golang:1.26-bookworm AS build
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/server ./cmd/server

FROM gcr.io/distroless/base-debian12
COPY --from=build /bin/server /server
EXPOSE 8080 9090
ENTRYPOINT ["/server"]
