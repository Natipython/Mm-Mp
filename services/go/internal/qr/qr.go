package qr

import (
	"errors"
	"github.com/skip2/go-qrcode"
)

// GeneratePNG generates a high-quality QR code PNG for a given target URL.
func GeneratePNG(content string, size int) ([]byte, error) {
	if content == "" {
		return nil, errors.New("qr content cannot be empty")
	}
	if size <= 0 {
		size = 256
	}
	return qrcode.Encode(content, qrcode.Medium, size)
}
