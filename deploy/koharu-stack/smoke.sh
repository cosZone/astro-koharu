#!/bin/sh
set -eu

: "${BLOG_DOMAIN:?Load deploy/koharu-stack/.env before running this script}"
: "${SUITE_DOMAIN:?Load deploy/koharu-stack/.env before running this script}"

compose_file="$(dirname "$0")/compose.yaml"

docker compose --env-file "$(dirname "$0")/.env" -f "$compose_file" ps
curl --fail --show-error --silent "https://${SUITE_DOMAIN}/healthz" >/dev/null
curl --fail --show-error --silent "https://${SUITE_DOMAIN}/readyz" >/dev/null
curl --fail --show-error --silent "https://${BLOG_DOMAIN}/" >/dev/null
curl --fail --show-error --silent "https://${BLOG_DOMAIN}/moments" >/dev/null
docker compose --env-file "$(dirname "$0")/.env" -f "$compose_file" exec -T suite-worker node dist/cli.js health worker

printf '%s\n' 'Koharu full-stack smoke passed.'
