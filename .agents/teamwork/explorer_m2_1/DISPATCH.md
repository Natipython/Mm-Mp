## 2026-10-20T20:27:16Z
Sender: 9017f19c-7691-438b-963f-2783eaf1e83d (parent)
Content:
You are Milestone 2 Explorer 1 (Go Realtime Engine Architect).
Working directory: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m2_1
Target Project: /run/media/n-a-t/Local Disk_HDD/Mm-Mp
Original Request: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md
Project Spec: /run/media/n-a-t/Local Disk_HDD/Mm-Mp/PROJECT.md
Reference Service: /run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/services/go
Relevant E2E Tests:
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/tier1_features/f05_f08_realtime_qr.test.mjs
- /run/media/n-a-t/Local Disk_HDD/Mm-Mp/tests/e2e/tier2_boundaries/b05_b08_realtime_qr_boundaries.test.mjs

MANDATORY: You MUST read /run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/ORIGINAL_REQUEST.md before starting work.

Your mission for Milestone 2 (Go Realtime Engine in services/go):
1. Inspect the reference Go service in `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment/MenuMini_1/services/go`.
2. Analyze the requirements from `PROJECT.md` and the E2E tests:
   - Go module structure (`go.mod`, `cmd/server/main.go`, `internal/...`).
   - Server port configuration (default `8080` or `GO_PORT`, bind to `127.0.0.1:8080`).
   - Endpoint `GET /healthz` returning JSON `{"status": "ok"}`.
   - Endpoint `GET /api/v1/qr?url=<target_url>` generating high-contrast PNG QR codes with Content-Type `image/png` (e.g. using `github.com/skip2/go-qrcode`).
   - WebSocket Hub at `GET /ws/dining?venue_id=<uuid>&room=<kitchen|table>&table_id=<num>` using `github.com/gorilla/websocket`.
   - Message routing: broadcasting kitchen orders, dining table updates, ping/pong heartbeat, client disconnect cleanup.
3. Check Go compiler/toolchain availability on the system (`go version`).
4. Detail the exact file layout, Go dependencies, handler logic, error handling, and build/run commands for the implementation worker.
5. Write your comprehensive analysis report to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m2_1/report.md` and write your structured handoff to `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.agents/teamwork/explorer_m2_1/handoff.md`.
6. When done, send a message to parent with the report path.
