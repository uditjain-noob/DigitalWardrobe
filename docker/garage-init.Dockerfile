# Self-contained image for the garage-init bootstrap job: curl + jq baked in
# at build time (not fetched by the entrypoint at container start), so
# `docker compose up` never needs live network access to Alpine's package
# mirror beyond this image's own (cached) build/pull, and the container
# never needs to run as root to install anything.
FROM alpine:3.21
RUN apk add --no-cache curl jq
USER nobody
ENTRYPOINT ["sh"]
