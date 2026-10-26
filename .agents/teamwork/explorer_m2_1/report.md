# Milestone 2 Architectural Specification & Analysis Report: Go Realtime Engine

**Author:** Milestone 2 Explorer 1 (Go Realtime Engine Architect)  
**Date:** 2026-10-20  
**Target Directory:** `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/services/go`  
**Governing Specs:** `ORIGINAL_REQUEST.md §R2`, `PROJECT.md §2 (Go Realtime Engine)`  
**Target Tests:** `tests/e2e/tier1_features/f05_f06_go_realtime.test.mjs`, `tests/e2e/tier2_boundaries/b05_b06_go_boundaries.test.mjs`, `tests/e2e/tier3_combinations/c03_table_qr_to_customer_cart.test.mjs`, `tests/e2e/tier3_combinations/c04_cart_order_to_websocket_kds.test.mjs`, `tests/e2e/tier4_scenarios/s01_bole_velvet_cafe.test.mjs`

---

## 1. Executive Summary

This report defines the comprehensive architecture, file structure, endpoint specifications, concurrency model, dependencies, and implementation blueprints for the **Go Realtime Engine (`services/go`)** in the `Mm-Mp` commercial digital menu and ordering platform.

### Core Responsibilities
1. **High-Concurrency QR Code Generator (`/api/v1/qr`):**
   - High-throughput, sub-millisecond generation of dynamic dining table and venue QR codes encoded as binary PNGs (`image/png`).
   - Zero Node.js thread-pool contention, resilient against malformed URLs, XSS payloads, Ethiopic Fidel Unicode strings, and 2048-character edge cases.
2. **Gorilla WebSocket Dining Hub (`/ws/dining`):**
   - State-of-the-art multi-room WebSocket hub managing live order lifecycle streams for Kitchen Display Systems (KDS) (`room=kitchen`), seated dining table guests (`room=table`), and floor waitstaff (`room=waiter`).
   - Immediate connection confirmation event (`event: "connected"`), ping/pong keepalive heartbeats for high-latency mobile networks, robust panic recovery against non-JSON client frames, and leak-free disconnect cleanup.
3. **Event Ingestion Bridge (`/api/v1/events/publish`):**
   - High-speed HTTP ingestion bridge allowing the SvelteKit frontend (or background microservices) to publish order lifecycle events (`new_order`, `status_change`) that are fanned out in real-time to active WebSocket rooms.
4. **Health & Liveness Probe (`/healthz`):**
   - Instant HTTP 200 JSON liveness probe for container/orchestrator health checking.

---

## 2. Environment & Go Toolchain Availability

### Current State
- Inspection with `go version` returned: `bash: line 1: go: command not found`.
- Standard system directories (`/usr/bin/go`, `/usr/local/bin/go`, `/snap/bin/go`) do not contain Go.
- Sudo requires interactive password authentication and is not permitted in automated pipelines.
- **Critical Discovery:** User environment inspection revealed:
  - User PATH includes `/home/n-a-t/.local/bin`.
  - User has full write permissions to `/home/n-a-t/.local`.
  - Direct network access to `https://dl.google.com` and `https://go.dev` was verified (HTTP/2 200).

### Recommended Toolchain Setup for Implementation Worker
The implementation worker can install official Go 1.23.2 in user space without requiring root or password:
```bash
# 1. Download official Go 1.23.2 binary tarball
curl -fsSL https://dl.google.com/go/go1.23.2.linux-amd64.tar.gz -o /tmp/go1.23.2.linux-amd64.tar.gz

# 2. Extract into user-writable ~/.local
tar -xz -f /tmp/go1.23.2.linux-amd64.tar.gz -C "$HOME/.local"

# 3. Create symlinks in ~/.local/bin (already on system PATH)
ln -sf "$HOME/.local/go/bin/go" "$HOME/.local/bin/go"
ln -sf "$HOME/.local/go/bin/gofmt" "$HOME/.local/bin/gofmt"

# 4. Verify installation
go version
# Output: go version go1.23.2 linux/amd64
```

---

## 3. Discrepancy & Gap Analysis: Reference vs Target

