# FMV Consensus Architecture

Last updated: 2026-04-21

This document is the live architecture record for the GM10 fair market value consensus system. Update it every time work changes FMV consensus behavior, API shape, storage, source ingestion, admin review, scheduled generation, onchain submission, or operational assumptions.

## Maintenance Protocol

Every FMV consensus work item must update this document before the work is considered finished.

Required updates:

- Change `Last updated`.
- Update `Current State` if behavior, readiness, or gaps changed.
- Update affected architecture sections when files, interfaces, storage, authorization, or data flow changed.
- Add one dated entry to `Work Log`.
- Run the relevant regression check and record it in the final handoff.

If a change is unrelated to FMV consensus, do not update this document.

## Current State

The consensus engine exists and is covered by admin tests. It can build valuation packs from normalized source observations, evaluate 2-of-3 source agreement, store immutable pack artifacts, persist mutable review decisions as sidecar state, expose pack generation/read/update APIs, render an admin review workflow, and submit approved marks onchain.

The system has a constrained Courtyard evidence adapter, a PokemonPriceTracker primary-source adapter, a current-registry-mark benchmark, and a card identity resolver. Live registry discovery can replace the placeholder `primary` observation when `POKEMON_PRICE_TRACKER_API_KEY` is configured and the card identity resolver can identify the card by request-time `cardIdentityOverrides`, curated bootstrap portfolio metadata, or Courtyard token metadata. It can replace the placeholder `evidence` observation when the resolved identity includes a Courtyard asset id, or when an explicit runtime Courtyard asset override is injected. Courtyard evidence prefers active sell listings and falls back to Courtyard `fmv_estimate_usd` when no active listing exists. The `benchmark` slot is filled by the current onchain registry mark as a continuity benchmark until a separate benchmark vendor is connected. Packs prefer two valid agreeing sources, but can now produce a proposed mark from one valid external market source such as Courtyard when the other provider is unavailable. A lone current-registry benchmark still stays review-only.

PokemonPriceTracker responses are cached in-memory per warm admin server process. Successful card observations are reused for a bounded TTL, and provider `429` responses produce a zero-confidence primary observation that is also cached for a shorter cooldown period to avoid repeated quota hits during retries.

Existing design background lives in `docs/superpowers/specs/2026-04-17-treasury-fmv-consensus-design.md`.

## Goals

The FMV system should produce repeatable, evidence-backed card marks for treasury positions while keeping official NAV changes under explicit admin control.

Primary goals:

- Collect three independent valuation observations per active treasury card.
- Normalize all marks into `USDC_6`.
- Prefer passing a card when at least two valid sources agree within tolerance.
- Fall back to one valid external market source when another external provider is unavailable.
- Preserve evidence through immutable pack artifacts and deterministic hashes.
- Let an authorized admin approve and submit marks onchain.
- Keep public pages dependent only on approved onchain registry marks.

Non-goals for the current version:

- Fully automated onchain mark submission.
- Public display of unapproved source-level data.
- Renaming deployed contract ABI fields that still use legacy `Usdt6` naming.
- Accounting or legal attestation beyond evidence capture and admin approval.

## Components

### Consensus Engine

File: `apps/admin/server/lib/valuation.js`

Responsibilities:

- Parse and format `USDC_6` values.
- Canonicalize JSON for deterministic evidence hashing.
- Hash pack/card references into `bytes32` values.
- Validate source observations for value, freshness, and confidence.
- Select an agreeing source pair inside tolerance.
- Produce a card consensus result.
- Build immutable valuation pack card payloads.

Consensus rules:

- Default tolerance is 1,000 bps, or 10%.
- Minimum confidence is `0.8`.
- Source observations older than 7 days are stale.
- A normal pass requires at least two valid observations that agree within tolerance.
- If no pair agrees, exactly one valid external market source (`primary` or `evidence`) can still produce a passing proposed mark with a warning.
- A lone current-registry benchmark cannot produce a passing proposed mark by itself.
- With exactly two valid agreeing sources, the proposed value is the lower value.
- With three valid sources, the proposed value is the median valid value.
- Failed cards return `needs_review` and no proposed onchain mark.

### Source Discovery

File: `apps/admin/server/lib/valuation-chain.js`

Responsibilities:

