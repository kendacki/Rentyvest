package problems

import (
	"encoding/json"
	"net/http"
)

const contentType = "application/problem+json"

type Problem struct {
	Type   string `json:"type,omitempty"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Detail string `json:"detail,omitempty"`
	Inst   string `json:"instance,omitempty"`
}

func Write(w http.ResponseWriter, status int, title, detail string) {
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(status)

	_ = json.NewEncoder(w).Encode(Problem{
		Type:   "about:blank",
		Title:  title,
		Status: status,
		Detail: detail,
	})
}
