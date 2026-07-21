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
- OpenAIP data is CC BY-NC 4.0; the app shows attribution on the Map tab.
