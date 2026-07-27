#!/bin/sh
set -eu

: "${BLOG_DOMAIN:?Set BLOG_DOMAIN to the public blog hostname before running this script}"
: "${SUITE_DOMAIN:?Set SUITE_DOMAIN to the public suite hostname before running this script}"

moments_path="${1:-moments}"
if ! printf '%s\n' "$moments_path" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9_-]*(/[A-Za-z0-9][A-Za-z0-9_-]*)*$'; then
  printf '%s\n' 'Moments path must contain safe segments without a leading or trailing slash.' >&2
  exit 2
fi

compose_file="$(dirname "$0")/compose.yaml"

docker compose --env-file "$(dirname "$0")/.env" -f "$compose_file" ps
curl --fail --show-error --silent "https://${SUITE_DOMAIN}/healthz" >/dev/null
curl --fail --show-error --silent "https://${SUITE_DOMAIN}/readyz" >/dev/null
curl --fail --show-error --silent "https://${BLOG_DOMAIN}/" >/dev/null
curl --fail --show-error --silent "https://${BLOG_DOMAIN}/${moments_path}" >/dev/null
docker compose --env-file "$(dirname "$0")/.env" -f "$compose_file" exec -T suite-worker node dist/cli.js health worker

printf '%s\n' 'Koharu full-stack smoke passed.'