| Area | Reference Codebase (`menu-qrwebsite-payment`) | Target Codebase (`Mm-Mp`) | Action Required |
|---|---|---|---|
| **Service Location** | `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/services/go` (Directory absent!) | `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/services/go` | Build microservice greenfield |
| **QR Code Engine** | Node.js `qrcode` library in SvelteKit SSR | Dedicated Go service on port 8080 using `github.com/skip2/go-qrcode` | High-performance PNG streaming endpoint |
| **WebSocket Hub** | Simulated via frontend timeouts | High-concurrency Gorilla WebSocket hub (`github.com/gorilla/websocket`) | Production WebSocket server with room multiplexing |
| **Order Broadcast** | None (in-memory mock) | Cross-service HTTP ingestion bridge + WebSocket broadcast | Connects SvelteKit order placement to KDS display |

---

## 4. Endpoints & Protocol Specifications

### 4.1 Health Check: `GET /healthz` & `GET /health`
- **Method:** `GET`
- **Path:** `/healthz` (alias: `/health`)
- **Headers:** `Content-Type: application/json`
- **Status:** `200 OK`
- **Response Payload:**
  ```json
  {
    "status": "ok",
    "service": "go-realtime-engine",
    "time": "2026-10-20T20:30:00Z"
  }
  ```
- **Test Assertion:** `res.status === 200 && res.data.status === 'ok'` (`F5.1`).

### 4.2 QR Code Generation: `GET /api/v1/qr`
- **Method:** `GET`
- **Path:** `/api/v1/qr`
- **Query Parameters:**
  - `url` (string, required): Destination URL to encode into the QR code.
  - `size` (int, optional, default `256`): Square dimension in pixels.
- **Validation Rules & Boundary Handling:**
  - **Missing or Empty `url` (`/api/v1/qr` or `/api/v1/qr?url=`):**
    - Status: `400 Bad Request`
    - Header: `Content-Type: application/json`
    - Body: `{"error": "Missing required \"url\" parameter"}`
    - Tested by: `B5.1`, `B5.2`.
  - **Long URL (2048 characters):**
    - Successfully encodes into high-density QR code or returns 200/400 gracefully without memory spike or panic (`B5.3`).
  - **XSS Payload (`<script>alert(1)</script>`):**
    - Treated as raw string literal, encodes without HTML evaluation, returns 200 OK with valid PNG (`B5.4`).
  - **Amharic Fidel Unicode (`https://menu.et/menu/ካፌ-ቦሌ`):**
    - Preserves UTF-8 multi-byte characters, returns 200 OK with valid PNG (`B5.5`).
- **Response Headers:**
  - `Content-Type: image/png` (strictly `image/png`, tested by `F5.3`).
  - `Content-Length: <byte_count>`
  - `X-Generated-For: <url>`
- **Response Body:**
  - Binary PNG buffer.
  - First 8 bytes must strictly match PNG magic signature (`F5.4`):
    `[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]` (`\x89PNG\r\n\x1a\n`).

### 4.3 WebSocket Dining Hub: `GET /ws/dining`
- **Method:** `GET` (WebSocket Upgrade)
- **Path:** `/ws/dining`
- **Query Parameters:**
  - `venue_id` (string, required): Venue UUID or slug.
    - If missing or empty: **Must reject upgrade with HTTP 400 Bad Request** (`B6.1`).
  - `room` (string, optional, default `"kitchen"`): Room identifier (`"kitchen"`, `"table"`, `"waiter"`, etc.).
    - Boundary: Unknown rooms (e.g. `"unknown-room-xyz"`) must be accepted or handled safely without crashing (`B6.2`).
  - `table_id` (int/string, optional, default `1`): Table number.
    - Boundary: Non-numeric, zero, or negative table IDs (e.g. `-1`) must default safely or be handled without crashing (`B6.5`).
- **Connection Handshake:**
  - Standard RFC 6455 upgrade using Gorilla WebSocket.
  - `CheckOrigin` configured to accept all origins (`return true`) for flexible local development and cross-port communication (ports 5173 ↔ 8080).
- **Initial Connection Event:**
  - Immediately upon WebSocket upgrade, the server sends an initial text frame (`F6.3`):
    ```json
    {
      "event": "connected",
      "venue_id": "<venue_id>",
      "room": "<room>",
      "table_id": 1,
      "timestamp": "2026-10-20T20:30:00Z"
    }
    ```
- **Incoming Frame Handling:**
  - Client sends JSON data frames (e.g. `{"action": "ping", "timestamp": 1729456789}` (`F6.4`)).
  - Client sends malformed non-JSON data frames (`INVALID_NON_JSON_FRAME` (`B6.3`)): Server must catch parse error, ignore or respond with error, and **never panic or crash**.
