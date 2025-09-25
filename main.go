package main

import (
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

var version = "dev"

//go:embed index.html styles.css app.js
var staticFiles embed.FS

type Config struct {
	Server struct {
		Host string `yaml:"host"`
		Port string `yaml:"port"`
	} `yaml:"server"`
	GitHub struct {
		ClientID     string `yaml:"client_id"`
		ClientSecret string `yaml:"client_secret"`
	} `yaml:"github"`
}

type TokenRequest struct {
	Code string `json:"code"`
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	Scope       string `json:"scope"`
	Error       string `json:"error,omitempty"`
}

type ConfigResponse struct {
	ClientID string `json:"client_id"`
}

func main() {
	configPath := flag.String("config", "config.yaml", "Path to configuration file")
	showVersion := flag.Bool("version", false, "Print version and exit")
	showHelp := flag.Bool("help", false, "Print help and exit")
	flag.Parse()

	if *showVersion {
		fmt.Printf("eztag version %s\n", version)
		os.Exit(0)
	}

	if *showHelp {
		fmt.Printf("eztag - GitHub Tag Manager\n\n")
		fmt.Printf("Usage: eztag [OPTIONS]\n\n")
		fmt.Printf("Options:\n")
		flag.PrintDefaults()
		os.Exit(0)
	}

	config, err := loadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	mux := http.NewServeMux()

	// Serve static files
	mux.HandleFunc("/", serveStaticFile)

	// API endpoints
	mux.HandleFunc("/api/config", handleConfig(config))
	mux.HandleFunc("/api/oauth/token", handleTokenExchange(config))

	// Add CORS middleware
	handler := corsMiddleware(mux)

	addr := config.Server.Host + ":" + config.Server.Port
	log.Printf("Server starting on %s", addr)
	log.Printf("GitHub OAuth Client ID: %s", config.GitHub.ClientID)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func loadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading config file: %w", err)
	}

	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("parsing config file: %w", err)
	}

	// Validate required fields
	if config.GitHub.ClientID == "" {
		return nil, fmt.Errorf("github.client_id is required")
	}
	if config.GitHub.ClientSecret == "" {
		return nil, fmt.Errorf("github.client_secret is required")
	}
	if config.Server.Host == "" {
		config.Server.Host = "localhost"
	}
	if config.Server.Port == "" {
		config.Server.Port = "8080"
	}

	return &config, nil
}

func serveStaticFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/")

	// Default to index.html for root path
	if path == "" {
		path = "index.html"
	}

	// Security check: only serve known files
	allowedFiles := map[string]string{
		"":           "index.html",
		"index.html": "index.html",
		"styles.css": "styles.css",
		"app.js":     "app.js",
	}

	filename, allowed := allowedFiles[path]
	if !allowed {
		http.NotFound(w, r)
		return
	}

	data, err := staticFiles.ReadFile(filename)
	if err != nil {
		log.Printf("Error reading file %s: %v", filename, err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Set appropriate content type
	contentType := getContentType(filename)
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	w.Write(data)
}

func getContentType(filename string) string {
	ext := filepath.Ext(filename)
	switch ext {
	case ".html":
		return "text/html; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".js":
		return "application/javascript; charset=utf-8"
	default:
		return "text/plain; charset=utf-8"
	}
}

func handleConfig(config *Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		resp := ConfigResponse{
			ClientID: config.GitHub.ClientID,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp)
	}
}

func handleTokenExchange(config *Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req TokenRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.Code == "" {
			http.Error(w, "Code is required", http.StatusBadRequest)
			return
		}

		// Exchange code for access token
		tokenResp, err := exchangeCodeForToken(config, req.Code)
		if err != nil {
			log.Printf("Token exchange error: %v", err)
			http.Error(w, "Failed to exchange code for token", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(tokenResp)
	}
}

func exchangeCodeForToken(config *Config, code string) (*TokenResponse, error) {
	// Prepare the request to GitHub
	data := url.Values{}
	data.Set("client_id", config.GitHub.ClientID)
	data.Set("client_secret", config.GitHub.ClientSecret)
	data.Set("code", code)

	req, err := http.NewRequest("POST", "https://github.com/login/oauth/access_token", strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("making request to GitHub: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GitHub API error: %s - %s", resp.Status, string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, fmt.Errorf("parsing response: %w", err)
	}

	if tokenResp.Error != "" {
		return nil, fmt.Errorf("GitHub OAuth error: %s", tokenResp.Error)
	}

	return &tokenResp, nil
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}