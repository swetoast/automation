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
{% set humidity_difference = states('sensor.humidity_differnace')|float %}
{% set temp_difference = states('sensor.temperature_difference')|float %}
{% set sun_state = states('sun.sun') %}
{% set forecast = state_attr('weather.forecast_home', 'forecast') %}
```

These lines set various variables using the current state of different sensors and weather attributes:
- `indoor_temp`: Average indoor temperature.
- `indoor_heat_index`: Indoor comfort heat index.
- `outdoor_temp`: Average outdoor temperature.
- `current_dew_point`: Current dew point from the weather forecast.
- `current_cloud_coverage`: Current cloud coverage from the weather forecast.
- `humidity_difference`: Difference in humidity (outside versus inside).
- `temp_difference`: Difference in temperature (outside versus inside).
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
{% set adjusted_temp = adjusted_temp - (humidity_difference / 10) %}
{% set adjusted_temp = adjusted_temp + (temp_difference / 5) %}
{% if sun_state == 'above_horizon' %}
  {% set adjusted_temp = adjusted_temp + 2 %}
{% elif sun_state == 'below_horizon' %}
  {% set adjusted_temp = adjusted_temp - 2 %}
{% endif %}
{% if adjusted_temp < 20 %}
  {% set adjusted_temp = 20 %}
{% elif adjusted_temp > 31 %}
  {% set adjusted_temp = 31 %}
{% endif %}
```

Calculates the adjusted temperature based on various conditions:
- Starts with the minimum temperature from the forecast.
- Adjusts for high humidity and dew point.
- Adjusts for cloud coverage.
- Uses future temperature if it's higher than the indoor temperature.
- Adjusts for humidity and temperature differences.
- Adjusts based on the sun's position.
- Ensures the temperature is within the range of 20 to 31 degrees Celsius.

### Gradual Temperature Adjustment

```yaml
{% set current_temp = states.climate.air_conditioner.attributes.current_temperature|float %}
{% set temp_diff = adjusted_temp - current_temp %}
{% set step = 2 %}
{% if temp_diff > step %}
  {% set final_temp = current_temp + step %}
{% elif temp_diff < -step %}
  {% set final_temp = current_temp - step %}
{% else %}
  {% set final_temp = adjusted_temp %}
{% endif %}

{% set target_difference = states('sensor.air_conditioner_target_difference')|round|int %}
{% set time_since_last_adjustment = ((as_timestamp(now()) - as_timestamp(states.climate.air_conditioner.last_changed)) / 60)|round|int %}
{% if target_difference > 0 and time_since_last_adjustment > 10 %}
  {% set final_temp = final_temp + 1 %}
{% endif %}

{{ final_temp|round|int }}
```

This section ensures that the temperature is adjusted gradually:
- Retrieves the current temperature of the air conditioner.
- Calculates the difference between the adjusted temperature and the current temperature.
- Adjusts the temperature incrementally by 2 degrees towards the adjusted temperature.
- If the target difference is greater than 0 and it has been more than 10 minutes since the last adjustment, it increases the final temperature by 1 degree.

This section of the script is responsible for adjusting the temperature gradually and ensuring that the air conditioner doesn't make drastic changes, which could be uncomfortable.

1. **Current Temperature Retrieval**:
   ```jinja
   {% set current_temp = states.climate.air_conditioner.attributes.current_temperature|float %}
   ```
   This line retrieves the current temperature of the air conditioner and converts it to a float.

2. **Temperature Difference Calculation**:
   ```jinja
   {% set temp_diff = adjusted_temp - current_temp %}
   ```
   This line calculates the difference between the adjusted temperature (calculated in the previous section of the script) and the current temperature.

3. **Step Definition**:
   ```jinja
   {% set step = 2 %}
   ```
   This line defines a step of 2 degrees. This is the maximum amount by which the temperature will be adjusted in one iteration.

4. **Gradual Temperature Adjustment**:
   ```jinja
   {% if temp_diff > step %}
     {% set final_temp = current_temp + step %}
   {% elif temp_diff < -step %}
     {% set final_temp = current_temp - step %}
   {% else %}
     {% set final_temp = adjusted_temp %}
   {% endif %}
   ```
   This block adjusts the temperature incrementally towards the adjusted temperature. If the temperature difference is greater than the step, it increases the current temperature by the step. If the temperature difference is less than the negative step, it decreases the current temperature by the step. Otherwise, it sets the final temperature to the adjusted temperature.

5. **Target Difference and Time Since Last Adjustment**:
   ```jinja
   {% set target_difference = states('sensor.air_conditioner_target_difference')|round|int %}
   {% set time_since_last_adjustment = ((as_timestamp(now()) - as_timestamp(states.climate.air_conditioner.last_changed)) / 60)|round|int %}
   ```
   These lines calculate the difference between the target temperature and the current temperature, and the time since the last adjustment was made. The time is calculated in minutes.

6. **Final Adjustment Based on Target Difference and Time**:
   ```jinja
   {% if target_difference > 0 and time_since_last_adjustment > 10 %}
     {% set final_temp = final_temp + 1 %}
   {% endif %}
   ```
   This block increases the final temperature by 1 degree if the target difference is greater than 0 and it has been more than 10 minutes since the last adjustment.

7. **Final Temperature Output**:
   ```jinja
   {{ final_temp|round|int }}
   ```
   This line outputs the final temperature, rounded to an integer. This is the temperature that will be set for the air conditioner.

## Usage

To use this script, add it to your Home Assistant configuration and ensure you have the necessary sensors and weather integration set up. This script is a great example of how you can use Home Assistant to automate your home climate control based on a variety of factors!