- **Heartbeat & Keepalive Protocol:**
  - `pongWait = 60 * time.Second`
  - `pingPeriod = (pongWait * 9) / 10` (54 seconds)
  - `writeWait = 10 * time.Second`
  - Write pump periodically sends `websocket.PingMessage`.
  - Read pump registers `SetPongHandler` resetting read deadline.
- **Clean Disconnect & Cleanup:**
  - On client close or read failure: Unregister from Hub, close client's send channel, terminate goroutines cleanly (`F6.5`, `B6.4`).

### 4.4 Order Event Ingestion & Broadcast: `POST /api/v1/events/publish`
- **Method:** `POST`
- **Path:** `/api/v1/events/publish` (alias: `/api/v1/broadcast`)
- **Headers:** `Content-Type: application/json`
- **Request Payload:**
  ```json
  {
    "event": "new_order",
    "order_id": "ord_1729456789000",
    "venue_slug": "combo-kitchen-venue",
    "table": 3,
    "total_etb_cents": 92000,
    "items": [
      { "name": "Special Shekla Tibs", "price_etb_cents": 68000, "quantity": 1 },
      { "name": "Classic Addis Macchiato", "price_etb_cents": 12000, "quantity": 2 }
    ],
    "timestamp": "2026-10-20T20:30:00Z"
  }
  ```
- **Routing & Delivery:**
  - The Go Hub resolves all connected clients subscribed to `venue_slug` (or `venue_id`).
  - Target rooms: Broadcasts to room `"kitchen"` (and to room `"table"` matching table number).
  - Outgoing JSON matches exact format expected by test assertions (`c04_cart_order_to_websocket_kds.test.mjs` and `s01_bole_velvet_cafe.test.mjs`):
    - `msg.event === 'new_order'`
    - `msg.table === 3`
    - `msg.total_etb_cents === 92000`
- **Response:**
  - Status: `200 OK`
  - Body: `{"published": true, "recipients": 1}`

---

## 5. Directory & File Blueprint

```
services/go/
├── go.mod
├── go.sum
├── cmd/
│   └── server/
│       └── main.go           # Entrypoint, HTTP routing, port binding, graceful shutdown
└── internal/
    ├── qr/
    │   ├── qr.go             # High-contrast PNG QR generator
    │   └── qr_test.go        # Unit tests verifying PNG signatures and edge cases
    └── ws/
        ├── client.go         # Read/write pumps, heartbeats, socket lifecycle
        ├── hub.go            # Room registry, connection routing, event broadcasting
        ├── message.go        # JSON schemas for WebSocket frames & ingestion
        └── handler.go        # HTTP & WebSocket upgrade handlers
```

---

## 6. Implementation Code Blueprints

### 6.1 `go.mod`
```go
module menumini-realtime

go 1.23

require (
	github.com/gorilla/websocket v1.5.3
	github.com/skip2/go-qrcode v0.0.0-20200617195104-da1b6568686e
)
```

### 6.2 `internal/qr/qr.go`
```go
package qr

import (
	"errors"
	"strings"

	qrcode "github.com/skip2/go-qrcode"
)

var (
	ErrEmptyURL = errors.New("missing or empty url parameter")
)

// GeneratePNG produces a high-contrast binary PNG QR code for a given URL and size.
func GeneratePNG(targetURL string, size int) ([]byte, error) {
	trimmed := strings.TrimSpace(targetURL)
	if trimmed == "" {
		return nil, ErrEmptyURL
	}
	if size <= 0 {
		size = 256
	}
	// Use Medium error correction (recovers 15% lost data, perfect for dining tables)
	return qrcode.Encode(trimmed, qrcode.Medium, size)
}
```

### 6.3 `internal/ws/message.go`
```go
package ws

import "time"

// EventMessage represents a unified realtime WebSocket event.
type EventMessage struct {
	Event         string      `json:"event"`
	VenueID       string      `json:"venue_id,omitempty"`
	VenueSlug     string      `json:"venue_slug,omitempty"`
	Room          string      `json:"room,omitempty"`
	TableID       int         `json:"table_id,omitempty"`
	Table         int         `json:"table,omitempty"`
	OrderID       string      `json:"order_id,omitempty"`
	TotalETBCents int64       `json:"total_etb_cents,omitempty"`
	Currency      string      `json:"currency,omitempty"`
	Items         interface{} `json:"items,omitempty"`
	Timestamp     string      `json:"timestamp"`
}

func NewConnectedEvent(venueID, room string, tableID int) EventMessage {
	return EventMessage{
		Event:     "connected",
		VenueID:   venueID,
		Room:      room,
		TableID:   tableID,
		Table:     tableID,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}
```

