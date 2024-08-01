# Home Assistant Climate Control Automation

This script sets the temperature of an air conditioner based on various environmental factors using Home Assistant.

## Overview

The script uses the `climate.set_temperature` service to adjust the air conditioner's temperature. It takes into account indoor and outdoor temperatures, humidity, dew point, cloud coverage, and the sun's position.

## Script Breakdown

### Service Call

```yaml
service: climate.set_temperature
target:
  entity_id: climate.air_conditioner
```

This calls the `climate.set_temperature` service to set the temperature of the air conditioner identified by `climate.air_conditioner`.

### Data Template

```yaml
data_template:
  temperature: >
```

Defines a template for calculating the temperature to set.

### Variables

```yaml
{% set indoor_temp = states('sensor.indoor_average_temperure')|float %}
{% set indoor_heat_index = states('sensor.indoor_comfort_heat_index')|float %}
{% set outdoor_temp = states('sensor.average_outdoor_temperature')|float %}
{% set current_dew_point = state_attr('weather.forecast_home', 'dew_point')|float %}
{% set current_cloud_coverage = state_attr('weather.forecast_home', 'cloud_coverage')|float %}
{% set humidity_difference = states('sensor.humidity_differnace') %}
{% set temp_difference = states('sensor.temperature_difference') %}
{% set sun_state = states('sun.sun') %}
{% set forecast = state_attr('weather.forecast_home', 'forecast') %}
```

These lines set various variables using the current state of different sensors and weather attributes:
- `indoor_temp`: Average indoor temperature.
- `indoor_heat_index`: Indoor comfort heat index.
- `outdoor_temp`: Average outdoor temperature.
- `current_dew_point`: Current dew point from the weather forecast.
- `current_cloud_coverage`: Current cloud coverage from the weather forecast.
- `humidity_difference`: Difference in humidity.
- `temp_difference`: Difference in temperature.
- `sun_state`: State of the sun (above or below the horizon).
- `forecast`: Weather forecast data.

### Namespace for Calculations

```yaml
{% set ns = namespace(start=0, end=0, min_temp=1000, max_humidity=0, future_temp=0) %}
```

Initializes a namespace `ns` to store intermediate calculation results.

### Forecast Loop

```yaml
{% for i in range(0, 3) %}
  {% set curr_temp = forecast[i]['temperature']|float %}
  {% set curr_humidity = forecast[i]['humidity']|float %}
  {% if curr_temp < ns.min_temp %}
    {% set ns.min_temp = curr_temp %}
  {% endif %}
  {% if curr_humidity > ns.max_humidity %}
    {% set ns.max_humidity = curr_humidity %}
  {% endif %}
  {% if curr_temp > ns.future_temp %}
    {% set ns.future_temp = curr_temp %}
  {% endif %}
{% endfor %}
```

Loops through the first three forecast entries to find the minimum temperature, maximum humidity, and future temperature.

Here's a detailed breakdown:

1. **Loop Initialization**:
   ```jinja
   {% for i in range(0, 3) %}
   ```
   This loop runs three times, corresponding to the first three forecast entries.

2. **Extracting Temperature and Humidity**:
   ```jinja
   {% set curr_temp = forecast[i]['temperature']|float %}
   {% set curr_humidity = forecast[i]['humidity']|float %}
   ```
   For each iteration, it extracts the temperature and humidity from the forecast and converts them to float values.

3. **Finding Minimum Temperature**:
   ```jinja
   {% if curr_temp < ns.min_temp %}
     {% set ns.min_temp = curr_temp %}
   {% endif %}
   ```
   If the current temperature (`curr_temp`) is less than the current minimum temperature (`ns.min_temp`), it updates `ns.min_temp` to the current temperature.

4. **Finding Maximum Humidity**:
   ```jinja
   {% if curr_humidity > ns.max_humidity %}
     {% set ns.max_humidity = curr_humidity %}
   {% endif %}
   ```
   If the current humidity (`curr_humidity`) is greater than the current maximum humidity (`ns.max_humidity`), it updates `ns.max_humidity` to the current humidity.

5. **Finding Highest Future Temperature**:
   ```jinja
   {% if curr_temp > ns.future_temp %}
     {% set ns.future_temp = curr_temp %}
   {% endif %}
   ```
   If the current temperature (`curr_temp`) is greater than the current highest future temperature (`ns.future_temp`), it updates `ns.future_temp` to the current temperature.

### Adjusted Temperature Calculation

```yaml
{% set adjusted_temp = ns.min_temp %}
{% if ns.max_humidity > 50 or current_dew_point > 20 %}
  {% set adjusted_temp = adjusted_temp - (current_dew_point / 10) %}
{% endif %}
{% set adjusted_temp = adjusted_temp + (current_cloud_coverage / 50) %}
{% if ns.future_temp > indoor_temp %}
  {% set adjusted_temp = ns.future_temp %}
{% endif %}
{% set adjusted_temp = adjusted_temp - (humidity_difference|float / 10) %}
{% set adjusted_temp = adjusted_temp + (temp_difference|float / 5) %}
{% if sun_state == 'above_horizon' %}
  {% set adjusted_temp = adjusted_temp + 2 %}
{% elif sun_state == 'below_horizon' %}
  {% set adjusted_temp = adjusted_temp - 2 %}
{% endif %}
{% if adjusted_temp < 16 %}
  {% set adjusted_temp = 16 %}
{% elif adjusted_temp > 31 %}
  {% set adjusted_temp = 31 %}
{% endif %}
{{ adjusted_temp|round|int }}
```

Calculates the adjusted temperature based on various conditions:
- Starts with the minimum temperature from the forecast.
- Adjusts for high humidity and dew point.
- Adjusts for cloud coverage.
- Uses future temperature if it's higher than the indoor temperature.
- Adjusts for humidity and temperature differences.
- Adjusts based on the sun's position.
- Ensures the temperature is within the range of 16 to 31 degrees Celsius.

## Usage

To use this script, add it to your Home Assistant configuration and ensure you have the necessary sensors and weather integration set up.
