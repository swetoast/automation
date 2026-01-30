# Battery Card

A Lovelace card that renders a battery entity as a donut gauge with status, details, and optional actions. The card supports compact and full layouts, basic accessibility, and theme awareness. 


<img width="563" height="302" alt="image" src="https://github.com/user-attachments/assets/315c50fd-8529-476f-9157-691e3a301c4b" />

## Features

*   Donut gauge with rounded percentage display (0–100). 
*   Status categories with matching colors/icons: `ok`, `replace`, `critical`, `offline`. `critical` is enforced at ≤10%. `replace` triggers if `battery_low` is true or level ≤ `battery_low_threshold` (default 20). `offline` when state is `unavailable`, `unknown`, or missing. 
*   Details list: battery type, quantity badge, “last replaced” (absolute timestamp), “reported” (relative time, auto‑refresh every minute). 
*   Actions: press replace button (`button.press`), open more‑info, copy device ID; each shows busy state and disables during execution. 
*   Optional brand image in header (`title_logo`) with safe fallback to a generic icon. 

## Installation

1.  Copy `battery-card.js` to:
        /config/www/
2.  Add a Lovelace resource:
    *   Settings → Dashboards → Resources → Add Resource  
        URL: `/local/battery-card.js`  
        Type: `JavaScript Module` 

The card registers under the type `battery-card` and appears in the Lovelace card picker with a preview and description. 

## Example Configuration

Your example:

```yaml
type: custom:battery-card
title: Entryway Climate Sensor
title_logo: https://cdn.brandfetch.io/idiJLBqMW6/w/180/h/180/theme/dark/icon.png?c=1dxbfHSJFAPEGdCLU4o5B
entity: sensor.entryway_climate_sensor_battery_plus
replace_button: button.entryway_climate_sensor_battery_replaced
```

## Options

**Configuration keys supported by the card:**

*   **`entity`** *(string, required)*  
    Battery sensor entity that reports a numeric percentage (0–100). If the state is non‑numeric or missing, status may become `offline`. 

*   **`title`** *(string, optional)*  
    Overrides the header title; defaults to the entity’s `friendly_name` when available. 

*   **`title_logo`** *(string, optional)*  
    URL to a header image. If it fails to load, the card falls back to a generic icon. Relative paths like `/local/...` are resolved through Home Assistant’s URL helper when available. 

*   **`replace_button`** *(string, optional)*  
    A `button.*` entity the card will press when “Mark replaced” is triggered. If omitted, the card derives one from the sensor ID by replacing the `sensor.` prefix with `button.` and converting the trailing battery token to `_battery_replaced`. If the derived entity does not exist, the action is disabled. 

*   **`compact`** *(boolean, optional; default `true`)*  
    Controls layout density: compact (`true`) or full (`false`). Also affects `getCardSize()` for masonry sizing (2 vs 3). 

## Entity Attributes Used

If present, these attributes enrich the UI; if absent, a placeholder is shown:

*   `battery_low` *(boolean)* — contributes to `replace`. 
*   `battery_low_threshold` *(number, %)* — threshold for `replace`; default is 20. A hard floor of 10% is always `critical`. 
*   `battery_type` *(string)* — shown as “Type”. 
*   `battery_quantity` or `battery_type_and_quantity` — displayed as a small badge next to the type. 
*   `battery_last_replaced` *(ISO string)* — absolute timestamp. 
*   `battery_last_reported` *(ISO string)* — relative timestamp that auto‑refreshes every minute. 
*   `device_id` *(string)* — enables the copy action. 

## Status Logic

*   **offline** — state is `unavailable`, `unknown`, or missing. 
*   **critical** — percentage ≤ 10. 
*   **replace** — `battery_low` is true or percentage ≤ `battery_low_threshold`. 
*   **ok** — otherwise. The donut arc color mirrors the status chip color. 
