package problems

import (
	"encoding/json"
	"net/http"
)

func WriteCode(
	w http.ResponseWriter,
	status int,
	code string,
	title string,
	detail string,
) {
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(map[string]any{
		"type":   "about:blank",
		"title":  title,
		"status": status,
		"detail": detail,
		"code":   code,
	})
}
