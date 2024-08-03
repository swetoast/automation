# README for `set_temperature.yaml`

This README provides a comprehensive breakdown of the Jinja template used in the `set_temperature.yaml` file. This template is designed to dynamically set the temperature for a climate control system based on various user preferences and sensor readings.

## Overview

The Jinja template in this file is used to calculate the target temperature for an air conditioner based on a variety of factors, including user preferences, indoor and outdoor conditions, and weather forecasts. The calculated temperature is then set using the `climate.set_temperature` service.

## Breakdown of the Jinja Template

### User Preferences

These variables allow users to customize their temperature settings:

- `daytime_additional_cooling`: A boolean indicating whether additional cooling is desired during the day.
- `ac_temp_min`: The minimum temperature the air conditioner can be set to.
- `ac_temp_max`: The maximum temperature the air conditioner can be set to.
- `sleeping_temp_min_user`: The minimum temperature preferred by the user for sleeping.
- `sleeping_temp_max_user`: The maximum temperature preferred by the user for sleeping.

### Sensor Readings

These variables capture the current state of various sensors:

- `indoor_temp`: The average indoor temperature.
- `outdoor_temp`: The average outdoor temperature.
- `indoor_humidity`: The average indoor humidity.
- `outdoor_humidity`: The average outdoor humidity.
- `current_humidity`: The current humidity from the weather forecast.
- `current_dew_point`: The current dew point from the weather forecast.
- `current_cloud_coverage`: The current cloud coverage from the weather forecast.
- `current_pressure`: The current atmospheric pressure from the weather forecast.
- `sun_state`: The current state of the sun (above or below the horizon).
- `forecast`: The weather forecast data.
- `current_season`: The current season.

### Temperature Adjustment Logic

This section contains the logic for adjusting the target temperature based on various conditions:

1. **Setting Minimum and Maximum Sleeping Temperatures**:
    ```jinja
    {% set sleeping_temp_min = sleeping_temp_min_user if sleeping_temp_min_user >= ac_temp_min else ac_temp_min %}
    {% set sleeping_temp_max = sleeping_temp_max_user if sleeping_temp_max_user <= ac_temp_max else ac_temp_max %}
    ```
    This ensures that the user-defined sleeping temperature limits are within the acceptable range of the air conditioner.

2. **Initializing Namespace Variables**:
    ```jinja
    {% set ns = namespace(min_temp=1000, max_humidity=0, max_wind_speed=0, max_precipitation=0) %}
    ```
    Namespace variables are used to store the minimum temperature, maximum humidity, maximum wind speed, and maximum precipitation from the forecast data.

3. **Calculating Differences**:
    ```jinja
    {% set humidity_diff = outdoor_humidity - indoor_humidity %}
    {% set temp_diff = outdoor_temp - indoor_temp %}
    ```
    These variables calculate the difference between outdoor and indoor humidity and temperature, which are used later in the adjustments.

4. **Processing Forecast Data**:
    ```jinja
    {% for i in range(0, 3) %}
      {% set curr_temp = forecast[i]['temperature']|float %}
      {% set curr_humidity = forecast[i]['humidity']|float %}
      {% set curr_wind_speed = forecast[i]['wind_speed']|float %}
      {% set curr_precipitation = forecast[i]['precipitation']|float %}
      {% if curr_temp < ns.min_temp %}
        {% set ns.min_temp = curr_temp %}
      {% endif %}
      {% if curr_humidity > ns.max_humidity %}
        {% set ns.max_humidity = curr_humidity %}
      {% endif %}
      {% if curr_wind_speed > ns.max_wind_speed %}
        {% set ns.max_wind_speed = curr_wind_speed %}
      {% endif %}
      {% if curr_precipitation > ns.max_precipitation %}
        {% set ns.max_precipitation = curr_precipitation %}
      {% endif %}
    {% endfor %}
    ```
    This loop processes the forecast data for the next three hours to find the minimum temperature, maximum humidity, maximum wind speed, and maximum precipitation.

