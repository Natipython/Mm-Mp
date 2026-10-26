package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"menumini-realtime-engine/internal/qr"
	"menumini-realtime-engine/internal/ws"
)

func main() {
	port := os.Getenv("GO_PORT")
	if port == "" {
		port = "8080"
	}

	hub := ws.NewHub()
	go hub.Run()

	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"service": "go-realtime-engine",
		})
	})

	http.HandleFunc("/api/v1/qr", func(w http.ResponseWriter, r *http.Request) {
		targetURL := r.URL.Query().Get("url")
		if targetURL == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "Missing required \"url\" parameter",
			})
			return
		}

		pngBytes, err := qr.GeneratePNG(targetURL, 256)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("X-Generated-For", targetURL)
		w.WriteHeader(http.StatusOK)
		w.Write(pngBytes)
	})

	http.HandleFunc("/api/v1/broadcast", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var payload map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		rawBytes, _ := json.Marshal(payload)
		hub.Broadcast(rawBytes)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true})
	})

	http.HandleFunc("/ws/dining", func(w http.ResponseWriter, r *http.Request) {
		ws.ServeWs(hub, w, r)
	})

	addr := fmt.Sprintf("127.0.0.1:%s", port)
	log.Printf("Go Realtime Engine listening on http://%s", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
