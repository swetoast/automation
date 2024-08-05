# README for `weather_report.jinja`

This README provides a comprehensive breakdown of the Jinja template used in the `weather_report.jinja` file. This template is designed to dynamically generate a weather report based on various sensor readings and forecast data.

## Overview

The Jinja template in this file is used to calculate the average forecast over the next three periods for each attribute (like temperature, humidity, wind speed, etc.) and rounds the values to the nearest tenth. It also includes the seasonal greetings, thunder probability, frost risk, UV index, air quality (PM2.5), aurora chance, and lightning counter.

## Breakdown of the Jinja Template

### Sensor Readings

These variables capture the current state of various sensors:

- `timeofday`: The current time of day.
- `sweden_calendar`: The state of the Sweden calendar.
- `current_weather_condition`: The current weather condition.
- `current_cloud_coverage`: The current cloud coverage.
- `current_pressure`: The current atmospheric pressure.
- `current_dew_point`: The current dew point.
- `current_temperature`: The current temperature.
- `current_humidity`: The current humidity.
- `current_wind_bearing`: The current wind bearing.
- `current_wind_gust_speed`: The current wind gust speed.
- `current_wind_speed`: The current wind speed.
- `current_precipitation`: The current precipitation.
- `current_season`: The current season.
- `aurora_chance`: The chance of seeing the aurora.
- `aurora_visible`: Whether the aurora is currently visible.
- `current_frost_risk`: The risk of frost.
- `thunder_probability`: The probability of thunder.
- `lightning_counter`: The lightning counter.
- `lightning_distance`: The distance of the lightning.
- `lightning_azimuth`: The azimuth of the lightning.
- `uv_index`: The UV index.
- `pm25`: The PM2.5 air quality data.
- `pollen_data`: The pollen data.
- `alder_pollen`: The Alder pollen level.
- `birch_pollen`: The Birch pollen level.
- `grasses_pollen`: The Grasses pollen level.
- `mugwort_pollen`: The Mugwort pollen level.
- `olive_tree_pollen`: The Olive Tree pollen level.
- `ragweed_pollen`: The Ragweed pollen level.

### Namespace Variables

A namespace variable is used to store the sum of each attribute (like temperature, humidity, wind speed, etc.):

```jinja
{% set ns = namespace(temp_sum=0, humidity_sum=0, wind_speed_sum=0, wind_bearing_sum=0, low_temp_sum=0, gust_speed_sum=0, precipitation_sum=0, condition='', precipitation_probability=0) %}
```

### Processing Forecast Data

This section contains the logic for processing the forecast data:

```jinja
{% for i in range(0, 3) %}
    {% if forecast is defined and forecast[i] is defined %}
        {% set ns.temp_sum = ns.temp_sum + forecast[i]['temperature']|float %}
        {% set ns.humidity_sum = ns.humidity_sum + forecast[i]['humidity']|float %}
        {% set ns.wind_speed_sum = ns.wind_speed_sum + forecast[i]['wind_speed']|float %}
        {% set ns.wind_bearing_sum = ns.wind_bearing_sum + forecast[i]['wind_bearing']|float %}
        {% set ns.low_temp_sum = ns.low_temp_sum + forecast[i]['templow']|float %}
        {% set ns.gust_speed_sum = ns.gust_speed_sum + forecast[i]['wind_gust_speed']|float %}
        {% set ns.precipitation_sum = ns.precipitation_sum + forecast[i]['precipitation']|float %}
        {% set ns.condition = forecast[i]['condition'] %}
        {% set ns.precipitation_probability = ns.precipitation_probability + forecast[i]['precipitation_probability']|float %}
    {% endif %}
{% endfor %}
```

This loop processes the forecast data for the next three periods to find the sum of each attribute (like temperature, humidity, wind speed, etc.).

### Calculating Averages

This section contains the logic for calculating the average of each attribute (like temperature, humidity, wind speed, etc.):

