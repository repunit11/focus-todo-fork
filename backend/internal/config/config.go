package config

import "os"

type Config struct {
	GRPCAddr string
	HTTPAddr string
	DBURL    string
}

func Load() Config {
	return Config{
		GRPCAddr: getenv("GRPC_ADDR", ":9090"),
		HTTPAddr: getenv("HTTP_ADDR", ":8080"),
		DBURL:    getenv("DATABASE_URL", "postgres://focus:focus@localhost:5432/focus_todo?sslmode=disable"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
