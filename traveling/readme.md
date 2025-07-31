# Västtrafik Departures Card

A Lovelace card for Home Assistant that displays real-time Västtrafik public transport departures with countdowns, progress bars, and full theme support.

---

## Features

- Displays multiple Västtrafik sensors
- Live countdown until departure
- Progress bar showing time remaining
- Fully themeable with Home Assistant variables
- Graceful fallback when data is unavailable

---

## Installation

1. Save `vasttrafik-departures-card.js` to your Home Assistant `www` folder:
   ```
   /config/www/vasttrafik-departures-card.js
   ```

2. Add the resource to your Lovelace configuration:
   ```yaml
   resources:
     - url: /local/vasttrafik-departures-card.js
       type: module
   ```

3. Add the card to your dashboard:
   ```yaml
   cards:
     - type: custom:vasttrafik-departures-card
       logo: /local/iconset/vasttrafik.png
       sensors:
         - sensor.line_1_towards_station_a
         - sensor.line_2_towards_station_b
   ```

---

## Theme Support

To customize the card’s colors, add the following to your theme (or `configuration.yaml` under `frontend:`):

```yaml
vasttrafik_departures_card:
  vt-countdown-safe:   '#8bc34a'   # Green for >10 min
  vt-countdown-warn:   '#ffb300'   # Orange for 4–10 min
  vt-countdown-alert:  '#e53935'   # Red for ≤3 min
  vt-progress-fill:    '#03a9f4'   # Progress bar color
  vt-progress-bg:      '#cfd8dc'   # Progress bar background
  vt-delay-color:      '#b71c1c'   # Delay text color
```

These variables override the default styling and integrate with your existing theme.

---

## Sensor Requirements

Each sensor must provide the following attributes:

- `state`: Departure time in `HH:MM` format
- `line`: Line number (e.g. `1`)
- `direction`: Destination or route (e.g. `Station B via Central`)
- `track`: Track or platform (e.g. `A`)
- `from`: Origin station (e.g. `Station A`)
- `to`: Destination station (e.g. `Station B`)
- `accessibility`: Accessibility info (e.g. `wheelChair`)
- `delay`: Delay in minutes (e.g. `1`)

---

## Example Sensor

```yaml
sensor.line_1_towards_station_b:
  state: "10:15"
  attributes:
    line: 1
    direction: "Station B via Central, Front boarding"
    track: A
    from: "Station A"
    to: "Station B"
    accessibility: "wheelChair"
    delay: 1
    icon: mdi:bus
```

---

## Tips

- The card trims any pickup notes after commas in `direction`
- Countdown updates every minute automatically
- If a sensor is unavailable, the card shows `—` for all fields

---

## File Structure

```
/config
  └── /www
      └── vasttrafik-departures-card.js
      └── /iconset
          └── vasttrafik.png
```