- Read active treasury positions from the portfolio registry.
- Normalize registry positions into valuation card inputs.
- Filter inactive, sold, empty, and placeholder positions.
- Provide placeholder observations for missing provider-backed source slots.
- Fill the `benchmark` slot with the current onchain registry mark as a continuity benchmark.
- Resolve card identity before provider calls.
- Fetch Courtyard Polygon token metadata for registry positions not covered by runtime overrides or curated bootstrap metadata.
- Optionally enrich the `primary` source from PokemonPriceTracker when a card identity and API key are available.
- Optionally enrich the `evidence` source from Courtyard when a resolved identity or runtime override provides a Courtyard asset id.

Current limitation:

- This layer still does not call an independent benchmark pricing vendor.
- The current registry mark benchmark is intentionally conservative: it can only help pass consensus when an external source agrees within tolerance, and cannot by itself move a mark.
- Registry tuples alone do not contain enough rich human-readable card metadata for high-confidence matching, but Courtyard token metadata can fill the display title and Courtyard asset id for owned Courtyard positions.
- Card identity should come from admin/custody metadata, token metadata, or request-time `cardIdentityOverrides`; environment variables must not be the long-lived source of changing card maps.
- The current resolver includes curated metadata for the first live portfolio positions as a bootstrap fallback, but a durable dynamic identity store is still needed.

### Card Identity Resolver

File: `apps/admin/server/lib/card-identity.js`

Responsibilities:

- Resolve valuation card identity by registry position id or card key.
- Prefer request-time `cardIdentityOverrides` when a job or admin flow has fresher metadata.
- Fall back to curated portfolio metadata for the initial live positions.
- Fall back to Courtyard token metadata discovered from the registry's Polygon collection/token id when no runtime or curated identity is available.
- Normalize grade strings such as `PSA 10` into provider-friendly grade ids such as `psa10`.
- Extract Courtyard asset ids from Courtyard asset URLs.
- Return no identity for unknown generic registry titles, preventing broad provider searches against placeholder names.

Identity fields currently used by adapters:

- `title`
- `subtitle`
- `search`
- `grade`
- `tcgPlayerId`
- `courtyardAssetId`

Design rule:

- Provider credentials may live in env.
- Changing card identity maps must not live in env; they must be runtime inputs or durable metadata.

### Source Adapters

Files:

- `apps/admin/server/lib/pokemon-price-tracker.js`
- `apps/admin/server/lib/courtyard.js`

Each source adapter should produce the normalized observation shape used by `valuation.js` and `valuationClient.ts`:

- `sourceId`
- `sourceName`
- `cardKey`
- `observedAt`
- `fetchedAt`
- `valueUsdc6`
- `currency`
- `confidence`
- `rawPayloadRef`
- `sourceUrl`
- `matchReason`

The required source ids are:

- `primary`
- `benchmark`
- `evidence`

Provider errors should become failed observations or warnings for that card, not whole-pack failures. A pack can be generated with partial source availability. A card normally passes with two valid agreeing observations, but can fall back to one valid external market observation when the remaining sources are missing or disagree only because the benchmark is stale/out of range.

Provider research as of 2026-04-20:

- `TCG Price Lookup`: viable API candidate for raw prices on the free tier, but graded values and eBay sold-listing averages require paid commercial tiers. Best fit for `benchmark` after plan approval.
- `PokemonPriceTracker`: viable Pokemon-focused API candidate with free credits, current price data, short history, and PSA/eBay-oriented data claims. Best fit for `primary` or `benchmark` after API response validation.
- `TCG API` / `tcgapi.dev`: viable broad TCG API candidate with a free non-commercial tier and paid commercial tiers. Best fit for raw market baseline, not enough by itself for slab FMV.
- `TCGdex`: useful free card identity and raw-market enrichment source. It has TCGPlayer/Cardmarket pricing embedded in card responses, but it is not a slab FMV source.
- `PriceCharting`: useful benchmark candidate, but API/CSV access is tied to subscription access and current values only; historic sales are not supported by its API docs.
- `eBay`: official Browse API can search active listings, but sold/completed sales require Marketplace Insights-style access, which is limited/restricted. Treat official eBay sold data as high-value but not free/default.
- `Courtyard`: high-value custody and marketplace evidence source, especially for our own vaulted cards and marketplace activity. Build only an authorized, rate-limited adapter/scraper. Courtyard terms prohibit unauthorized automated scraping, and direct `robots.txt` requests returned `403 Forbidden` during research.
- `Apify Courtyard.io Scraper`: exists as a third-party paid scraper. Treat as an operational fallback, not a first-party compliance answer.

