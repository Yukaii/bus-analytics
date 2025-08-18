# Tokyo Bus Pole GeoJSON Data Analysis

## Overview
Analysis of Tokyo bus pole data from `data/BusstopPole.json`

## Data Structure Summary

### Dataset Characteristics
- **Total entries**: 3,695 bus stop poles
- **Unique locations**: 1,673 bus stops
- **Operator**: Tokyo Metropolitan Bureau (Toei) - 100% coverage
- **Data format**: JSON array with numbered indices (0-3694)

### Schema Structure

Each bus stop pole entry contains:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `@id` | String | Unique URN identifier | `"urn:ucode:_00001C0000000000000100000322B70F"` |
| `@type` | String | Object type | `"odpt:BusstopPole"` |
| `title` | Object | Multi-language names | `{"ja": "駒形橋", "ja-Hrkt": "こまがたばし", "en": "Komagatabashi"}` |
| `dc:title` | String | Japanese name | `"駒形橋"` |
| `geo:lat` | Number | Latitude (WGS84) | `35.707999` |
| `geo:long` | Number | Longitude (WGS84) | `139.795487` |
| `odpt:operator` | Array | Operating companies | `["odpt.Operator:Toei"]` |
| `odpt:busroutePattern` | Array | Bus routes using this pole | `["odpt.BusroutePattern:Toei.Higashi42-1.52201.2", ...]` |
| `odpt:busstopPoleNumber` | String | Pole number at stop | `"1"` |
| `odpt:busstopPoleTimetable` | Array | Timetable references | `["odpt.BusstopPoleTimetable:Toei.Higashi42-1...", ...]` |
| `owl:sameAs` | String | Alternative identifier | `"odpt.BusstopPole:Toei.Komagatabashi.537.1"` |
| `dc:date` | String | Last update timestamp | `"2025-08-18T03:08:01+09:00"` |

### Sample Data Points

```json
{
  "name": "駒形橋 (Komagatabashi)",
  "coordinates": [35.707999, 139.795487],
  "routes": 4,
  "timetables": 12
}
```

```json
{
  "name": "三ノ橋 (Sanno-bashi)", 
  "coordinates": [35.649521, 139.736965],
  "operator": "Toei"
}
```

```json
{
  "name": "岩井堂 (Iwaido)",
  "coordinates": [35.832688, 139.297021],
  "operator": "Toei"
}
```

## Key Observations

1. **Multiple poles per stop**: 3,695 poles across 1,673 unique locations indicates many stops have multiple poles (different directions/routes)

2. **Comprehensive coverage**: All entries are Toei-operated, suggesting this is a complete dataset for Tokyo metropolitan bus system

3. **Rich metadata**: Each entry includes multilingual names, precise coordinates, route associations, and timetable references

4. **Recent data**: Timestamps show data was updated on 2025-08-18

## Useful jq Queries

```bash
# Get all unique stop names
jq '[.[].title.ja] | unique' data/BusstopPole.json

# Extract coordinates for mapping
jq '.[] | {"name": .title.ja, "lat": ."geo:lat", "lng": ."geo:long"}' data/BusstopPole.json

# Count routes per stop
jq '.[] | {"stop": .title.ja, "routes": (."odpt:busroutePattern" | length)}' data/BusstopPole.json

# Get geographical bounds
jq '[.[] | ."geo:lat"] | [min, max]' data/BusstopPole.json  # Latitude range
jq '[.[] | ."geo:long"] | [min, max]' data/BusstopPole.json # Longitude range
```

## Potential Use Cases

- Route optimization and planning
- Bus stop accessibility analysis
- Geographic clustering of bus services
- Timetable integration and real-time updates
- Multi-modal transport connections