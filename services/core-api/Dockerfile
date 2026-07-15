# Build context: services/core-api (set Railway Root Directory to this folder)
FROM golang:1.21-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /core-api .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /core-api .

ENV PORT=8080
EXPOSE 8080

CMD ["./core-api"]