Recommended source slot direction:

- `primary`: PokemonPriceTracker or another Pokemon/slab-aware API with commercial permission.
- `benchmark`: TCG Price Lookup, TCG API, TCGdex, or PriceCharting depending on plan access and card coverage.
- `evidence`: authorized Courtyard adapter for owned/listed/sold/vaulted asset evidence, plus eBay sold data only if official or licensed access is available.

### PokemonPriceTracker Primary Adapter

File: `apps/admin/server/lib/pokemon-price-tracker.js`

Responsibilities:

- Fetch `https://www.pokemonpricetracker.com/api/v2/cards` with `Authorization: Bearer <key>`.
- Query by configured `tcgPlayerId` when available.
- Fall back to configured title/search text when `tcgPlayerId` is unavailable.
- Request eBay graded data with `includeEbay=true`.
- Normalize configured graded eBay market data, currently defaulting to `psa10`, into a `primary` source observation.
- Prefer `ebay.salesByGrade.<grade>.smartMarketPrice.price` when available, then fall back to recent market, median, average, or basic price fields.
- Reuse successful observations for identical provider requests during a bounded in-memory TTL.
- De-duplicate concurrent identical provider requests inside a warm server process.
- Convert provider `429` responses into zero-confidence `primary` observations with `rate-limited://pokemon-price-tracker` evidence refs and a bounded cooldown cache.
- Fail closed into a zero-value, zero-confidence `primary` observation when the API key, card identity, provider response, or graded value is unavailable.

Configuration:

- `POKEMON_PRICE_TRACKER_API_KEY` is required for live calls.
- `POKEMON_PRICE_TRACKER_CACHE_TTL_MS` optionally overrides the successful-observation in-memory cache TTL.
- `POKEMON_PRICE_TRACKER_RATE_LIMIT_TTL_MS` optionally overrides the in-memory `429` cooldown TTL.
- Card identity comes from the card identity resolver, not env.
- Request-time `cardIdentityOverrides` may include `tcgPlayerId` where possible, plus optional `grade`, `title`, `search`, `subtitle`, `courtyardAssetId`, and `days`.

Guardrails:

- The API key must stay in local or deployment environment variables and must never be committed.
- Missing or blocked provider calls produce review-only placeholder observations.
- This adapter is one source slot only. It can create a proposed mark when it is the only available valid external market source, but admin approval and onchain submission are still required before the mark becomes official.

### Current Registry Mark Benchmark

File: `apps/admin/server/lib/valuation-chain.js`

Responsibilities:

- Populate the required `benchmark` source slot from the current onchain registry mark.
- Use the active card's `currentValueUsdt6` as `valueUsdc6`.
- Mark the observation as `Current registry mark` with confidence `0.8`.
- Record `rawPayloadRef` as `registry://current-mark`.

Guardrails:

- This is a continuity benchmark, not an independent market source.
- It can contribute to a normal two-source pass when another valid source agrees within tolerance.
- It cannot create a passing proposed mark by itself.
- It should be replaced or supplemented by an independent pricing vendor once one is approved and integrated.

### Courtyard Evidence Adapter

File: `apps/admin/server/lib/courtyard.js`

Responsibilities:

- Fetch a configured Courtyard asset id from `https://api.courtyard.io/index/asset/<assetId>`.
- Fetch Courtyard token metadata from `https://api.courtyard.io/index/token/polygon/<contract>/<tokenIdHex>/metadata.json` for owned Courtyard NFTs when discovery needs human-readable identity.
- Normalize the lowest active non-expired sell listing into an `evidence` source observation.
- Require Polygon USDC listing currency.
- Use the active listing raw USDC amount as `valueUsdc6`.
- Record `rawPayloadRef` as `courtyard://asset/<assetId>/order/<orderId>`.
- If no active listing exists, normalize positive `fmv_estimate_usd` into `valueUsdc6` with confidence `0.8`.
- Record FMV-estimate fallback evidence as `courtyard://asset/<assetId>/fmv_estimate_usd`.
- Fail closed into a zero-value, zero-confidence `evidence` observation when Courtyard blocks or rejects the request.

