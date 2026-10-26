package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow cross-origin dining connections
	},
}

type Client struct {
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	VenueID  string
	Room     string
	TableID  string
}

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Broadcast(msg []byte) {
	h.broadcast <- msg
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

			// Send welcome frame
			welcome, _ := json.Marshal(map[string]interface{}{
				"event":     "connected",
				"venue_id":  client.VenueID,
				"room":      client.Room,
				"table_id":  client.TableID,
				"timestamp": time.Now().UTC().Format(time.RFC3339),
			})
			client.Conn.WriteMessage(websocket.TextMessage, welcome)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	venueID := r.URL.Query().Get("venue_id")
	if venueID == "" {
		http.Error(w, "Missing venue_id", http.StatusBadRequest)
		return
	}
	room := r.URL.Query().Get("room")
	if room == "" {
		room = "kitchen"
	}
	tableID := r.URL.Query().Get("table_id")
	if tableID == "" {
		tableID = "1"
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WS upgrade error: %v", err)
		return
	}

	client := &Client{
		Hub:     hub,
		Conn:    conn,
		Send:    make(chan []byte, 256),
		VenueID: venueID,
		Room:    room,
		TableID: tableID,
	}
	client.Hub.register <- client

	go func() {
		defer func() {
			client.Hub.unregister <- client
			client.Conn.Close()
		}()
		for {
			_, _, err := client.Conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()

	go func() {
		defer client.Conn.Close()
		for message := range client.Send {
			if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		}
	}()
}
