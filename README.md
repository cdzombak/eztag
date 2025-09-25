# EZTag

Quickly & easily create tags in your GitHub repositories.

## Features

- 🔐 **GitHub OAuth Integration** - Secure authentication with your GitHub account
- 📊 **Repository Overview** - Browse your repositories with filtering and sorting
- 🏷️ **Tag Creation** - Create tags with an intuitive web interface
- 📱 **Responsive Design** - GitHub-styled interface that works on all devices

## Installation

### macOS via Homebrew

```shell
brew install cdzombak/oss/eztag
```

### Debian via apt repository

Install my Debian repository if you haven't already:

```shell
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://dist.cdzombak.net/deb.key | sudo gpg --dearmor -o /etc/apt/keyrings/dist-cdzombak-net.gpg
sudo chmod 0644 /etc/apt/keyrings/dist-cdzombak-net.gpg
echo -e "deb [signed-by=/etc/apt/keyrings/dist-cdzombak-net.gpg] https://dist.cdzombak.net/deb/oss any oss\n" | sudo tee -a /etc/apt/sources.list.d/dist-cdzombak-net.list > /dev/null
sudo apt-get update
```

Then install `eztag` via `apt-get`:

```shell
sudo apt-get install eztag
```

### Manual installation from build artifacts

Pre-built binaries for Linux and macOS on various architectures are downloadable from each [GitHub Release](https://github.com/cdzombak/eztag/releases). Debian packages for each release are available as well.

### Build and install locally

```shell
git clone https://github.com/cdzombak/eztag.git
cd eztag
make build

cp out/eztag $INSTALL_DIR
```

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
