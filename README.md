# eztag

**eztag** is a GitHub Tag Manager that provides an easy-to-use web interface for managing GitHub tags across your repositories.

## Features

- 🔐 **GitHub OAuth Integration** - Secure authentication with your GitHub account
- 📊 **Repository Overview** - Browse your repositories with intelligent filtering and sorting
- 🌿 **Branch Management** - View recent branches with CI status indicators
- 🏷️ **Tag Management** - Create, view, and manage tags with intuitive interface
- ⚡ **Real-time Updates** - Instant feedback with toast notifications
- 📱 **Responsive Design** - GitHub-styled interface that works on all devices
- 🔄 **CI Integration** - Visual CI status indicators with direct links to GitHub Actions

## Usage

```bash
eztag [OPTIONS]
```

### Options

- `-config string` - Path to configuration file (default: config.yaml)
- `-version` - Print version and exit
- `-help` - Print help and exit

### Example

```bash
# Run with default config
eztag

# Run with custom config
eztag -config /path/to/myconfig.yaml

# Check version
eztag -version
```

## Installation

### Manual installation from build artifacts

Pre-built binaries for Linux and macOS on various architectures are downloadable from each [GitHub Release](https://github.com/cdzombak/eztag/releases).

### Build and install locally

Requirements:
- Go 1.21+
- Node.js 20+ (for development)

```bash
git clone https://github.com/cdzombak/eztag.git
cd eztag
make build
./out/eztag -help
```

## Configuration

### GitHub OAuth Setup

1. **Create a GitHub OAuth App**:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Click "New OAuth App"
   - Fill in the details:
     - Application name: `eztag`
     - Homepage URL: Your application URL (e.g., `https://eztag.yourdomain.com`)
     - Authorization callback URL: `https://eztag.yourdomain.com` (same as homepage)

2. **Create configuration file** (`config.yaml`):
   ```yaml
   server:
     host: "localhost"  # or "0.0.0.0" for all interfaces
     port: "8080"
   github:
     client_id: "your_github_oauth_client_id"
     client_secret: "your_github_oauth_client_secret"
   ```

3. **Secure your configuration**:
   - Never commit `config.yaml` to version control
   - Set appropriate file permissions: `chmod 600 config.yaml`
   - Consider using environment variables in production

### Serving with Tailscale

eztag works excellently with [Tailscale](https://tailscale.com/) for secure remote access:

1. **Install and configure Tailscale** on your server
2. **Start eztag** on your desired port:
   ```bash
   eztag -config config.yaml
   ```
3. **Serve via Tailscale**:
   ```bash
   tailscale serve https / http://localhost:8080
   ```
4. **Update your GitHub OAuth app**:
   - Set Homepage URL to your Tailscale URL (e.g., `https://machine-name.tail-scale.ts.net`)
   - Set Authorization callback URL to the same URL

This provides secure, encrypted access to eztag from anywhere without exposing it to the public internet.

## Development

### Setup

```bash
# Install Go dependencies
go mod download

# Install Node.js dependencies for linting
npm install

# Install development tools
make install-tools
```

### Building

```bash
# Build for current platform
make build

# Build for all supported platforms
make all

# Clean build artifacts
make clean
```

### Linting

```bash
# Run all linters
make lint

# Run Go linter only
make lint-go

# Run JavaScript linter only
make lint-js

# Format Go code
make fmt
```

### Testing

```bash
# Run tests
make test

# Run application locally
make run
```

## Docker

Docker images are available for Linux architectures from [Docker Hub](https://hub.docker.com/r/cdzombak/eztag) and [GHCR](https://github.com/cdzombak/eztag/pkgs/container/eztag).

```bash
# Pull and run
docker run -d \
  --name eztag \
  -p 8080:8080 \
  -v /path/to/config.yaml:/app/config.yaml:ro \
  cdzombak/eztag:latest

# Build locally
make docker-build
```

## Security Considerations

- **OAuth Secrets**: Never commit your GitHub OAuth client secret to version control
- **HTTPS**: Always serve eztag over HTTPS in production
- **Network Access**: Consider using Tailscale or VPN for secure remote access
- **File Permissions**: Set restrictive permissions on your configuration file

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Run linters: `make lint`
5. Run tests: `make test`
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## License

MIT License. See [LICENSE](LICENSE) for details.

## Author

- **Chris Dzombak** - [https://www.dzombak.com](https://www.dzombak.com)

## Support

- [GitHub Issues](https://github.com/cdzombak/eztag/issues) - Bug reports and feature requests
- [GitHub Discussions](https://github.com/cdzombak/eztag/discussions) - Questions and discussions