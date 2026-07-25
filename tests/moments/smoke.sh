#!/usr/bin/env bash
set -euo pipefail

fixture_port="${MOMENTS_FIXTURE_PORT:-4178}"
blog_port="${MOMENTS_BLOG_PORT:-4329}"
fixture_log="${TMPDIR:-/tmp}/astro-koharu-moments-fixture.log"
blog_log="${TMPDIR:-/tmp}/astro-koharu-moments-blog.log"
fixture_pid=''
blog_pid=''

cleanup() {
  if [[ -n "$blog_pid" ]]; then kill "$blog_pid" 2>/dev/null || true; fi
  if [[ -n "$fixture_pid" ]]; then kill "$fixture_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT

FIXTURE_PORT="$fixture_port" node tests/moments/fixture-server.mjs >"$fixture_log" 2>&1 &
fixture_pid=$!
KOHARU_SUITE_URL="http://127.0.0.1:${fixture_port}" HOST=127.0.0.1 PORT="$blog_port" node dist/server/entry.mjs >"$blog_log" 2>&1 &
blog_pid=$!

for _ in {1..40}; do
  if curl -fsS "http://127.0.0.1:${blog_port}/" >/dev/null; then break; fi
  sleep 0.25
done

base="http://127.0.0.1:${blog_port}"
message_id='018f3f7a-2b1c-7def-8abc-1234567890ab'
mismatch_message_id='018f3f7a-2b1c-7def-8abc-1234567890b0'

curl -fsS "$base/moments" | grep -q 'Fixture hello from'
curl -fsS "$base/moments/daily" | grep -q '媒体处理中'
curl -fsS "$base/moments/daily/$message_id" | grep -q '查看源消息'
curl -fsS "$base/moments/search?q=hello" | grep -q 'Fixture hello'
curl -fsS "$base/moments/rss.xml" | grep -q "urn:uuid:$message_id"
curl -fsS "$base/moments/daily/rss.xml" | grep -q "urn:uuid:$message_id"

status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/moments/unknown")"
[[ "$status" == '404' ]]
status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/moments/daily/not-a-uuid")"
[[ "$status" == '404' ]]
status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/moments/daily/$mismatch_message_id")"
[[ "$status" == '404' ]]
status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/moments/daily?cursor=rate-limit")"
[[ "$status" == '429' ]]
status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/moments/daily?cursor=invalid")"
[[ "$status" == '503' ]]

first_headers="$(curl -sS -D - -o /dev/null "$base/moments/daily?cursor=cache-smoke")"
second_headers="$(curl -sS -D - -o /dev/null "$base/moments/daily?cursor=cache-smoke")"
grep -Eiq '^x-astro-cache: (MISS|HIT|STALE)' <<<"$first_headers"
grep -Eiq '^x-astro-cache: HIT' <<<"$second_headers"

kill "$fixture_pid"
wait "$fixture_pid" 2>/dev/null || true
fixture_pid=''
status="$(curl -sS -o /dev/null -w '%{http_code}' "$base/moments/daily?cursor=offline-unique")"
[[ "$status" == '503' ]]
curl -fsS "$base/post/hello-world" >/dev/null

printf 'Moments dynamic smoke passed\n'