```jinja
{% set median_temp = (ns.temp_sum / 3)|round(1) %}
{% set median_humidity = (ns.humidity_sum / 3)|round(1) %}
{% set median_wind_speed = (ns.wind_speed_sum / 3)|round(1) %}
{% set median_wind_bearing = (ns.wind_bearing_sum / 3)|round(1) %}
{% set median_low_temp = (ns.low_temp_sum / 3)|round(1) %}
{% set median_gust_speed = (ns.gust_speed_sum / 3)|round(1) %}
{% set median_precipitation = (ns.precipitation_sum / 3)|round(1) %}
{% set upcoming_condition = ns.condition %}
{% set median_precipitation_probability = (ns.precipitation_probability / 3)|round(1) %}
```

### Weather Report Message

This section contains the logic for generating the weather report message:

```jinja
{% set initial_message = "Good " ~ timeofday ~ "!" %}
{% if sweden_calendar %}
    {% set initial_message = initial_message ~ " Did you know that today is " ~ sweden_calendar_message ~ "?" %}
{% endif %}

{% set final_message = initial_message ~ " " %}

{% if current_weather_condition %}
  {% set final_message = final_message ~ 'The current weather is ' ~ current_weather_condition ~ '. ' %}
{% endif %}

{% if upcoming_condition and current_weather_condition != upcoming_condition %}
  {% set final_message = final_message ~ 'Expect ' ~ upcoming_condition ~ ' weather soon. ' %}
{% endif %}

{% if median_temp %}
  {% set final_message = final_message ~ 'The median temperature is ' ~ median_temp ~ current_temperature_unit ~ ', with a low of ' ~ median_low_temp ~ current_temperature_unit ~ '. ' %}
{% endif %}

{% if median_humidity %}
  {% set final_message = final_message ~ 'Humidity levels are around ' ~ median_humidity ~ current_humidity_unit ~ '. ' %}
{% endif %}

{% if pressure_message %}
  {% set final_message = final_message ~ pressure_message ~ ' ' %}
{% endif %}

{% if wind_speed_message %}
  {% set final_message = final_message ~ wind_speed_message %}
{% endif %}

{% if cloud_coverage_message %}
  {% set final_message = final_message ~ cloud_coverage_message ~ ' ' %}
{% endif %}

{% if precipitation_message %}
  {% set final_message = final_message ~ precipitation_message ~ ' ' %}
{% endif %}

{% if lightning_message %}
  {% set final_message = final_message ~ lightning_message %}
{% endif %}

{% if aurora_message %}
  {% set final_message = final_message ~ aurora_message %}
{% endif %}

{% if frost_risk_message %}
  {% set final_message = final_message ~ frost_risk_message %}
{% endif %}

{% if uv_index_message %}
  {% set final_message = final_message ~ uv_index_message %}
{% endif %}

{% if pm25_message %}
  {% set final_message = final_message ~ pm25_message %}
{% endif %}

{{ final_message }}
```

This part of the code generates a weather report message based on the calculated averages and other sensor readings. It includes:

- **Seasonal greetings**: The message starts with a greeting that changes based on the current season.
- **Sweden calendar**: If there's a special day according to the Sweden calendar, the message includes a note about it.
- **Weather condition**: The message includes the expected weather condition for the day.
- **Temperature**: The message includes the expected average temperature for the day.
- **Humidity**: The message includes the expected average humidity for the day.
- **Wind speed**: The message includes the expected average wind speed for the day.
- **UV Index**: The message includes the UV Index for the day and provides safety advice based on the index level.
- **Thunder Probability**: If there's a chance of thunder, the message includes the probability.
- **Lightning Counter**: If there have been lightning strikes detected, the message includes the number of strikes, the distance of the most recent strike, and the direction of the strike.
- **Frost Risk**: If there's a risk of frost, the message includes a warning.
- **Aurora Chance**: If there's a chance of seeing the aurora, the message includes the probability.
- **Air Quality**: The message includes the PM2.5 air quality status.
- **Pollen Data**: The message includes the pollen data for Alder, Birch, Grasses, Mugwort, Olive Tree, and Ragweed.
