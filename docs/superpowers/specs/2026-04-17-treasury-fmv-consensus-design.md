# Treasury FMV Consensus Design

## Purpose

GM10 needs a repeatable way to produce fair market value marks for treasury card positions. The first version will create a weekly valuation pack every Friday, compute a 2-of-3 source consensus for each active card, and let an admin approve the official mark before it is written onchain.

The public and admin product language should call the unit `USDC 6`. Existing contract fields and ABI names that still say `Usdt6` are treated as legacy stable-6 names and should not be renamed unless a later contract migration explicitly includes that work.

## Scope

In scope:

- Weekly Friday FMV job for active treasury cards.
- Three independent pricing observations per card where available.
- `USDC 6` normalization for all candidate and applied values.
- 2-of-3 consensus check with source staleness and spread flags.
- Admin console workflow on `admin.gm10.xyz` for pack review and approval.
- Manual first-run trigger so the first pack can be generated immediately after implementation.
- Onchain submission through the existing valuation observation path.

Out of scope for v1:

- Fully automated onchain mark submission without admin approval.
- Renaming deployed-facing `Usdt6` contract fields to `Usdc6`.
- Public display of unapproved source-level valuation data.
- Building a custom marketplace data vendor from scratch.
- Legal or accounting attestations beyond source evidence capture.

## Source Strategy

The valuation engine should use three independent source slots. The expected initial candidates are:

1. A primary card pricing API such as PokeTrace, Collectr, PriceDepth, Outlet, or another provider with commercial rights and graded-card support.
2. A benchmark pricing API such as PriceCharting or a comparable source with Pokemon graded-card coverage.
3. A high-confidence evidence source such as PSA auction prices, Card Ladder, eBay sold data, or another source with realized transaction history.

Exact provider selection is configuration, not core business logic. Each source adapter must output the same normalized observation shape:

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

If a source is unavailable, stale, or cannot confidently match the card, that source is excluded from consensus for that card and shown as a warning in the admin console.

## Consensus Rules

A card passes consensus when at least two valid source marks are within a configured tolerance band. The v1 default tolerance is 10% between the two agreeing source marks.

Valid source observations must:

- Match the card identity with sufficient confidence.
- Have a positive `valueUsdc6`.
- Be no more than 7 days stale at pack creation time.
- Use a supported currency conversion path into USDC if the source is not already USD-denominated.

When consensus passes, the proposed official mark is the median of valid source marks. If all three sources are valid but one is an outlier, the median still governs and the outlier is shown in the review pack. When only two valid sources exist and both agree within tolerance, the proposed mark is the lower of the two values to keep the mark conservative.

When consensus fails, the card receives `needs_review` status. No onchain update is proposed unless an admin explicitly overrides the consensus failure in a later workflow.

## Architecture

The system has four bounded units:

1. `ValuationSourceAdapter`: fetches and normalizes observations from one provider.
2. `ConsensusEngine`: evaluates source freshness, agreement, proposed mark, and review status.
3. `ValuationPackStore`: persists the weekly pack, raw payload references, normalized observations, consensus output, admin decisions, and submission transaction hashes in durable object storage.
4. `AdminValuationWorkflow`: exposes pack review, approval, rejection, and onchain submission controls in the admin console.

The deployed admin console must not rely on an ephemeral serverless filesystem for packs. The first implementation should use durable object storage for versioned JSON pack artifacts, with one index file for the latest pack pointer and one immutable artifact per generated pack version. The storage interface should keep the object-store implementation replaceable so the workflow can move to Postgres later without rewriting source adapters or consensus logic.

## Data Flow

Every Friday, the job reads active treasury card positions from the portfolio registry. For each card, it resolves title, set, language, grade, grader, certification number when available, token metadata, Courtyard asset id, and registry position id.

The job queries the configured source adapters and stores raw evidence. Each adapter maps provider-specific data into a normalized observation. The consensus engine then computes:

- valid source count
- consensus status
- proposed `valueUsdc6`
- previous onchain mark
- absolute and percentage delta
- stale source warnings
- outlier source warnings
- onchain cap impact preview

The generated valuation pack is visible in `admin.gm10.xyz`. Admins can approve marks per card or approve the full pack if every card has passing consensus. Approved marks are submitted onchain using the existing registry valuation function. Consensus marks should use `sourceType = ComparableSales`. The onchain `sourceRef` should be the `bytes32` hash of the pack id plus card position id, and `proofHash` should be the `bytes32` hash of the canonicalized evidence artifact for that card.

The public app continues to read only the latest approved onchain mark from the registry. It can show `last marked` and `weekly Friday mark` freshness text, but it should not show unapproved source values.

## Admin Console Workflow

The admin console should add a dedicated valuation workflow section. It should support:

- Generate first pack now.
- View the latest weekly pack.
- See each active treasury card with current onchain mark, source marks, proposed mark, delta, and consensus status.
- Approve individual marks.
- Approve all passing marks in the pack.
- Reject or defer a card mark.
- Submit approved marks onchain.
- Record transaction hashes and submission status.

The workflow should be explicit that approval creates the official mark. Source observations are evidence, not official NAV until approved and submitted.

## Scheduling

The recurring job runs every Friday in the project operating timezone. The current workspace timezone is Europe/Rome, so v1 should use Europe/Rome unless a deployment setting overrides it.

The admin console also needs a manual `Run valuation now` action for the first job and for operational retries. Manual runs create a pack with the same consensus rules as the scheduled Friday run.

## Error Handling

Source failures should not fail the entire pack. They should be recorded per source and per card. A pack can be generated with partial source availability, but a card cannot pass consensus without two valid agreeing sources.

Provider responses that are malformed, stale, mismatched, missing grade detail, or missing price detail should be stored as failed observations with an operator-readable reason.

Onchain submission failures should keep the approval decision intact and mark the submission as failed with the transaction or wallet error. Admins should be able to retry submission without regenerating the pack.

If a Friday job has already generated a pack for the week, reruns should create a new version rather than mutating historical evidence. Admins should clearly see which version is approved and submitted.

## Testing

Unit tests should cover:

- `USDC 6` normalization and rounding.
- Source observation validation.
- 2-of-3 consensus pass, two-source conservative pass, outlier median pass, stale-source exclusion, and consensus failure.
- Pack versioning behavior for repeated Friday or manual runs.
- Onchain submission payload construction, including legacy `Usdt6` ABI fields carrying USDC-denominated 6-decimal values.

Regression tests should cover:

- Admin UI rendering for passing, failing, stale, and partially submitted packs.
- Manual `Run valuation now` pack generation.
- Approval and retry flows without losing evidence.
- Public portfolio and holders pages continuing to show only approved onchain marks.

## Rollout

Milestone 1: implement source interfaces, consensus engine, pack store, and unit tests. The milestone is complete only after regressions and bugs found in these pieces are fixed.

Milestone 2: add the admin console valuation workflow and manual first-run action. The milestone is complete only after UI regression tests pass and approval/submission errors are handled.

Milestone 3: add the Friday scheduled run and public freshness labels. The milestone is complete only after schedule tests, public page regressions, and admin retry tests pass.

Milestone 4: configure real providers and run the first valuation pack now from the admin console. The milestone is complete only after the pack is generated, source evidence is reviewed, and any failed matches are either fixed or documented for manual review.