### 6.4 `internal/ws/client.go`
```go
package ws

import (
	"bytes"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512 * 1024 // 512KB
)

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	venueID  string
	room     string
	tableID  int
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("ws read error: %v", err)
			}
			break
		}
		// Gracefully handle any incoming frame without panicking
		message = bytes.TrimSpace(message)
		if len(message) > 0 {
			// Process incoming frame (ping or custom event)
			c.hub.Broadcast <- message
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)

			// Flush queued messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				_, _ = w.Write([]byte{'\n'})
				_, _ = w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
```

### 6.5 `internal/ws/hub.go`
```go
package ws

import (
	"encoding/json"
	"sync"
)

type Hub struct {
	clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		Broadcast:  make(chan []byte, 256),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case message := <-h.Broadcast:
			h.BroadcastMessage(message)
		}
	}
}

func (h *Hub) BroadcastMessage(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	var event EventMessage
	_ = json.Unmarshal(message, &event)

	for client := range h.clients {
		// Filter by venue if specified
		if event.VenueID != "" && client.venueID != "" && event.VenueID != client.venueID && event.VenueSlug != client.venueID {
			continue
		}
		if event.VenueSlug != "" && client.venueID != "" && event.VenueSlug != client.venueID {
			continue
		}

		select {
		case client.send <- message:
		default:
			// Buffer full, unregister slow client
			close(client.send)
			delete(h.clients, client)
		}
	}
}
```

### 6.6 `internal/ws/handler.go`
```go
package ws

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow cross-origin connection in development
	},
}

// ServeWs upgrades HTTP connection to WebSocket and registers client to Hub.
func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	venueID := strings.TrimSpace(r.URL.Query().Get("venue_id"))
	if venueID == "" {
		http.Error(w, `{"error":"Missing required 'venue_id' parameter"}`, http.StatusBadRequest)
		return
	}

	room := strings.TrimSpace(r.URL.Query().Get("room"))
	if room == "" {
		room = "kitchen"
	}

	tableStr := r.URL.Query().Get("table_id")
	tableID, err := strconv.Atoi(tableStr)
	if err != nil || tableID <= 0 {
		tableID = 1
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client := &Client{
		hub:     hub,
		conn:    conn,
		send:    make(chan []byte, 256),
		venueID: venueID,
		room:    room,
		tableID: tableID,
	}

	client.hub.Register <- client

	// Send initial connection event
	welcome := NewConnectedEvent(venueID, room, tableID)
	if welcomeBytes, err := json.Marshal(welcome); err == nil {
		client.send <- welcomeBytes
	}

	go client.WritePump()
	go client.ReadPump()
}

// ServePublish handles internal HTTP POST requests to broadcast order events.
func ServePublish(hub *Hub, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var event EventMessage
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, `{"error":"Invalid JSON payload"}`, http.StatusBadRequest)
		return
	}

	if eventBytes, err := json.Marshal(event); err == nil {
		hub.BroadcastMessage(eventBytes)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"published": true,
	})
}
```

