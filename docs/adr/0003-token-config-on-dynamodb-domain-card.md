# TokenConfig stored on DomainCard in DynamoDB, not in srd-index.json

TokenConfig (token cap formula and rest action) is static SRD data that belongs on the `DomainCard` record in DynamoDB, written once at ingestion time by a `TokenExtractor` transformer. It is served to the frontend via the existing gamedata API alongside the card data. The `srd-index.json` is used only for SRD search/reference browsing and is not the source of truth for card mechanics. Adding `tokenConfig` there would create a second source of truth and diverge from how all other card metadata is managed.
