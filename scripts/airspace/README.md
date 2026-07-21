# Airspace ingest

## NATS (preferred for UK)

1. Download **UAS Flight Restrictions** (KMZ or KML) from the NATS Digital Datasets page:
   https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets
2. Place the file under `scripts/airspace/input/` (or pass a path).
3. Run:

```bash
npm run airspace:ingest-nats -- scripts/airspace/input/uas-flight-restrictions.kmz
```

This writes `assets/airspace/uk-restrictions.geojson` with `source: "nats"`.

## OpenAIP bootstrap (free interim)

If you do not have the NATS file yet:

```bash
npm run airspace:bootstrap-uk
```

Produces a UK pack from the public OpenAIP GB daily GeoJSON export (`source: "openaip"`).

## Notes

- Packs are permanent restrictions only — NOTAMs / temporary restrictions are not included.
- OpenAIP data is CC BY-NC 4.0; the app shows attribution on the Map tab and stores attribution on cached artifacts. Confirm product distribution stays compatible with [OpenAIP licence terms](https://www.openaip.net/) (data remains free; not sold exclusively).
- On-device normalize has size/feature caps. Oversized country exports (e.g. US) are rejected safely rather than crashing.

## Follow-up: large-country packs (Track B)

Full support for large OpenAIP countries should **not** normalize megabyte exports on device. Preferred pipeline:

1. CI or hosted job downloads `{cc}_asp.geojson` from the OpenAIP bucket.
2. Apply the same drone-relevant filter + simplify stride as `normalizeOpenAipFeatureCollection`.
3. Publish the normalized artifact (with attribution metadata).
4. App downloads that artifact directly into `airspace-packs-v3/` (skip on-device normalize).

Do not claim US/CA map rendering until the normalized artifact size is measured and simulator-tested.
