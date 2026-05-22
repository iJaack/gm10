# Courtyard Deal Feed

The Courtyard Wizard can rank high-grade Pokemon card deals from a marketplace catalog feed. The admin app does not scrape Courtyard from the browser and does not use Courtyard login cookies.

## Configuration

Preferred production source: OpenSea's official API over the Courtyard NFT collection. OpenSea exposes the `courtyard-nft` collection, active listings, and collection traits. Configure a free OpenSea API key in Vercel:

```bash
OPENSEA_API_KEY=...
COURTYARD_OPENSEA_COLLECTION_SLUG=courtyard-nft
COURTYARD_OPENSEA_CONTRACT=0x251be3a17af4892035c37ebf5890f4a4D889dcAD
COURTYARD_OPENSEA_CHAIN=matic
COURTYARD_OPENSEA_PAGE_LIMIT=50
COURTYARD_OPENSEA_MAX_PAGES=2
```

`/api/courtyard-deals` queries OpenSea listings twice, once for `Category=Pokémon, Grade=10 GEM MINT` and once for `Category=Pokémon, Grade=10 PRISTINE`, then batch-fetches NFT metadata for names, images, and traits.

OpenSea catalog links are enough for opportunity discovery and for the hot-wallet buy flow. When the wizard receives an OpenSea Courtyard item URL, `/api/courtyard-asset` resolves the NFT metadata plus the current best listing from OpenSea, then pre-fills funding and registry references from the Seaport order hash.

This is the practical route when Courtyard's own `api.courtyard.io/index/...` endpoints reject server-origin requests. The asset is still the Courtyard-vaulted NFT; execution happens through OpenSea's public listing surface instead of a Courtyard private frontend API.

Fallback source: set a self-hosted catalog feed URL for the admin server:

```bash
COURTYARD_DEALS_CATALOG_URL=https://example.com/courtyard/catalog.json
```

`COURTYARD_DEALS_CATALOG_JSON` is supported for tests and short-lived debugging, but it should not be used as a long-lived production source.

## Backend Crawler

The Vercel backend can crawl sources GM10 owns or has permission to crawl. `/api/courtyard-deals` reads `COURTYARD_CATALOG_START_URLS`, crawls server-side, caches the crawl in memory for the function lifetime, ranks the resulting catalog against the current wizard budget, and returns the deal list to the admin UI.

The crawler does same-origin traversal by default, respects `robots.txt` by default, and extracts product JSON-LD plus visible price/FMV text.

```bash
COURTYARD_CATALOG_START_URLS=https://example.com/authorized-catalog
COURTYARD_CATALOG_MAX_PAGES=100
COURTYARD_CATALOG_MAX_DEPTH=2
COURTYARD_CATALOG_SAME_ORIGIN=true
COURTYARD_CATALOG_RESPECT_ROBOTS=true
```

`COURTYARD_DEALS_CATALOG_URL` remains supported as a prebuilt-feed override. If it is not set, the backend crawler is used.

Do not disable robots checks unless the source is owned by GM10 or explicit written crawl permission exists.

## Catalog Shape

The feed can be an array or an object with an `items`, `results`, or `data` array.

```json
{
  "items": [
    {
      "title": "2023 Pokemon Scarlet & Violet Charizard ex #199",
      "category": "Pokemon",
      "grade": "10 GEM MINT",
      "assetUrl": "https://courtyard.io/asset/1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008",
      "imageUrl": "https://example.com/card.png",
      "priceUsd": 80,
      "fmvEstimateUsd": 120,
      "sellerName": "seller-1",
      "certNumber": "12345678",
      "listedAt": "2026-05-20T12:00:00.000Z"
    }
  ]
}
```

Accepted field aliases include `asset_url`, `courtyardUrl`, `price_usd`, `listingPriceUsd`, `fmv_usd`, `fmv_estimate_usd`, `image`, `image_url`, `seller`, `seller_name`, `serialNumber`, and `cert_number`.

## Ranking Rules

The server keeps only active Pokemon deals with grade `10 GEM MINT`, `10 PRISTINE`, or the common typo `10 PRISINTE`.

Deals are ranked by:

1. Fits current liquid treasury budget after the holder claim bucket.
2. Expected upside score.
3. Lower listing price as a tie-breaker.

The wizard shows over-budget deals with a blocker instead of silently dropping them.
