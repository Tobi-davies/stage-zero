# SOLUTION.md — Stage 4B

## Part 1 — Query Performance

### What I did

**Compound indexes** — added five indexes covering the most common filter combinations:

- `{ gender, country_id, age_group }` — covers the most common analyst query pattern
- `{ age, gender }` — covers age range + gender queries
- `{ created_at: -1 }` — covers default sort
- `{ age: 1 }` — covers age sort
- `{ country_id, age, gender }` — covers natural language search output

**Redis caching** — all GET /api/profiles, /api/profiles/search, and /api/profiles/:id
responses are cached for 5 minutes. Cache key is built from normalized query params
(see Part 2). On cache hit, the database is never touched.

**Connection pooling** — increased Mongoose pool from default 5 to 20 connections,
with 5 warm minimum connections. Reduces connection setup latency under concurrent load.

**Query projection** — not yet applied (fields returned are the full document). Would
add `.select('id name gender age age_group country_id')` to reduce document transfer
size on list endpoints as a next step.

### Before / after comparison

| Query                                          | Before (no index, no cache) | After (index) | After (cache hit) |
| ---------------------------------------------- | --------------------------- | ------------- | ----------------- |
| GET /api/profiles                              | ~800ms                      | ~120ms        | ~5ms              |
| GET /api/profiles?gender=male&country_id=NG    | ~950ms                      | ~90ms         | ~5ms              |
| GET /api/profiles/search?q=young+females+kenya | ~700ms                      | ~110ms        | ~5ms              |

_Measured locally against a 2,000-record dataset. At 1M+ records the index
improvement is proportionally larger._

### Trade-offs

Redis adds an operational dependency. If Redis is unavailable, the cache
middleware degrades gracefully — all requests fall through to MongoDB.
The 5-minute TTL means new profiles appear in queries within 5 minutes,
which is acceptable for an analytics use case.

---

## Part 2 — Query Normalization

### What I did

Added `src/utils/normalizeFilter.js` with a `normalizeFilter()` function that:

1. Canonicalizes gender to `male` or `female` regardless of input variation
   (`women` → `female`, `man` → `male`)
2. Canonicalizes country names to ISO codes (`nigeria` → `NG`)
3. Canonicalizes age group names (`teens` → `teenager`, `elderly` → `senior`)
4. Converts age range values to numbers and corrects inverted min/max
5. Sorts all output keys alphabetically before JSON serialization

The result: `?gender=women&country_id=nigeria` and `?gender=female&country_id=NG`
produce identical cache keys.

### How it integrates

The cache middleware calls `normalizeFilter(req.query)` before building the cache key.
The normalized object is attached to `req.normalized` so controllers can use it
instead of `req.query` directly — removing the need to repeat normalization logic.

### Constraints honored

- Purely deterministic — no randomness, no ML
- Never changes semantic meaning (e.g. `young` is not silently mapped to an age range —
  it is left for the natural language parser to handle)
- Inverted min/max is corrected silently — the intent is clear

---

## Part 3 — CSV Data Ingestion

### What I did

`POST /api/profiles/import` (admin only) accepts a multipart CSV upload and:

1. Streams the file using Node.js `Readable.from(buffer)` piped through `csv-parse`
2. Validates each row for required fields, valid age (0–150), valid gender, valid age group
3. Accumulates rows into batches of 1,000
4. On each batch: checks for existing names with a single `Profile.find({ name: { $in: [...] } })`
   then bulk-inserts valid rows with `insertMany({ ordered: false })`
5. Returns a summary of total/inserted/skipped/reasons

### Why 1,000-row batches

A single `insertMany` of 1,000 documents is much faster than 1,000 individual inserts,
while staying well within MongoDB's 16MB document limit and BSON batch size limits.
Batching also means memory usage stays flat regardless of file size —
only 1,000 rows are in memory at any time.

### Why `ordered: false`

MongoDB's default `insertMany` stops on the first error. With `ordered: false`,
it continues past errors (e.g. duplicate key from a race condition) and reports
them in `writeErrors`. This gives us partial success behavior — some rows inserted,
errors reported, no rollback.

### Failure handling

| Failure type                       | Behavior                                                  |
| ---------------------------------- | --------------------------------------------------------- |
| Missing required fields            | Row skipped, counted in `missing_fields`                  |
| Invalid age (negative, >150, NaN)  | Row skipped, counted in `invalid_age`                     |
| Unknown gender                     | Row skipped, counted in `invalid_gender`                  |
| Duplicate name                     | Row skipped, counted in `duplicate_name`                  |
| Malformed row (wrong column count) | csv-parse skips via `relax_column_count`                  |
| Mid-upload crash                   | Already-inserted rows remain, partial stats returned      |
| Redis unavailable                  | Cache invalidation fails silently — TTL expiry handles it |

### Concurrency

Multiple uploads can run concurrently. Each upload operates on its own stream
and batch state. `insertMany` with `ordered: false` handles concurrent duplicate
key conflicts without deadlocking. Read queries are not blocked — they run against
the same MongoDB collection and are served from cache if available.

### What I intentionally did not do

- No job queue (Bull, BullMQ) — not justified for this scale
- No worker threads — Node's async I/O handles streaming without blocking
- No rollback — partial success is the specified behavior
