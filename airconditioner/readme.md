# README for AC Automations & Jinja Templates

This guide shows you how to build a complete Home Assistant setup that:

- Chooses the correct HVAC mode every minute  
- Calculates a smart temperature setpoint every five minutes  
- Lets you override or kill specific rules via toggles  

You’ll add input booleans (toggles), two template sensors (one for mode, one for temperature), and two simple automations.

---

## 1. Input Booleans (Toggles)

Add these definitions to your `configuration.yaml` (or a package), then restart HA. They let you manually override or disable individual rules:

```yaml
input_boolean:

  toggle_override_not_at_home:
    name: Override Away-Kill
    icon: mdi:home-account

  airconditioner_override_all:
    name: Aircon Kill-All
    icon: mdi:power-off

  air_conditioner_override_price_toggle:
    name: Override Price Throttle
    icon: mdi:currency-eur

  air_conditioner_override_comformt:
    name: Override Comfort-Off
    icon: mdi:thermometer-lines

  air_conditioner_override_lightning_safeguard:
    name: Override Lightning Safeguard
    icon: mdi:weather-lightning
```

---

## 2. Automation: `set_hvac_mode.yaml`

Every minute, this automation reads your mode-decision sensor and applies it to the AC.

**Trigger**

- Platform: `time_pattern`  
- Runs on the minute (`minutes: "/1"`)

**Action**

```yaml
service: climate.set_hvac_mode
target:
  entity_id: climate.air_conditioner
data:
  hvac_mode: "{{ states('sensor.airconditioner_set_hvac_state') }}"
```

---

## 3. Jinja Template: `airconditioner_set_hvac_state.jinja`

This template inspects environment readings, overrides, safety flags, and price signals to output exactly one of: `off`, `fan_only`, `dry`, or `cool`.

### 3.1 Inputs & Flags

- `indoor` — room temperature  
- `delta_hum` — recent humidity change  
- `forecast` — next few hours of temperatures  
- Presence & overrides  
  - `is_home`, `toggle_override_not_at_home`  
  - `airconditioner_override_all`  
- Window & storm safety  
  - `binary_sensor.living_room_window_sensor`  
  - `binary_sensor.lightning_monitor`  
- Manual skips  
  - `air_conditioner_override_price_toggle`  
  - `air_conditioner_override_comformt`  
  - `air_conditioner_override_lightning_safeguard`  

### 3.2 Price Throttle Logic

Compares current price against average, peak, and off-peak windows.  
```jinja
{% set price_now = states('sensor.nord_pool_se3_next_price') | float %}
{% set price_avg = states('sensor.nord_pool_se3_daily_average') | float %}
{% set price_peak= states('sensor.nord_pool_se3_peak_highest_price') | float %}
{% set off_peak = … %}  {# true during off-peak periods #}
{% if skip_price %}
  {% set price_throttle = false %}
{% else %}
  {% set price_throttle = (price_now >= price_peak)
                          or (price_now > price_avg and not off_peak) %}
{% endif %}
```

### 3.3 Forecast-Based Pre-Cool

Looks ahead 3 hours, finds the highest forecasted temp. If above 25 °C, computes a “drop_pre” value:

```jinja
{% set thr_hot = 25.0 %}
{% set peak    = namespace(val=0.0) %}
{% for e in forecast[:3] %}
  {% if e.temperature > peak.val %}{% set peak.val = e.temperature %}{% endif %}
{% endfor %}
{% set diff_f   = peak.val > thr_hot and (peak.val - thr_hot) or 0 %}
{% set drop_pre = diff_f
                  and (diff_f * 2.0 / (diff_f + 2.0))
                  or 0 %}
```

### 3.4 Hysteresis Thresholds

Prevents rapid mode flips by only changing when indoor crosses your setpoint ± step:

```jinja
{% set tgt   = state_attr('climate.air_conditioner','temperature') | float %}
{% set step  = state_attr('climate.air_conditioner','target_temp_step') | float %}
{% set up_thr = tgt + step %}
{% set dn_thr = tgt - step %}
```

### 3.5 Emergency & Rule List

First, emergency shutdown if outlet overloaded or kill-all toggle is on:

```jinja
{% set outlet_overloaded = is_state('binary_sensor.ac_outlet_overloaded','on') %}
```

Then, an ordered list of `(condition, mode)` tuples—first true wins:

