# Home Assistant Climate Control Automation

This project uses Home Assistant to automate the control of an air conditioner based on various environmental factors.

## Features

- **Dynamic Temperature Adjustment**: The script adjusts the air conditioner's temperature based on indoor and outdoor temperatures, humidity, dew point, cloud coverage, wind speed, and the sun's position.
- **Gradual Temperature Change**: The script ensures that the temperature changes gradually, avoiding sudden jumps in temperature.
- **Weather Forecast Integration**: The script uses weather forecast data to anticipate changes in the environment and adjust the temperature accordingly.

## How It Works

The script uses the `climate.set_temperature` service in Home Assistant to set the temperature of the air conditioner. It calculates the desired temperature using a data template that takes into account various environmental factors.

Here's a more detailed breakdown:

### Variables

The script starts by setting a series of variables using the states of various sensors and weather attributes. These variables include indoor and outdoor temperatures, humidity, dew point, cloud coverage, pressure, sun state, and season.

```yaml
{% set indoor_temp = states('sensor.indoor_average_temperature')|float %}
{% set outdoor_temp = states('sensor.average_outdoor_temperature')|float %}
{% set indoor_humidity = states('sensor.indoor_average_humidity')|float %}
{% set outdoor_humidity = states('sensor.average_outside_humidity')|float %}
{% set current_humidity = state_attr('weather.forecast_home', 'humidity')|float %}
{% set current_dew_point = state_attr('weather.forecast_home', 'dew_point')|float %}
{% set current_cloud_coverage = state_attr('weather.forecast_home', 'cloud_coverage')|float %}
{% set current_pressure  = state_attr('weather.forecast_home', 'pressure')|float %}
{% set sun_state = states('sun.sun') %}
{% set forecast = state_attr('weather.forecast_home', 'forecast') %}
{% set ns = namespace(min_temp=1000, max_humidity=0, max_wind_speed=0, max_precipitation=0) %}
{% set target_temp = indoor_temp %}
{% set temp_diff = outdoor_temp - indoor_temp %}
{% set humidity_diff = outdoor_humidity - indoor_humidity %}
{% set current_season = states('sensor.season') %}
```

### Forecast Loop

This loop is iterating over the first three entries in the weather forecast. The `range(0, 3)` function generates a sequence of numbers from 0 to 2, which are used as indices to access the first three entries in the forecast.

```yaml
{% for i in range(0, 3) %}
```

For each entry in the forecast, it's extracting the temperature, humidity, wind speed, and precipitation, and converting them to floating point numbers.

```yaml
{% set curr_temp = forecast[i]['temperature']|float %}
{% set curr_humidity = forecast[i]['humidity']|float %}
{% set curr_wind_speed = forecast[i]['wind_speed']|float %}
{% set curr_precipitation = forecast[i]['precipitation']|float %}
```

Then, it's checking if the current temperature (`curr_temp`) is lower than the minimum temperature stored in the namespace (`ns.min_temp`). If it is, it updates `ns.min_temp` with `curr_temp`.

```yaml
{% if curr_temp < ns.min_temp %}
  {% set ns.min_temp = curr_temp %}
{% endif %}
```

Similarly, it's checking if the current humidity (`curr_humidity`) is higher than the maximum humidity stored in the namespace (`ns.max_humidity`). If it is, it updates `ns.max_humidity` with `curr_humidity`.

```yaml
{% if curr_humidity > ns.max_humidity %}
  {% set ns.max_humidity = curr_humidity %}
{% endif %}
```

It's also checking if the current wind speed (`curr_wind_speed`) is higher than the maximum wind speed stored in the namespace (`ns.max_wind_speed`). If it is, it updates `ns.max_wind_speed` with `curr_wind_speed`.

```yaml
{% if curr_wind_speed > ns.max_wind_speed %}
  {% set ns.max_wind_speed = curr_wind_speed %}
{% endif %}
```

Finally, it's checking if the current precipitation (`curr_precipitation`) is higher than the maximum precipitation stored in the namespace (`ns.max_precipitation`). If it is, it updates `ns.max_precipitation` with `curr_precipitation`.

```yaml
{% if curr_precipitation > ns.max_precipitation %}
  {% set ns.max_precipitation = curr_precipitation %}
{% endif %}
```

The loop ends here:

```yaml
{% endfor %}
```

After the loop, `ns.min_temp`, `ns.max_humidity`, `ns.max_wind_speed`, and `ns.max_precipitation` will hold the minimum temperature, maximum humidity, maximum wind speed, and maximum precipitation from the first three entries in the forecast, respectively. These values can then be used in subsequent calculations. 

### Adjusted Temperature Calculation

The script calculates the adjusted temperature based on various conditions. It starts with the indoor temperature and then adjusts it based on the sun's position, humidity, dew point, cloud coverage, wind speed, precipitation, and season.

```yaml
{% if sun_state == 'above_horizon' %}
  {% set target_temp = indoor_temp + 0.1 + temp_diff/10 %}
{% elif sun_state == 'below_horizon' %}
  {% set target_temp = indoor_temp - 1 - temp_diff/10 %}
{% endif %}
```

The script continues to adjust the target temperature based on various conditions:

```yaml
{% if sun_state == 'above_horizon' and ns.max_humidity > 50 %}
  {% set target_temp = target_temp - 0.1 - humidity_diff/20 %}
{% elif sun_state == 'above_horizon' and ns.max_humidity < 30 %}
  {% set target_temp = target_temp + 0.1 + humidity_diff/20 %}
{% endif %}
{% if sun_state == 'below_horizon' and ns.max_humidity > 50 %}
  {% set target_temp = target_temp - 1 - humidity_diff/10 %}
{% elif sun_state == 'below_horizon' and ns.max_humidity < 30 %}
  {% set target_temp = target_temp + 1 + humidity_diff/10 %}
{% endif %}

{% if sun_state == 'above_horizon' and current_dew_point > 18 %}
  {% set target_temp = target_temp - 0.1 %}
{% elif sun_state == 'below_horizon' and current_dew_point > 18 %}
  {% set target_temp = target_temp - 1 %}
{% endif %}

{% if sun_state == 'above_horizon' and current_cloud_coverage < 30 %}
  {% set target_temp = target_temp + 0.1 %}
{% elif sun_state == 'below_horizon' and current_cloud_coverage < 30 %}
  {% set target_temp = target_temp + 1 %}
{% endif %}
```

Finally, it ensures that the target temperature is within a certain range based on the sun's position.

```yaml
{% if sun_state == 'above_horizon' and target_temp < 16 %}
  {% set target_temp = 16 %}
{% elif sun_state == 'above_horizon' and target_temp > 31 %}
  {% set target_temp = 31 %}
{% endif %}
{% if sun_state == 'below_horizon' and target_temp < 18 %}
  {% set target_temp = 18 %}
{% elif sun_state == 'below_horizon' and target_temp > 25 %}
  {% set target_temp = 25 %}
{% endif %}
```

Finally, the script outputs the target temperature:

```yaml
{{ target_temp|round|int }}
```

This is the temperature that will be set for the air conditioner. The temperature is rounded to the nearest integer for simplicity.

## Usage

To use this script, add it to your Home Assistant configuration and ensure you have the necessary sensors and weather integration set up.
