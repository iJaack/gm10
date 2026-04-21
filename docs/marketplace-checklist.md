# GM10 Marketplace Checklist

Every marketplace or collector rail must clear the same six gates before adapter work starts. Courtyard remains the regression fixture: if a new venue cannot provide equivalent evidence, the venue needs an explicit fallback or should stay out of the supported workflow.

## Required Gates

1. Registry approval
   - Evidence: marketplace label, marketplace ID, approval transaction.
   - Acceptance: the venue is approved in the portfolio registry before funds or collectibles move.

2. Custody reference
   - Evidence: custody Safe or wallet, external asset ID, marketplace provenance ref.
   - Acceptance: the venue-specific vault, wallet, or custody account is linked to the position provenance.

3. Fee model
   - Evidence: gross amount, marketplace fees, bridge or withdrawal fees, net amount.
   - Acceptance: gross price, fees, and net proceeds can be reconciled in USDT terms.

4. Settlement proof
   - Evidence: execution ref, settlement or proceeds ref, proof ref.
   - Acceptance: purchase or sale settlement has a durable proof reference before final state is recorded.

5. Valuation source
   - Evidence: primary mark source, fallback source, freshness expectation.
   - Acceptance: the venue can feed public marks directly or through an accepted comparable/listing source.

6. Failure handling
   - Evidence: cancel path, refund or unwind path, stale-data fallback, operator owner.
   - Acceptance: operators have an unwind path for expired listings, failed settlements, stale marks, and partial proceeds.

## Operator Rule

All required evidence must have a durable reference or an explicit unavailable fallback before the next marketplace adapter is implemented.
