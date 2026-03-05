package main

import (
	"context"
	"log"
	"net"
	"net/http"

	focusv1 "github.com/kenta/focus-todo-fork/backend/gen/focus_todo/v1"
	"github.com/kenta/focus-todo-fork/backend/internal/api"
	"github.com/kenta/focus-todo-fork/backend/internal/config"
	"github.com/kenta/focus-todo-fork/backend/internal/store/postgres"
	"github.com/gin-gonic/gin"
	"google.golang.org/grpc"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	store, err := postgres.New(ctx, cfg.DBURL)
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	svc := api.New(store)
	grpcServer := grpc.NewServer()
	focusv1.RegisterTimerServiceServer(grpcServer, svc)
	focusv1.RegisterTaskServiceServer(grpcServer, svc)
	focusv1.RegisterStatsServiceServer(grpcServer, svc)
	focusv1.RegisterSettingsServiceServer(grpcServer, svc)

	ln, err := net.Listen("tcp", cfg.GRPCAddr)
	if err != nil {
		log.Fatal(err)
	}

	go func() {
		log.Printf("gRPC listening on %s", cfg.GRPCAddr)
		if err := grpcServer.Serve(ln); err != nil {
			log.Fatal(err)
		}
	}()

	r := gin.Default()
	r.GET("/healthz", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"ok": true}) })
	log.Printf("HTTP listening on %s", cfg.HTTPAddr)
	if err := r.Run(cfg.HTTPAddr); err != nil {
		log.Fatal(err)
	}
}
