FROM alpine:3.12.0
LABEL name=scaled maintainer="rios0rios0 <rios0rios0@outlook.com>" description=""

RUN apk update && apk add --no-cache \
    bash jq curl py-pip \
    tor proxychains-ng \
    nmap nmap-nselibs nmap-scripts openssh && \
    rm -rf /etc/apk/cache

RUN pip install --no-cache-dir 'awscli==1.27.0'

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD echo "healthy" || exit 1

COPY entrypoint.sh /
ENTRYPOINT ["/entrypoint.sh"]
