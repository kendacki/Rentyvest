# Fallback Dockerfile when Railway builds from the repo root (no Root Directory set).
# Prefer setting Root Directory to services/core-api and using services/core-api/Dockerfile.
FROM golang:1.21-alpine AS builder

WORKDIR /src

COPY services/core-api/go.mod services/core-api/go.sum ./
RUN go mod download

COPY services/core-api/ ./

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /core-api .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=builder /core-api .

ENV PORT=8080
EXPOSE 8080

CMD ["./core-api"]
