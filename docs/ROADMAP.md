# GM10 Public Roadmap

GM10 is moving from founder-led collectible execution toward transparent, gauge-driven, progressively decentralized treasury management. The project is still being built in public: when a milestone ships, this roadmap should be updated with a checked item and a short completion note.

## Roadmap Tracking Rules

- `[x]` means shipped or live enough for public verification.
- `[ ]` means planned, in progress, or waiting on design, audits, partners, or governance.
- Completed items should include public-safe details such as a shipped date, production URL, contract address, or proof link.
- Sensitive operational details, unresolved risks, and internal blockers belong in the admin roadmap, not here.

## 1. Smooth Marketplace Execution

- [x] Record treasury positions with marketplace provenance, custody references, purchase proofs, and onchain marks.
  Done: active card positions are visible through the public portfolio and proof surfaces.
- [x] Add valuation fallback behavior so available market sources can drive marks when another source is unavailable.
  Done: public valuation marks now use available market data such as Courtyard when PokemonPriceTracker data is unavailable.
- [x] Publish public card marks on the website from the latest valuation projection.
  Done: `gm10.xyz` consumes public valuation marks from the same main GM10 deployment API that also serves `admin.gm10.xyz`.
- [x] Standardize one marketplace checklist for every new venue: approval, custody reference, fees, settlement proof, valuation source, and fallback handling.
  Done: the six-gate checklist now lives in `docs/marketplace-checklist.md`, shared app data, and the admin Operations marketplace tab with Courtyard as the regression fixture.
- [ ] Expand beyond the first supported workflows into additional collector and marketplace rails.

## 2. veCATCH Staking and Gauges

- [ ] Design a ve(3,3)-inspired staking system where locked `$CATCH` creates voting weight and distribution eligibility.
- [ ] Add gauges so the protocol can route incentives toward long-term holders, liquidity depth, marketplace integrations, and new strategy lanes.
- [ ] Enable eligible wallets to claim or stream realized-profit distributions once the distributor, exclusions, and accounting are production ready.
- [ ] Publish a plain-English staking guide before public actions go live.

## 3. Dynamic Tokenomics Upgrade

- [ ] Ship the V7 upgrade path with no max supply, round-based buyer mints, and five 1% segment allocations per finalized round.
- [ ] Deploy the V7 tokenomics controller so segment wallets are excluded from profit share by onchain state, not frontend assumptions.
- [ ] Enforce attribution-gated redemption so transferable segment or secondary-market tokens cannot redeem without investor attribution.
- [ ] Keep public supply language aligned with the deployed contracts and Safe-executed migration path.

## 4. Treasury Strategy Expansion

- [ ] Research delta-neutral strategy pilots with `@CardChaseFun`.
- [ ] Define risk caps before any strategy receives treasury allocation: maximum exposure, unwind path, pause authority, reporting cadence, and accepted collateral.
- [ ] Work with Avalanche and collector ecosystem projects to create more leverage for the treasury without hiding risk.
- [ ] Graduate partner strategies into gauges only after public performance reporting and operational review.

## 5. Progressive Decentralization

- [x] Make proof surfaces public for rounds, holdings, marks, treasury accounting, and holder dashboards.
  Done: public proof, portfolio, and holder pages are live on `gm10.xyz`.
- [x] Add living roadmap tracking for public and internal work.
  Done: the public roadmap lives in this document, and the private admin roadmap is a horizontal blocker diagram at `admin.gm10.xyz`, served by the main GM10 deployment.
- [ ] Move sensitive controls behind clearer Safe, timelock, and governance processes.
- [ ] Shift from ops-led execution to community-guided decisions, then to onchain-enforced treasury controls.
- [ ] Decentralize as fast as the tools, checks, marketplace workflows, and safety limits can support.