Configuration:

- Courtyard asset ids come from the card identity resolver, not env.
- The resolver can derive Courtyard asset ids from token metadata `external_url`.
- Runtime `courtyardAssetMap` injection is still supported for tests or one-off jobs, but it is not a deployment configuration source.
- Request-time `cardIdentityOverrides` may provide `courtyardAssetId` or a `courtyardUrl`.

Guardrails:

- The adapter uses a clear `GM10ValuationBot/1.0 (+https://gm10.xyz)` user agent.
- It does not bypass authentication, CAPTCHA, robots controls, or rate limits.
- It does not scrape arbitrary search pages.
- It only fetches direct token metadata and direct asset endpoints for registry-owned assets.
- It is evidence-only by source slot, but it can create a proposed mark when it is the only available valid external market source. Admin approval and onchain submission are still required before the mark becomes official.
- Active sell listings are preferred over Courtyard FMV estimates because they are stronger market evidence.

### Valuation Pack API

File: `apps/admin/api/valuation-pack.js`

Responsibilities:

- `GET /api/valuation-pack`: return latest pack after read authorization.
- `POST /api/valuation-pack`: generate a new pack after write authorization.
- `POST /api/valuation-pack` with `action: "update-card"`: persist a card review decision and optional submitted transaction hash after write authorization.
- Validate submitted cards before pack generation.
- Validate review update pack ids, position ids, decisions, and submitted transaction hashes before storage.
- Enforce exactly three distinct observations with the expected source ids.
- Generate server-owned pack ids.
- Discover active cards if no cards are submitted.
- Save the pack through the pack store.

Important constraints:

- Caller-supplied `packId` is ignored.
- Repeated runs create distinct pack ids.
- Malformed card arrays are rejected before save or discovery.
- Malformed `cardIdentityOverrides` are rejected before discovery.
- Source ids must be trimmed, distinct, and exactly `benchmark`, `evidence`, and `primary`.
- Empty or omitted `cards` triggers registry discovery. In that path, optional `cardIdentityOverrides` are passed to discovery as runtime metadata hints.

### Valuation Pack Store

File: `apps/admin/server/lib/valuation-store.js`

Responsibilities:

- Persist immutable pack JSON artifacts.
- Persist mutable per-pack review sidecars for card decisions and submitted transaction hashes.
- Persist a mutable latest-pack pointer.
- Use Vercel Blob when `BLOB_READ_WRITE_TOKEN` is configured.
- Fall back to a local file store for local development and tests.

Storage paths:

- Pack artifact: `valuation-packs/<packId>.json`
- Review sidecar: `valuation-packs/<packId>.review.json`
- Latest pointer: `valuation-packs/latest.json`

Pack artifacts are immutable in local mode. Review sidecars and the latest pointer are mutable. Reads merge review sidecar state into the returned pack while preserving the source-evidence artifact.

### Authorization

File: `apps/admin/server/lib/valuation-auth.js`

Responsibilities:

- Verify signed admin messages for pack reads and writes.
- Verify EOAs with EIP-191 message recovery.
- Verify Safe and other contract-wallet signatures with EIP-1271 `isValidSignature`.
- Verify EOA owner signatures for Safe-address requests by recovering the signer, checking `Safe.isOwner(signer)`, and then checking roles on the Safe address.
- Enforce short message freshness windows.
- Verify the requested admin address matches the signature model.
- Check the requested admin address has one of the allowed roles on the fund proxy.

Allowed roles:

- `DEFAULT_ADMIN_ROLE`
- `MANAGER_ROLE`
- `OPERATOR_ROLE`

Bypass modes:

- `request.internal === true` is accepted for internal cron calls.
- `GM10_VALUATION_ALLOW_UNAUTHENTICATED_WRITES=true` allows write bypass.
- `GM10_VALUATION_ALLOW_UNAUTHENTICATED_READS=true` allows read bypass.

Bypass modes should only be used in controlled local or test contexts.

### Admin UI

File: `apps/admin/src/panels/ValuationPanel.tsx`

Related files:

- `apps/admin/src/components/RoleGate.tsx`
- `apps/admin/src/hooks/useAdminRole.ts`

Responsibilities:

- Gate the admin surface by checking roles against the Safe app context address when the app is opened inside Safe.
- Share Safe app context across the gate and valuation panel so pack read/generate requests do not race back to the connected signer EOA.
- Bound Safe app context loading so the admin gate cannot wait forever if the Safe SDK handshake stalls.
- Fall back to the configured Treasury Safe only when the Safe SDK context times out and the connected signer is the configured 1-of-1 signer; API and contract checks still enforce real authorization.
- Read admin roles for the gate through a bounded Avalanche public-client check instead of embedded-wallet `wagmi` reads, which can remain pending inside Safe.
- When the Safe context timeout path is active for the configured 1-of-1 signer, allow the UI gate through without an extra browser-side RPC role read; API reads/writes and onchain transactions still enforce authorization.
- Treat pending Safe context as the configured Treasury Safe fallback for the known 1-of-1 signer instead of waiting for a timer inside the Safe iframe.
- Discover active registry positions in the browser.
- Let an admin paste optional card identity overrides as JSON.
- Let an admin paste optional source observation overrides as JSON.
- Sign read and generate requests.
- Load the latest valuation pack.
- Generate a valuation pack manually through server-side provider discovery when source observation overrides are empty.
- Render source observations, warnings, proposed mark, approval status, source ref, and proof hash.
- Allow approval only for cards with passing consensus and persist that approval to pack review state.
- Submit approved passing marks onchain.
- Persist submitted transaction hashes to pack review state after wallet submission returns a hash.

Onchain submission:

- Contract function: `submitValuationObservation`
- `sourceType`: `ComparableSales` (`2`)
- `sourceRef`: hash of pack id plus position id.
- `value`: proposed `USDC_6` mark.
- `proofHash`: hash of canonicalized observations.

### Cron

File: `apps/admin/api/valuation-cron.js`

Responsibilities:

- Accept only `GET`.
- In production, require `CRON_SECRET`.
- Convert the cron request into an internal valuation-pack generate request.

Schedule:

- Configured in `apps/admin/vercel.json`.
- Current schedule: `0 6 * * 5`, which runs Fridays at 06:00 UTC.

## Data Flow

Manual admin run:

1. Admin opens the `Valuation` panel.
2. UI reads active registry positions.
3. Admin optionally pastes card identity JSON keyed by position id or card key when fresh metadata is needed.
4. Admin leaves source observations JSON empty for server-side provider discovery, or pastes source observations JSON to force manual observations.
5. Admin signs a `GM10 valuation pack generate:<timestamp>` message.
6. UI posts an empty `cards` array plus optional `cardIdentityOverrides` to `/api/valuation-pack` for provider discovery.
7. API verifies authorization and validates any runtime override payloads.
8. API creates a server-owned pack id.
9. API discovers active treasury cards from the registry and enriches provider observations where configured.
10. API calls `buildValuationPack`.
11. Consensus engine evaluates each card.
12. Store writes the immutable pack artifact and latest pointer.
13. UI renders the pack.
14. Admin approves passing cards.
15. UI submits approved marks onchain.

Scheduled run:

1. Vercel invokes `/api/valuation-cron`.
2. Cron validates `CRON_SECRET` in production.
3. Cron calls the valuation-pack handler with `internal: true`.
4. Pack API discovers active treasury cards from the registry.
5. Provider adapters enrich configured source observations when identity and credentials are available.
6. Pack is stored as latest for admin review.

Public app flow:

1. Public pages read portfolio registry marks and fund accounting.
2. Public pages show only approved onchain marks.
3. Public pages do not read valuation pack source observations.

## Data Model

### Source Observation

The source observation is the adapter boundary. It must be provider-neutral and serializable.

```ts
type SourceObservation = {
  sourceId: string;
  sourceName: string;
  cardKey: string;
  observedAt: string;
  fetchedAt: string;
  valueUsdc6: string;
  currency: string;
  confidence: number;
  rawPayloadRef: string;
  sourceUrl: string;
  matchReason: string;
};
```

### Valuation Pack Card

A valuation pack card binds the registry position, evidence, consensus output, and onchain submission identifiers.

