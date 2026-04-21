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
  Done: `gm10.xyz` consumes public valuation marks from `admin.gm10.xyz/api/valuation-public`.
- [ ] Standardize one marketplace checklist for every new venue: approval, custody reference, fees, settlement proof, valuation source, and fallback handling.
- [ ] Expand beyond the first supported workflows into additional collector and marketplace rails.

## 2. veCATCH Staking and Gauges

- [ ] Design a ve(3,3)-inspired staking system where locked `$CATCH` creates voting weight and distribution eligibility.
- [ ] Add gauges so the protocol can route incentives toward long-term holders, liquidity depth, marketplace integrations, and new strategy lanes.
- [ ] Enable eligible wallets to claim or stream realized-profit distributions once the distributor, exclusions, and accounting are production ready.
- [ ] Publish a plain-English staking guide before public actions go live.

## 3. Tokenomics and Max-Supply Review

- [ ] Review the `$CATCH` max supply after community and partner feedback.
- [ ] Model the impact of any supply change on holders, treasury flexibility, liquidity, governance power, staking, and future rounds.
- [ ] Publish a tokenomics update only after the mechanics are modeled, contract-enforceable, and communicated clearly.
- [ ] Keep public supply language aligned with the deployed contracts and migration path.

## 4. Treasury Strategy Expansion

- [ ] Research delta-neutral strategy pilots with `@CardChaseFun`.
- [ ] Define risk caps before any strategy receives treasury allocation: maximum exposure, unwind path, pause authority, reporting cadence, and accepted collateral.
- [ ] Work with Avalanche and collector ecosystem projects to create more leverage for the treasury without hiding risk.
- [ ] Graduate partner strategies into gauges only after public performance reporting and operational review.

## 5. Progressive Decentralization

- [x] Make proof surfaces public for rounds, holdings, marks, treasury accounting, and holder dashboards.
  Done: public proof, portfolio, and holder pages are live on `gm10.xyz`.
- [ ] Move sensitive controls behind clearer Safe, timelock, and governance processes.
- [ ] Shift from ops-led execution to community-guided decisions, then to onchain-enforced treasury controls.
- [ ] Decentralize as fast as the tools, checks, marketplace workflows, and safety limits can support.
