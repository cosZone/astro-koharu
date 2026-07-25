#!/bin/sh

set -eu

blog_origin="${BLOG_ORIGIN:-http://127.0.0.1:${BLOG_PORT:-4321}}"
moments_path="${MOMENTS_PATH:-moments}"

check_url() {
  label="$1"
  url="$2"

  printf 'Checking %s: %s\n' "$label" "$url"
  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --retry 10 \
    --retry-delay 1 \
    --retry-connrefused \
    --output /dev/null \
    "$url"
}

check_url "static homepage liveness" "${blog_origin}/"
check_url "Moments index" "${blog_origin}/${moments_path#/}/"

printf 'Dynamic Docker smoke passed.\n'