```ts
type ValuationPackCard = {
  positionId: number;
  cardKey: string;
  title: string;
  currentValueUsdc6: string;
  observations: SourceObservation[];
  consensus: {
    status: 'passed' | 'needs_review';
    proposedValueUsdc6?: string;
    validSourceCount: number;
    agreeingSourceIds: string[];
    warnings: string[];
  };
  decision: 'pending' | 'approved' | 'rejected';
  sourceRef: `0x${string}`;
  proofHash: `0x${string}`;
  submittedTxHash: string;
};
```

### Valuation Pack

```ts
type ValuationPack = {
  packId: string;
  generatedAt: string;
  cadence: string;
  unit: 'USDC_6';
  cards: ValuationPackCard[];
};
```

## Security Boundaries

The FMV system has four main trust boundaries:

- External pricing sources to source adapters.
- Source adapters to normalized valuation pack input.
- Admin wallet signatures to pack API authorization.
- Admin UI submission to onchain registry mutation.

Controls currently in place:

- API-side card payload validation.
- Signed admin messages for read and generate actions.
- Onchain role checks before API access.
- Server-owned pack ids.
- Immutable pack artifacts.
- Mutable review sidecars for approval decisions and submitted transaction hashes.
- Deterministic source and proof hashes for onchain references.
- Production cron secret requirement.
- Admin UI blocks submission unless consensus passed and local approval exists.

Open security gaps:

- Real source adapters need payload retention and vendor-specific input validation.
- PokemonPriceTracker now has a primary-source adapter, but production use depends on keeping the API key in env configuration and resolving each treasury position to a reliable card identity.
- Courtyard evidence now has a constrained adapter, but it still relies on resolved asset ids and should be treated as permission-sensitive.
- Submitted transaction hashes are recorded when the wallet returns a hash, but receipt success is not yet reconciled back into review state.
- Provider rate-limit handling is currently process-local only. Durable cross-instance provider throttling is still needed if valuation traffic grows beyond manual admin runs.

## Testing

Existing admin tests cover:

- `USDC_6` parsing.
- 2-of-3 consensus pass.
- Two-source conservative pass.
- Single external market source fallback when the other provider is unavailable.
- Lone current-registry benchmark staying review-only.
- Stale source exclusion.
- Consensus failure on spread.
- Custom tolerance.
- Pack source/proof hashing.
- Pack generation API validation.
- Safe retry pack ids.
- Auth requirements for read and write.
- Treasury card discovery normalization.
- Cron fail-closed behavior in production.
- Pack store latest pointer and immutable pack write.
- Pack review sidecar merge without rewriting immutable pack artifacts.
- Pack API update-card validation and persistence.
- Card identity resolution from curated metadata and runtime overrides.
- PokemonPriceTracker and Courtyard discovery enrichment without env-hosted card maps.

Primary command:

```bash
npm --prefix apps/admin test
```

Broader repo command:

```bash
npm run check
```

## Known Gaps

The following gaps must be addressed before the FMV system is production-complete:

- Add an independent benchmark provider adapter so PokemonPriceTracker and Courtyard do not need the current-registry-mark continuity benchmark.
- Add a durable dynamic card identity store fed by admin/custody metadata, token metadata, or purchase intake artifacts.
- Expand identity resolution beyond the current curated bootstrap metadata and request-time overrides.
- Store raw provider payloads or stable evidence refs.
- Reconcile submitted transaction receipt success or failure into durable review state.
- Add UI regression tests for passing, failing, stale, and partial submission states.
- Add public freshness labels for latest approved mark timing.
- Define production provider credentials and rate-limit behavior.
- Decide whether failed consensus can ever be overridden, and if so, with what durable audit trail.

## Work Log

### 2026-04-20

