# README for `set_temperature.yaml` and `sensor.air_conditioner_target_difference.jinja`

This README provides a comprehensive breakdown of the automation and Jinja template used to dynamically regulate the temperature for a climate control system based on various sensor readings and weather forecasts.

## Overview

The `set_temperature.yaml` file contains an automation script that adjusts the air conditioning system every 5 minutes based on the readings from a temperature sensor and weather forecasts. The `sensor.air_conditioner_target_difference.jinja` template calculates the target temperature for the air conditioner.

## `set_temperature.yaml`

### Description

This automation ensures your home is always at the optimal temperature by intelligently adjusting the air conditioning system based on readings from temperature sensors and weather forecasts.

### Trigger

- **Platform**: `time_pattern`
- **Minutes**: `/5`

### Action

- **Service**: `climate.set_temperature`
- **Target**: `entity_id: climate.air_conditioner`
- **Data Template**: 
  ```yaml
  temperature: "{{ states('sensor.air_conditioner_target_difference') | round}}"
  ```

## `sensor.air_conditioner_target_difference.jinja`

### Description

This Jinja template calculates the target temperature for the air conditioner based on various factors such as weather forecasts, current outdoor and indoor temperatures, and the state of the sun.

### Variables

- `daytime_additional_cooling`: Boolean flag for additional cooling during the day.
- `forecast`: Weather forecast data.
- `current_outdoor_temp`: Current average outdoor temperature.
- `indoor_temp`: Current average indoor temperature.
- `sun_state`: State of the sun (above or below the horizon).

### Calculation Steps

1. **Average Forecast Temperature**:
   - Calculate the average temperature from the forecast for the next two periods.
   ```jinja
   {% set ns = namespace(temp_sum=0) %}
   {% for i in range(0, 2) %}
     {% if forecast is defined and forecast[i] is defined %}
       {% set ns.temp_sum = ns.temp_sum + forecast[i]['temperature']|float %}
     {% endif %}
   {% endfor %}
   {% set average_forecast_temp = (ns.temp_sum / 2)|round(1) %}
   ```

2. **Cooling Offset**:
   - Calculate the cooling offset based on the difference between indoor and forecasted temperatures.
   ```jinja
   {% set cooling_offset = (indoor_temp - average_forecast_temp)|round(1) %}
   {% set cooling_offset_divided = (cooling_offset / 2)|round(1) %}
   ```

3. **Adjusted Temperature**:
   - Adjust the temperature based on the current outdoor temperature and cooling offset.
   ```jinja
   {% set adjusted_temp = (current_outdoor_temp - cooling_offset_divided)|round(1) %}
   ```

4. **Target Temperature**:
   - Set the target temperature based on whether it is day or night.
   ```jinja
   {% if sun_state == 'above_horizon' %}
     {% set target_temp = indoor_temp | round(0, 'floor') %}
     {% if daytime_additional_cooling %}
       {% set target_temp = target_temp - 1 %}
     {% endif %}
   {% elif sun_state == 'below_horizon' %}
     {% set target_temp = indoor_temp - cooling_offset_divided %}
   {% endif %}
   ```

5. **Temperature Constraints**:
   - Ensure the target temperature is within the range of 16°C to 32°C.
   ```jinja
   {% set target_temp = [16, [target_temp, 32] | min] | max %}
   ```

6. **Final Output**:
   - Output the final target temperature.
   ```jinja
   {{ target_temp }}
   ```