1. `outlet_overloaded` → **off**  
2. `airconditioner_override_all` → **off**  
3. `(not is_home) and (not override_not_home)` → **off**  
4. `lightning and not skip_light` → **off**  
5. `not window_open` → **fan_only**  
6. `comfort_ok and not skip_comf` → **off**  
7. `delta_hum > 5.0` → **dry**  
8. `price_throttle` → **fan_only**  
9. `drop_pre >= 1.0` → **cool**  
10. Hysteresis up/down → **cool**/**fan_only**  
11. Hard thresholds on indoor vs. `up_thr`/`dn_thr`

```jinja
{% set decision = namespace(value=(prev_mode or 'off')) %}
{% for cond, mode in rules %}
  {% if cond %}
    {% set decision.value = mode %}
    {% break %}
  {% endif %}
{% endfor %}
{{ decision.value }}
```

---

## 4. Automation: `set_temperature.yaml`

Every five minutes, calls the climate service to set the temperature calculated by your Jinja template.

**Trigger**

- Platform: `time_pattern`  
- Runs every five minutes (`minutes: "/5"`)

**Action**

```yaml
service: climate.set_temperature
target:
  entity_id: climate.air_conditioner
data:
  temperature: "{{ states('sensor.air_conditioner_target_difference') | float }}"
```

---

## 5. Jinja Template: `sensor.air_conditioner_target_difference.jinja`

Generates a dynamic setpoint between 16 °C and 32 °C by summing multiple “drops”:

### 5.1 Configuration Constants

```jinja
hot_threshold     = 25.0    # Outdoor temp threshold
S, M              = 5.0, 3.0  # Curve factors
daytime_drop      = [1.0, 3.0]
night_drop        = [2.0, 6.0]
pre_cool_max_drop = 2.0
forecast_horizon  = 3
comfort_thr       = 25.0
comfort_factor    = 0.1
hum_thr, hum_drop = 5.0, 0.5
outside_bonus_max = 2.0
hysteresis_thresh = 0.2
```

### 5.2 Sensor Inputs

- `indoor`: `sensor.comfort_zone_temperature`  
- `outside`: `weather.home.temperature`  
- `HI`, `Hx`: heat index & humidex sensors  
- Humidity rates: `sensor.outside_humidity_tracker`, `sensor.average_humidity_tracker`  
- Outdoor trend: `sensor.outside_weather_tracker`  
- Forecast list & sun position

### 5.3 Comfort Penalty

If heat index or humidex exceeds threshold, apply a small drop:

```jinja
{% set comfort_idx    = max(HI, Hx) %}
{% set comfort_excess = comfort_idx > comfort_thr and (comfort_idx - comfort_thr) or 0 %}
{% set drop_comfort   = comfort_excess * comfort_factor %}
```

### 5.4 Base & Extra Drop

Cooling based on indoor − outdoor difference plus extra if outside > threshold:

```jinja
{% set diff       = indoor - outside %}
{% set drop_base  = diff > 0 and (diff*S)/(diff+S) or 0 %}
{% set hot_diff   = max(0, outside - hot_threshold) %}
{% set drop_extra = hot_diff and (hot_diff*M)/(hot_diff+M) or 0 %}
```

### 5.5 Forecast Pre-Cool & Humidity Penalties

Combine `drop_pre` (from 5.3) and humidity drops:

```jinja
# drop_pre as shown earlier
{% set drop_hum_out = dhum_out_rate > hum_thr and hum_drop or 0 %}
{% set drop_hum_in  = dhum_in_rate  > hum_thr and hum_drop or 0 %}
```

### 5.6 Outside-Trend Bonuses

```jinja
{% set drop_outside = diff>0 and (diff*outside_bonus_max)/(diff+outside_bonus_max) or 0 %}
{% set drop_trend   = dout_rate>0 and (dout_rate*outside_bonus_max) or 0 %}
```

### 5.7 Total Drop & Clamping

Sum all drops, then clamp between day/night bounds:

```jinja
{% set total_drop = drop_base + drop_extra + drop_pre + drop_comfort
                  + drop_hum_out + drop_hum_in + drop_outside + drop_trend %}

{% if is_day %}
  {% set applied_drop = clamp(total_drop, daytime_min_drop, daytime_max_drop) %}
{% else %}
  {% set applied_drop = clamp(total_drop, night_min_drop, night_max_drop) %}
{% endif %}
```

### 5.8 Raw Target & Hysteresis Rounding

```jinja
{% set raw = floor(indoor) - applied_drop %}
{% set clamped = clamp(raw, 16, 32) %}

{% if dout_rate > hysteresis_thresh %}
  {% set target = floor(clamped) %}
{% elif dout_rate < -hysteresis_thresh %}
  {% set target = ceil(clamped) %}
{% else %}
  {% set target = round(clamped) %}
{% endif %}

{{ target }}
```

---

## 6. Final Steps

1. Add the **Input Booleans** to your config and restart.  
2. Create both **Template Sensors** (via UI Helpers or YAML) using the Jinja above.  
3. Add the two **Automations** to `automations.yaml` and reload.  
4. Verify in Developer Tools → States:  
   - `sensor.airconditioner_set_hvac_state`  
   - `sensor.air_conditioner_target_difference`  

Your AC will now seamlessly balance comfort, cost, safety, and forecasts—automatically picking its mode every minute and its setpoint every five minutes.