- Created this architecture document.
- Recorded the current implementation state: consensus, pack API, pack store, auth, admin panel, and cron exist.
- Recorded the key remaining gap: real external FMV source adapters are not implemented yet, so registry-discovered cards produce placeholder observations and `needs_review`.
- Verified existing admin valuation behavior earlier with `npm --prefix apps/admin test`: 42 tests passed.
- Researched provider access options and added candidate source-slot mapping for TCG Price Lookup, PokemonPriceTracker, TCG API, TCGdex, PriceCharting, eBay, and Courtyard.
- Marked Courtyard scraping as permission-sensitive because Courtyard terms restrict unauthorized automated scraping and direct `robots.txt` requests returned `403 Forbidden` during research.
- Implemented a constrained Courtyard evidence adapter in `apps/admin/server/lib/courtyard.js`.
- Initially wired treasury card discovery to replace the placeholder `evidence` observation from a configured Courtyard asset id by position id or card key.
- Added regression tests for Courtyard evidence normalization, blocked-request fail-closed behavior, and discovery enrichment.
- Implemented a PokemonPriceTracker primary-source adapter in `apps/admin/server/lib/pokemon-price-tracker.js`.
- Initially wired treasury card discovery to replace the placeholder `primary` observation when `POKEMON_PRICE_TRACKER_API_KEY` and a configured PokemonPriceTracker card identity were available.
- Added non-secret env placeholders to `.env.example`.
- Added regression tests for missing-key fail-closed behavior, `tcgPlayerId` lookup, title search fallback, and discovery enrichment.
- Replaced env-hosted card maps as the normal provider-discovery path with a card identity resolver in `apps/admin/server/lib/card-identity.js`.
- Kept provider credentials in env, but removed dynamic card map placeholders from `.env.example`.
- Added request-time `cardIdentityOverrides` support for valuation pack generation when discovery needs fresh card metadata hints.
- Wired registry discovery to use resolved identity for PokemonPriceTracker primary observations and Courtyard evidence observations without env-hosted card maps.
- Added regression tests for card identity resolution, runtime identity override forwarding, and provider enrichment without env-hosted card maps.
- Updated the admin valuation frontend so `Run valuation now` uses server-side provider discovery when source observations are empty.
- Added a runtime card identity override JSON field to the admin valuation panel for new cards whose metadata is not yet resolvable.
- Moved shared admin server libraries from `apps/admin/api/lib` to `apps/admin/server/lib` so Vercel only treats real API endpoints as Serverless Functions.
- Added Safe/EIP-1271 authorization support for valuation pack read and generate requests.
- Updated the valuation panel to use the Safe app context address as the admin authorization address when opened inside Safe.
- Added Courtyard evidence fallback for positive `fmv_estimate_usd` when a vaulted asset has no active sell listing.
- Replaced the zero benchmark placeholder with the current onchain registry mark as a continuity benchmark, allowing a card to pass only when another valid source agrees within tolerance.
- Added regression tests for Courtyard FMV-estimate evidence and current-registry-mark benchmark generation.
- Added Courtyard token metadata discovery for registry positions whose identity is not covered by runtime overrides or curated bootstrap metadata.
- Verified live discovery now resolves positions 4 and 5 from Polygon token metadata instead of showing generic `Treasury card #N` titles.
- Updated the admin role gate to check fund roles against the Safe app context address instead of the connected signer EOA when opened inside Safe.
- Shared Safe app context across admin components and blocked valuation pack actions while Safe context is loading, preventing intermittent signer-address authorization failures.
- Added a bounded Safe app context timeout and a known-signer Treasury Safe fallback so the role gate cannot remain indefinitely stuck on `Checking role`.
- Replaced the admin role gate's `wagmi` role reads with bounded Avalanche public-client reads and exposed role-check timeout/error state in the gate.
- Removed the browser-side role read from the configured Safe timeout fallback path so Safe iframe RPC behavior cannot loop the gate for the known 1-of-1 signer.
- Removed Safe-context loading as a blocking state for both the admin gate and valuation request signing when the connected signer matches the configured Treasury Safe signer.
- Updated valuation pack API authorization to accept a Safe request signed by a Safe EOA owner while continuing to check fund roles on the Safe address.
- Added PokemonPriceTracker in-memory successful-response caching, concurrent request de-duplication, and `429` cooldown handling so repeated valuation runs do not keep hitting the provider while rate limited.

### 2026-04-21

- Added mutable valuation pack review sidecars so card approval decisions and submitted transaction hashes survive reloads without rewriting immutable evidence pack artifacts.
- Added the `update-card` valuation pack API action with authorization, pack id validation, position id validation, decision validation, transaction hash validation, and missing-card handling.
- Updated the admin valuation panel to persist card approval and submitted transaction hash state through the API.
- Added regression coverage for review sidecar merging, API update persistence, malformed update rejection, and update-message authorization.
- Updated consensus fallback behavior so a valid external market observation, such as Courtyard evidence, can produce a proposed mark when PokemonPriceTracker is unavailable, while a lone current-registry benchmark remains review-only.
