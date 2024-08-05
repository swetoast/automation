# README for `roborock_off_peak_charging.yaml`

This README provides a comprehensive breakdown of the Jinja template used in the `roborock_off_peak_charging.yaml` file. This template is designed to dynamically set the off-peak start and end times for the Roborock S8 Pro Ultra based on the lowest electricity price over a 4-hour period.

## Overview

The Jinja template in this file checks the electricity price every 24 hours and determines the off-peak period by finding the time of the lowest electricity price over a 4-hour period.

## Breakdown of the Jinja Template

### Sensor Readings

These variables capture the current state of the electricity price sensor:

- `tod`: The raw electricity price data for today.

### Namespace Variables

A namespace variable is used to store the start and end times of the off-peak period and the minimum sum of electricity prices:

```jinja
{% set ns = namespace(start=0, end=0, min_sum=1000) %}
```

### Processing Electricity Price Data

This section contains the logic for processing the electricity price data:

```jinja
{% for i in range(0, 21) %}
    {% set curr_sum = tod[i].value + tod[i+1].value + tod[i+2].value + tod[i+3].value %}
    {% if curr_sum < ns.min_sum %}
        {% set ns.start = i %}
        {% set ns.end = i+3 %}
        {% set ns.min_sum = curr_sum %}
    {% endif %}
{% endfor %}
```

This loop processes the electricity price data for the next 21 periods to find the sum of prices over a 4-hour period and determines the start and end times of the off-peak period.

### Setting Off-Peak Times

This section contains the logic for setting the off-peak start and end times:

```jinja
{{ tod[ns.start].start.strftime('%H:%M:%S') }}
{{ tod[ns.end].end.strftime('%H:%M:%S') }}
```

This part of the code sets the off-peak start and end times based on the calculated indices.

## Automation Script

Here is the complete automation script:

### Alias and Description

```yaml
alias: "Auto-Update: Set Roborock Off-Peak Time"
description: >-
  This automation checks the electricity price every 24 hours and sets the
  off-peak start and end times for the Roborock S8 Pro Ultra. The off-peak
  period is determined by the time of the lowest electricity price over a 4 hour
  period.
```

### Trigger

The trigger is set to run the automation every day at midnight:

```yaml
trigger:
  - platform: time_pattern
    hours: "0"
```

### Actions

The actions include setting the off-peak start and end times based on the electricity price data:

Sure, I'll provide a detailed breakdown of the Jinja template for setting the off-peak start and end times.

### Setting Off-Peak Start Time

This part of the script sets the off-peak start time based on the electricity price data:

```yaml
- service: time.set_value
  target:
    entity_id: time.roborock_s8_pro_ultra_off_peak_start
  data:
    time: >-
      {% set tod = state_attr('sensor.power_cost', 'raw_today') %}
      {% set ns = namespace(start=0, end=0, min_sum=1000) %}
      {% for i in range(0, 21) %}
        {% set curr_sum = tod[i].value + tod[i+1].value + tod[i+2].value + tod[i+3].value %}
        {% if curr_sum < ns.min_sum %}
          {% set ns.start = i %}
          {% set ns.end = i+3 %}
          {% set ns.min_sum = curr_sum %}
        {% endif %}
      {% endfor %}
      {{ tod[ns.start].start.strftime('%H:%M:%S') }}
```

#### Breakdown:

1. **Retrieve Electricity Price Data**:
   ```jinja
   {% set tod = state_attr('sensor.power_cost', 'raw_today') %}
   ```
   - `tod` is set to the raw electricity price data for today.

2. **Initialize Namespace Variables**:
   ```jinja
   {% set ns = namespace(start=0, end=0, min_sum=1000) %}
   ```
   - `ns` is a namespace variable used to store the start and end times of the off-peak period and the minimum sum of electricity prices.

3. **Loop Through Electricity Price Data**:
   ```jinja
   {% for i in range(0, 21) %}
     {% set curr_sum = tod[i].value + tod[i+1].value + tod[i+2].value + tod[i+3].value %}
     {% if curr_sum < ns.min_sum %}
       {% set ns.start = i %}
       {% set ns.end = i+3 %}
       {% set ns.min_sum = curr_sum %}
     {% endif %}
   {% endfor %}
   ```
   - This loop iterates through the electricity price data for the next 21 periods.
   - `curr_sum` calculates the sum of prices over a 4-hour period.
   - If `curr_sum` is less than `ns.min_sum`, the start and end times are updated, and `ns.min_sum` is set to `curr_sum`.

4. **Set Off-Peak Start Time**:
   ```jinja
   {{ tod[ns.start].start.strftime('%H:%M:%S') }}
   ```
   - The off-peak start time is set based on the calculated index.

### Setting Off-Peak End Time

This part of the script sets the off-peak end time based on the electricity price data:

```yaml
- service: time.set_value
  target:
    entity_id: time.roborock_s8_pro_ultra_off_peak_end
  data:
    time: >-
      {% set tod = state_attr('sensor.power_cost', 'raw_today') %}
      {% set ns = namespace(start=0, end=0, min_sum=1000) %}
      {% for i in range(0, 21) %}
        {% set curr_sum = tod[i].value + tod[i+1].value + tod[i+2].value + tod[i+3].value %}
        {% if curr_sum < ns.min_sum %}
          {% set ns.start = i %}
          {% set ns.end = i+3 %}
          {% set ns.min_sum = curr_sum %}
        {% endif %}
      {% endfor %}
      {{ tod[ns.end].end.strftime('%H:%M:%S') }}
```

#### Breakdown:

1. **Retrieve Electricity Price Data**:
   ```jinja
   {% set tod = state_attr('sensor.power_cost', 'raw_today') %}
   ```
   - `tod` is set to the raw electricity price data for today.

2. **Initialize Namespace Variables**:
   ```jinja
   {% set ns = namespace(start=0, end=0, min_sum=1000) %}
   ```
   - `ns` is a namespace variable used to store the start and end times of the off-peak period and the minimum sum of electricity prices.

3. **Loop Through Electricity Price Data**:
   ```jinja
   {% for i in range(0, 21) %}
     {% set curr_sum = tod[i].value + tod[i+1].value + tod[i+2].value + tod[i+3].value %}
     {% if curr_sum < ns.min_sum %}
       {% set ns.start = i %}
       {% set ns.end = i+3 %}
       {% set ns.min_sum = curr_sum %}
     {% endif %}
   {% endfor %}
   ```
   - This loop iterates through the electricity price data for the next 21 periods.
   - `curr_sum` calculates the sum of prices over a 4-hour period.
   - If `curr_sum` is less than `ns.min_sum`, the start and end times are updated, and `ns.min_sum` is set to `curr_sum`.

4. **Set Off-Peak End Time**:
   ```jinja
   {{ tod[ns.end].end.strftime('%H:%M:%S') }}
   ```
   - The off-peak end time is set based on the calculated index.