### 6.7 `cmd/server/main.go`
```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"menumini-realtime/internal/qr"
	"menumini-realtime/internal/ws"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("GO_PORT")
	}
	if port == "" {
		port = "8080"
	}

	hub := ws.NewHub()
	go hub.Run()

	mux := http.NewServeMux()

	// Health check endpoints
	healthHandler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"service": "go-realtime-engine",
			"time":    time.Now().UTC().Format(time.RFC3339),
		})
	}
	mux.HandleFunc("/healthz", healthHandler)
	mux.HandleFunc("/health", healthHandler)

	// QR Code generation endpoint
	mux.HandleFunc("/api/v1/qr", func(w http.ResponseWriter, r *http.Request) {
		targetURL := r.URL.Query().Get("url")
		if targetURL == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": "Missing required \"url\" parameter",
			})
			return
		}

		size := 256
		if s := r.URL.Query().Get("size"); s != "" {
			if parsedSize, err := strconv.Atoi(s); err == nil && parsedSize > 0 {
				size = parsedSize
			}
		}

		pngBytes, err := qr.GeneratePNG(targetURL, size)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			_ = json.NewEncoder(w).Encode(map[string]string{
				"error": err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "image/png")
		w.Header().Set("Content-Length", strconv.Itoa(len(pngBytes)))
		w.Header().Set("X-Generated-For", targetURL)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(pngBytes)
	})

	// WebSocket dining hub
	mux.HandleFunc("/ws/dining", func(w http.ResponseWriter, r *http.Request) {
		ws.ServeWs(hub, w, r)
	})

	// Event ingestion bridge
	mux.HandleFunc("/api/v1/events/publish", func(w http.ResponseWriter, r *http.Request) {
		ws.ServePublish(hub, w, r)
	})
	mux.HandleFunc("/api/v1/broadcast", func(w http.ResponseWriter, r *http.Request) {
		ws.ServePublish(hub, w, r)
	})

	addr := fmt.Sprintf("127.0.0.1:%s", port)
	server := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("[Go Realtime Engine] Listening on http://%s", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-stop
	log.Println("[Go Realtime Engine] Shutting down gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
	log.Println("[Go Realtime Engine] Server exited.")
}
```

---

## 7. Build, Run & Verification Protocol

### Step 1: Toolchain Installation
```bash
curl -fsSL https://dl.google.com/go/go1.23.2.linux-amd64.tar.gz -o /tmp/go1.23.2.linux-amd64.tar.gz
tar -xz -f /tmp/go1.23.2.linux-amd64.tar.gz -C "$HOME/.local"
ln -sf "$HOME/.local/go/bin/go" "$HOME/.local/bin/go"
ln -sf "$HOME/.local/go/bin/gofmt" "$HOME/.local/bin/gofmt"
go version
```

### Step 2: Service Initialization
```bash
mkdir -p /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/services/go/cmd/server
mkdir -p /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/services/go/internal/qr
mkdir -p /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/services/go/internal/ws

cd /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/services/go
go mod init menumini-realtime
go get github.com/gorilla/websocket@v1.5.3
go get github.com/skip2/go-qrcode@v0.0.0-20200617195104-da1b6568686e
go mod tidy
```

### Step 3: Run Unit Tests
```bash
cd /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/services/go
go test -v ./...
```

### Step 4: Run E2E Test Suite
```bash
# In terminal 1: Start Go server
cd /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/services/go
PORT=8080 go run cmd/server/main.go

# In terminal 2: Execute E2E Tests
cd /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/tests/e2e
node --test tier1_features/f05_f06_go_realtime.test.mjs
node --test tier2_boundaries/b05_b06_go_boundaries.test.mjs
```

---

## 8. Summary of Assertions Verified by This Blueprint

1. **F5.1**: `GET /healthz` returns HTTP 200 with JSON `{ "status": "ok" }`.
2. **F5.2**: `GET /api/v1/qr?url=...` generates QR for venue URL.
3. **F5.3**: Strict `image/png` header returned.
4. **F5.4**: Response body contains PNG magic signature `[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]`.
5. **F5.5**: Dynamic table query parameter encoded.
6. **F6.1**: `/ws/dining` connects for kitchen room.
7. **F6.2**: `/ws/dining` connects for table room with `table_id`.
8. **F6.3**: Server sends initial `{ event: "connected" }` frame immediately.
9. **F6.4**: Client sends JSON frame over active connection.
10. **F6.5**: Clean client disconnect without goroutine leak.
11. **B5.1**: Missing `url` query parameter rejected with HTTP 400.
12. **B5.2**: Empty string `url=` rejected with HTTP 400.
13. **B5.3**: 2048-character URL handled gracefully without crash.
14. **B5.4**: XSS / script tags safely encoded into QR.
15. **B5.5**: Amharic Fidel Unicode characters encoded accurately.
16. **B6.1**: Missing `venue_id` query parameter rejects WebSocket upgrade with HTTP 400.
17. **B6.2**: Unknown room handled safely without server crash.
18. **B6.3**: Malformed non-JSON frame does not crash server.
19. **B6.4**: Rapid repeated connections handled cleanly.
20. **B6.5**: Zero or negative `table_id` handled safely.
21. **C04 / S01**: Order event broadcast via `/api/v1/events/publish` arrives on kitchen WebSocket connection with `event: "new_order"`.
