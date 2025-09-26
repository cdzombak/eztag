ARG BIN_NAME=eztag
ARG BIN_VERSION=<unknown>

FROM golang:1-alpine AS builder
ARG BIN_NAME
ARG BIN_VERSION

RUN apk --no-cache add ca-certificates

WORKDIR /src/eztag
COPY . .
RUN go build -ldflags="-X main.version=${BIN_VERSION}" -o ./out/${BIN_NAME} .

FROM scratch
ARG BIN_NAME
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /src/eztag/out/${BIN_NAME} /usr/bin/eztag
ENTRYPOINT ["/usr/bin/eztag"]

LABEL license="MIT"
LABEL maintainer="Chris Dzombak <https://www.dzombak.com>"
LABEL org.opencontainers.image.authors="Chris Dzombak <https://www.dzombak.com>"
LABEL org.opencontainers.image.url="https://github.com/cdzombak/eztag"
LABEL org.opencontainers.image.documentation="https://github.com/cdzombak/eztag/blob/main/README.md"
LABEL org.opencontainers.image.source="https://github.com/cdzombak/eztag.git"
LABEL org.opencontainers.image.version="${BIN_VERSION}"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="${BIN_NAME}"
LABEL org.opencontainers.image.description="Quickly & easily create tags in your GitHub repositories"