# Gengar Sale Workflow - 2026-06-10

## Scope

- Asset: 2021 Pokemon Sword & Shield Gengar VMAX, High-Class Deck #002, PSA 10 GEM MINT.
- Registry position: `1`.
- Courtyard asset: `https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008`.
- Sale tx: `0x71f546e311d3196c0babe3dd76754c23710f298938b8953d6017cfd704e71c3a`.
- Sale proceeds in sale tx: `150.000000` Polygon USDC.
- Polygon Safe balance before bridge: `202.000000` USDC.
- Workflow decision: treat only `150.000000` USDC as this sale's gross proceeds; leave the extra `52.000000` USDC in the Polygon Safe until separately classified.
- LP support decision: LP support should accrue and be executed only on Pharaoh, with no LFJ leg.

## Verification

- Polygon sale tx succeeded in block `88,175,795` at `2026-06-09T01:31:18Z`.
- Sale tx USDC transfers:
  - `0x6646a9da975d31141BebD35F4eF4f0FE1D7fBC41` to Courtyard exchange `0x5E4943373c2198625BD441Ae0629E9E7b4FB4797`: `150.000000` USDC.
  - Courtyard exchange `0x5E4943373c2198625BD441Ae0629E9E7b4FB4797` to seller wallet `0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50`: `150.000000` USDC.
- Later Polygon Safe receipt:
  - Tx `0xbb26ab128c5c60e5e1b6e7528aa7f66bdb64d94c9b8066796b7b504d357171e5`.
  - Seller wallet `0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50` to Polygon Safe `0x39971795266a794a8156271729A07994952a6FAD`: `202.000000` USDC.
- Avalanche registry position `1`:
  - Status: `Active`.
  - Acquisition price: `96.000000` USDC.
  - Current value: `96.100000` USDC.
- Planned sale key label: `courtyard-sale-1-71f546e3`.
- Planned sale key: `0x3f6afdac0a7aca2f86d0c1c2398f57e609844b142c0d838298b014383a0d35d8`.

## Planned Execution

1. Bridge exact `150.000000` Polygon USDC from the Polygon Safe to the Avalanche Safe through Circle CCTP V2.
2. Record and finalize the sale on Avalanche:
   - `authorizeSale`.
   - `recordSaleExecution`.
   - `recordExternalSaleProceeds`.
   - `confirmStableSaleProceeds`.
   - `finalizeSaleWithMarketSnapshot`.
3. Confirm LP support accrued from the architecture-aware router.
4. Execute the LP-support budget on Pharaoh only:
   - Release accrued support to the Avalanche Safe.
   - Convert half into WAVAX-side support and half into CATCH-side support.
   - Mint the Pharaoh CL position to the configured custody owner.
   - Use live V8 release-as-execution accounting: `releaseLpSupportToken` decrements the accrued LP support budget, so do not also call `executeLpSupport` for the same budget.
   - Re-pause LP support and clear temporary allowances.

## Execution Log

- CCTP TokenMessengerV2 approval from Polygon Safe:
  - Tx: `0x580fb90dbbd0d2e1bac117e5ede77611cf89beac947e7e9519f7af7b0bdb045e`.
  - Approved spender: `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`.
  - Amount: `150.000000` Polygon USDC.
  - Confirmed in Polygon block `88,264,942`.
- Pending: CCTP burn from Polygon Safe.
  - The burn Safe call simulated successfully after approval.
  - First submission attempt failed during Ledger signing with `hidapi error: hid_error is not implemented yet`; no transaction was submitted.
  - Post-failure verification: Polygon Safe nonce still `8`, Polygon Safe USDC still `202.000000`, CCTP allowance still `150.000000`.
- CCTP burn from Polygon Safe:
  - Tx: `0xfa4677b194b2e2ce19081354e7cf9a7ebdf586c25b7628675a2012cc4e17316e`.
  - Amount: `150.000000` Polygon USDC.
  - Recipient: Avalanche Safe `0x39971795266a794a8156271729A07994952a6FAD`.
  - Confirmed in Polygon block `88,265,707`.
  - Polygon Safe post-burn USDC: `52.000000`.
- CCTP receive on Avalanche:
  - Tx: `0x78f09e166524df816e5994961340b7fd0792ec86db517ab306ebf1836f8ee594`.
  - Minted `150.000000` Avalanche USDC to the Avalanche Safe.
  - Confirmed in Avalanche block `87,664,809`.
- Avalanche sale record, settlement confirmation, and architecture-aware finalization:
  - Tx: `0xdac399ce089221d2d032d0cc7963c3770a6b0d31e1b1159a6ad81d5294a10380`.
  - Confirmed in Avalanche block `87,665,491`.
  - Batch actions:
    - `authorizeSale` for sale key `0x3f6afdac0a7aca2f86d0c1c2398f57e609844b142c0d838298b014383a0d35d8`.
    - `recordSaleExecution` with `150.000000` gross USDC, `0` marketplace fees, and `0` bridge fees.
    - `recordExternalSaleProceeds` referencing Polygon USDC and the sale tx.
    - Approved `150.000000` Avalanche USDC from the Safe to the fund.
    - `confirmStableSaleProceeds` with pull-from-Safe enabled.
    - `finalizeSaleWithMarketSnapshot` through router `0x009c742f514c0f245d2c0d0380c0843b97e8dbfa`.
  - Post-finalization checks:
    - Sale status: `5` / finalized.
    - Position status: `3` / sold.
    - Net proceeds: `150.000000` USDC.
    - LP support accrued: `13.500000` USDC.
    - Buyback-burn accrued: `0.000000` USDC.
    - LP support remained paused pending explicit execution.
- Pharaoh-only LP support preparation:
  - Live controls before execution: continuous mint unpaused, buyback paused, LP support paused, mint spread `-500` bps.
  - Live Pharaoh custody mode: `1`.
  - Live LP support accrued: `13.500000` USDC.
  - Live fund USDC before LP release: `1780.992803` USDC.
  - Live Safe baseline before LP support:
    - CATCH: `1941.131645530902352678`.
    - WAVAX: `0.621293441366812329`.
  - Trader Joe quote for `6.750000` USDC to WAVAX: `1.024641462856188624` WAVAX.
  - Trader Joe quote for `6.750000` USDC to CATCH via WAVAX: `295.919703520868828465` CATCH.
  - Pharaoh mint range from live tick: `-70600` to `-42800`.
  - Release-and-swap Safe batch simulated successfully with a `5%` minimum-output guard.
  - The batch uses live V8 release-as-execution accounting: `releaseLpSupportToken` decrements the accrued LP support budget, so `executeLpSupport` is not called for the same `13.500000` USDC to avoid double-decrementing.
  - Pending submission: Ledger HID connection is currently not visible to `cast` (`Ledger device not found`); no LP-support transaction has been submitted.
