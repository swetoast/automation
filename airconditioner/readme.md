# Home Assistant Climate Control Automation

This script sets the temperature of an air conditioner based on various environmental factors using Home Assistant.

## Overview

The script uses the `climate.set_temperature` service to adjust the air conditioner's temperature. It takes into account indoor and outdoor temperatures, humidity, dew point, cloud coverage, wind speed, and the sun's position.

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
{% set indoor_temp = states('sensor.indoor_average_temperature')|float %}
{% set indoor_heat_index = states('sensor.indoor_comfort_heat_index')|float %}
{% set outdoor_temp = states('sensor.average_outdoor_temperature')|float %}
{% set current_dew_point = state_attr('weather.forecast_home', 'dew_point')|float %}
{% set current_cloud_coverage = state_attr('weather.forecast_home', 'cloud_coverage')|float %}
{% set current_wind_speed = state_attr('weather.forecast_home', 'wind_speed')|float %}
{% set current_humidity = state_attr('weather.forecast_home', 'humidity')|float %}
{% set humidity_difference = states('sensor.humidity_difference')|float %}
{% set temp_difference = states('sensor.temperature_difference')|float %}
{% set sun_state = states('sun.sun') %}
{% set forecast = state_attr('weather.forecast_home', 'forecast') %}
{% set ns = namespace(start=0, end=0, min_temp=1000, max_humidity=0, future_temp=0, max_wind_speed=0) %}
```

These lines set various variables using the current state of different sensors and weather attributes:
- `indoor_temp`: Average indoor temperature.
- `indoor_heat_index`: Indoor comfort heat index.
- `outdoor_temp`: Average outdoor temperature.
- `current_dew_point`: Current dew point from the weather forecast.
- `current_cloud_coverage`: Current cloud coverage from the weather forecast.
- `current_wind_speed`: Current wind speed from the weather forecast.
- `current_humidity`: Current humidity from the weather forecast.
- `humidity_difference`: Difference in humidity (outside versus inside).
- `temp_difference`: Difference in temperature (outside versus inside).
- `sun_state`: State of the sun (above or below the horizon).
- `forecast`: Weather forecast data.

### Namespace for Calculations

```yaml
{% set ns = namespace(start=0, end=0, min_temp=1000, max_humidity=0, future_temp=0, max_wind_speed=0) %}
```

Initializes a namespace `ns` to store intermediate calculation results.

### Forecast Loop

```yaml
{% for i in range(0, 3) %}
  {% set curr_temp = forecast[i]['temperature']|float %}
  {% set curr_humidity = forecast[i]['humidity']|float %}
  {% set curr_wind_speed = forecast[i]['wind_speed']|float %}
  {% if curr_temp < ns.min_temp %}
    {% set ns.min_temp = curr_temp %}
  {% endif %}
  {% if curr_humidity > ns.max_humidity %}
    {% set ns.max_humidity = curr_humidity %}
  {% endif %}
  {% if curr_temp > ns.future_temp %}
    {% set ns.future_temp = curr_temp %}
  {% endif %}
  {% if curr_wind_speed > ns.max_wind_speed %}
    {% set ns.max_wind_speed = curr_wind_speed %}
  {% endif %}
{% endfor %}
```

Loops through the first three forecast entries to find the minimum temperature, maximum humidity, future temperature, and maximum wind speed.

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
{% if ns.max_wind_speed < 4.7 %}
  {% set adjusted_temp = adjusted_temp - 1 %}
{% elif ns.max_wind_speed > 5.9 %}
  {% set adjusted_temp = adjusted_temp + 1 %}
{% endif %}
{% if sun_state == 'above_horizon' %}
  {% set adjusted_temp = adjusted_temp + 3 %}
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
- Adjusts based on the wind speed.
- Adjusts based on the sun's position.
- Ensures the temperature is within the range of 20 to 31 degrees Celsius.

### Gradual Temperature Adjustment

```yaml
{% set current_temp = states('sensor.indoor_average_temperature')|float %}
{% set temp_diff = adjusted_temp - current_temp %}
{% set step = 1 %}
{% if temp_diff > step %}
  {% set final_temp = current_temp + step %}
{% elif temp_diff < -step %}
  {% set final_temp = current_temp - step %}
{% else %}
  {% set final_temp = adjusted_temp %}
{% endif %}
```

This section ensures that the temperature is adjusted gradually:
- Retrieves the current temperature of the apartment.
- Calculates the difference between the adjusted temperature and the current temperature.
- Adjusts the temperature incrementally by 1 degree towards the adjusted temperature.

### Final Temperature Output

```yaml
{{ final_temp|round|int }}
```

This line outputs the final temperature, rounded to an integer. This is the temperature that will be set for the air conditioner.

## Usage

To use this script, add it to your Home Assistant configuration and ensure you have the necessary sensors and weather integration set up. This script is a great example of how you can use Home Assistant to automate your home climate control based on a variety of factors!
clarification, feel free to ask! 😊
