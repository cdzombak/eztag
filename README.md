# EZTag

Quickly & easily create tags in your GitHub repositories.

## Features

- 🔐 **GitHub OAuth Integration** - Secure authentication with your GitHub account
- 📊 **Repository Overview** - Browse your repositories with filtering and sorting
- 🏷️ **Tag Creation** - Create tags with an intuitive web interface
- 📱 **Responsive Design** - GitHub-styled interface that works on all devices

## Installation

TK

## Configuration

1. Create a GitHub OAuth App:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Click "New OAuth App"
   - Set Homepage URL and Authorization callback URL to your EZTag server URL

2. Create configuration file (`config.yaml`):
   ```yaml
   server:
     host: "localhost"
     port: "8080"
   github:
     client_id: "your_github_oauth_client_id"
     client_secret: "your_github_oauth_client_secret"
   ```

## Usage

```bash
# Run with default config
eztag

# Run with custom config
eztag -config /path/to/config.yaml

# Check version
eztag -version
```

### Docker

```bash
docker run -d \
  --name eztag \
  -p 8080:8080 \
  -v /path/to/config.yaml:/app/config.yaml:ro \
  cdzombak/eztag:latest
```

## License

GPLv3. See [LICENSE](LICENSE) for details.

## Author

**Chris Dzombak**

- [dzombak.com](https://www.dzombak.com)
- [GitHub @cdzombak](https://github.com/cdzombak)
