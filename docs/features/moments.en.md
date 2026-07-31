# Moments

Moments is an optional dynamic archive backed by the public read API of
[koharu-suite](https://github.com/cosZone/koharu-suite). It fetches channel messages at request time while existing
blog posts remain statically generated. The feature is off by default. When disabled, it does not require suite,
read `KOHARU_SUITE_URL`, or register Moments routes.

## Enable Moments

First expose koharu-suite through a public HTTPS origin reachable by both browsers and the astro-koharu Node
container. Never put an admin token, database credentials, or a Docker-only hostname in this URL.

Enable the feature in `config/site.yaml`:

```yaml
moments:
  enabled: true
  path: moments
  title: Moments
  description: Short updates from my channels
  ogImage: /img/moments-og.png
```

Set the server-only origin in `.env`:

```env
KOHARU_SUITE_URL=https://suite.example.com
```

`path` accepts a safe nested path such as `life/moments`. Once enabled, deploy with an Astro Node standalone
runtime; the default nginx image cannot execute on-demand routes. See the
[deployment guide](../overview/11-deployment-adapters.md).

## Configure channels

You may omit `channels` entirely. All public channels are then visible and each slug falls back to the Telegram
username, then to the full Suite channel UUID. Configure a stable slug for long-lived production links:

```yaml
moments:
  enabled: true
  path: life/moments
  pathAliases:
    - moments
  channels:
    - id: 550e8400-e29b-41d4-a716-446655440000
      slug: daily
      title: Daily
      primary: true
      hidden: false
      ogImage: /img/daily-og.png
      aliases:
        - old-daily
```

- Configured channels keep YAML order; newly discovered channels follow them.
- At most one channel may be `primary`; otherwise the first visible channel is used.
- `hidden` removes a channel from every Moments page, search, RSS, and direct detail URL without stopping suite ingestion.
- `pathAliases` and channel `aliases` create only explicit 308 redirects. Username changes are not tracked automatically.
- Copy a channel ID from the koharu-suite Owner Desk. No ID is needed when `channels` is omitted.
- Builds fail when paths, slugs, or aliases collide with routes, locales, featured series, or one another.

Place a sortable navigation placeholder where the entry should appear:

```yaml
navigation:
  - name: Home
    path: /
  - feature: moments
    icon: ri:chat-smile-3-fill
  - name: About
    path: /about
```

The placeholder disappears while Moments is disabled. If omitted, the enabled entry is inserted after Archives.

## Routes and content semantics

Moments includes an index, channel feeds, detail pages, cursor pagination, simple search, and global/channel RSS.
It is one canonical dynamic area and is not duplicated under `/en` or `/ja`. Telegram remains the source, but UI
links use “View source message”; no fake source link is rendered when the public Telegram URL is unavailable.

Messages are newest-first. Long feed text is collapsed only after JavaScript confirms overflow; detail pages always
show the full body. `revision > 1` means only “Updated” because no reliable edit timestamp exists. Adjacent messages
with the same `mediaGroupId` share one album card. When Telegram Desktop JSON omits that field, Moments coalesces
only same-channel messages with one timestamp, consecutive source IDs, media on every member, and at most one
caption. Candidates touching a cursor boundary remain separate so unloaded media is never hidden; every suite UUID
and detail permalink remains valid. Album cards render every member, and each attachment keeps its own source link.

RSS uses the stable suite message UUID as GUID and that stable member's original `publishedAt` as `pubDate`; an album
selects a member UUID independent of caption edits as its RSS GUID anchor. The album card and RSS item link instead
follow the member that supplies the body, so the opened detail matches the displayed caption. Editing updates the body
without changing the GUID or publication date.

## Cache and failure boundaries

The default single-container deployment uses an in-process memory cache: about 300 seconds for pages and RSS, and
60 seconds for search. New or edited content can therefore take up to five minutes to appear. The cache is cleared on
restart. Multi-instance deployments need a verified shared cache; per-process memory is not coherent.

Missing channels/messages return 404, rate limiting returns 429, and network, timeout, upstream 5xx, or invalid
responses return a site-shell 503. Error responses do not enter the normal cache. Bare Node does not promise a
24-hour stale-on-error window; configure that only in a verified CDN, proxy, or distributed provider. A temporary
suite outage affects Moments only: prerendered pages remain available and container liveness stays healthy.

## End-to-end local acceptance

Use a separate checkout created from the public repository, never a repository containing private posts:

1. Enable Moments in `config/site.yaml` and set the public suite origin in `.env`.
2. Run `pnpm install` and `pnpm dev`.
3. Check index, channel, detail, search, RSS, permalink, and “View source message”.
4. Send text and media to the test channel, then edit the text. Development mode has no route cache wait.
5. Run `pnpm docker:up:dynamic`, followed by `pnpm test:moments:docker`.
6. Stop suite and request an uncached Moments URL: it should return 503 while static pages still return 200.
7. Restore suite and finish with `pnpm docker:down:dynamic`.

Changes to the path, channel overrides, title, navigation, or OG configuration require a rebuild. New or edited suite
messages do not.