5. **Adjusting Temperature Based on Sun State**:
    - **Daytime**:
        ```jinja
        {% if sun_state == 'above_horizon' %}
          {% set target_temp = indoor_temp | round(0, 'floor') %}
          {% if daytime_additional_cooling %}
            {% set target_temp = target_temp - 1 %}
          {% endif %}
        ```
        During the day, the target temperature is set to the rounded indoor temperature. If additional cooling is desired, one degree is subtracted.

    - **Nighttime**:
        ```jinja
        {% elif sun_state == 'below_horizon' %}
          {% set target_temp = indoor_temp - 1 - temp_diff/10 %}
          {% if ns.max_humidity > 50 %}
            {% set target_temp = target_temp - 1 - humidity_diff/10 %}
          {% elif ns.max_humidity < 30 %}
            {% set target_temp = target_temp + 1 + humidity_diff/10 %}
          {% endif %}
          {% if current_dew_point > 18 %}
            {% set target_temp = target_temp - 1 %}
          {% endif %}
          {% if current_cloud_coverage < 30 %}
            {% set target_temp = target_temp + 1 %}
          {% endif %}
          {% if ns.max_wind_speed > 15 %}
            {% set target_temp = target_temp + 1 %}
          {% endif %}
          {% if ns.max_precipitation > 0 %}
            {% set target_temp = target_temp - 1 %}
          {% endif %}
          {% if indoor_humidity > 60 %}
            {% set target_temp = target_temp - 1 %}
          {% elif indoor_humidity < 30 %}
            {% set target_temp = target_temp + 1 %}
          {% endif %}
          {% if current_pressure > 1020 %}
            {% set target_temp = target_temp + 1 %}
          {% elif current_pressure < 1000 %}
            {% set target_temp = target_temp - 1 %}
          {% endif %}
          {% if current_season == 'summer' %}
            {% set target_temp = target_temp - 1 %}
          {% elif current_season == 'winter' %}
            {% set target_temp = target_temp + 1 %}
          {% elif current_season == 'spring' %}
            {% set target_temp = target_temp - 0.5 %}
          {% elif current_season == 'autumn' %}
            {% set target_temp = target_temp + 0.5 %}
          {% endif %}
          {% if target_temp < sleeping_temp_min %}
            {% set target_temp = sleeping_temp_min %}
          {% elif target_temp > sleeping_temp_max %}
            {% set target_temp = sleeping_temp_max %}
          {% endif %}
        {% endif %}
        ```
        At night, the target temperature is adjusted based on various factors such as temperature difference, humidity, dew point, cloud coverage, wind speed, precipitation, indoor humidity, atmospheric pressure, and the current season. The final target temperature is then constrained within the user-defined sleeping temperature limits.

        - **Initial Temperature Setting**: The target temperature is initially set to the indoor temperature minus one degree, further adjusted by the temperature difference between outdoor and indoor temperatures divided by 10.
        - **Humidity Adjustment**: If the maximum humidity from the forecast is greater than 50%, the target temperature is decreased by one degree and further adjusted by the humidity difference divided by 10. If the maximum humidity is less than 30%, the target temperature is increased by one degree and further adjusted by the humidity difference divided by 10.
        - **Dew Point Adjustment**: If the current dew point is greater than 18°C, the target temperature is decreased by one degree.
        - **Cloud Coverage Adjustment**: If the current cloud coverage is less than 30%, the target temperature is increased by one degree.
        - **Wind Speed Adjustment**: If the maximum wind speed from the forecast is greater than 15 km/h, the target temperature is increased by one degree.
        - **Precipitation Adjustment**: If there is any precipitation in the forecast, the target temperature is decreased by one degree.
        - **Indoor Humidity Adjustment**: If the indoor humidity is greater than 60%, the target temperature is decreased by one degree. If the indoor humidity is less than 30%, the target temperature is increased by one degree.
        - **Atmospheric Pressure Adjustment**: If the current atmospheric pressure is greater than 1020 hPa, the target temperature is increased by one degree. If the current atmospheric pressure is less than 1000 hPa, the target temperature is decreased by one degree.
        - **Seasonal Adjustment**: The target temperature is adjusted based on the current season: decreased by one degree in summer, increased by one degree in winter, decreased by 0.5 degrees in spring, and increased by 0.5 degrees in autumn.
        - **Final Temperature Constraints**: The final target temperature is constrained within the user-defined minimum and maximum sleeping temperatures to ensure comfort.

6. **Final Temperature Calculation**:
    ```jinja
    {{ target_temp|round|int }}
    ```
    The final target temperature is rounded to the nearest integer.
