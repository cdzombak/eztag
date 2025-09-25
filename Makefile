SHELL:=/usr/bin/env bash

BIN_NAME:=eztag
BIN_VERSION:=$(shell ./.version.sh)

default: help
.PHONY: help
help: ## Print help
	@grep -E '^[a-zA-Z_/-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: all
all: clean build/linux-amd64 build/linux-arm64 build/darwin-amd64 build/darwin-arm64 ## Build for macOS (amd64, arm64) and Linux (amd64, arm64)

.PHONY: clean
clean: ## Remove build products (./out)
	rm -rf ./out

.PHONY: build
build: ## Build for the current platform & architecture to ./out
	mkdir -p out
	env CGO_ENABLED=0 go build -ldflags="-X main.version=${BIN_VERSION}" -o ./out/${BIN_NAME} .

.PHONY: build/linux-amd64
build/linux-amd64: ## Build for Linux/amd64 to ./out
	mkdir -p out
	env CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-X main.version=${BIN_VERSION}" -o ./out/${BIN_NAME}-${BIN_VERSION}-linux-amd64 .

.PHONY: build/linux-arm64
build/linux-arm64: ## Build for Linux/arm64 to ./out
	mkdir -p out
	env CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-X main.version=${BIN_VERSION}" -o ./out/${BIN_NAME}-${BIN_VERSION}-linux-arm64 .

.PHONY: build/darwin-amd64
build/darwin-amd64: ## Build for macOS/amd64 to ./out
	mkdir -p out
	env CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags="-X main.version=${BIN_VERSION}" -o ./out/${BIN_NAME}-${BIN_VERSION}-darwin-amd64 .

.PHONY: build/darwin-arm64
build/darwin-arm64: ## Build for macOS/arm64 to ./out
	mkdir -p out
	env CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags="-X main.version=${BIN_VERSION}" -o ./out/${BIN_NAME}-${BIN_VERSION}-darwin-arm64 .

.PHONY: lint
lint: lint/go lint/js ## Run all linters

.PHONY: lint/go
lint/go: ## Run golangci-lint
	golangci-lint run

.PHONY: lint/js
lint/js: ## Run ESLint on JavaScript files
	npx eslint app.js

.PHONY: fmt
fmt: fmt/go fmt/prettier ## Run all formatters

.PHONY: fmt/go
fmt/go: ## Format Go code
	go fmt ./...

.PHONY: fmt/prettier
fmt/prettier: ## Format HTML, CSS, and JS files with Prettier
	npx prettier --write "*.html" "*.css" "*.js"
