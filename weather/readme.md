# Home Assistant Weather Forecast Script

This script is used in Home Assistant to calculate the average weather forecast for the next 3 hours. It fetches the forecast data from a weather entity and calculates the average temperature, humidity, wind speed, wind bearing, low temperature, wind gust speed, and precipitation. It also fetches the condition and precipitation probability.

## Code Explanation

```yaml
{% set forecast = state_attr('weather.forecast_home', 'forecast') %}
```
This line fetches the forecast data from the `weather.forecast_home` entity in Home Assistant. Replace `'weather.forecast_home'` with your actual weather entity ID.

```yaml
{% set ns = namespace(temp_sum=0, humidity_sum=0, wind_speed_sum=0, wind_bearing_sum=0, low_temp_sum=0, gust_speed_sum=0, precipitation_sum=0, condition='', precipitation_probability=0) %}
```
This line initializes a namespace `ns` with variables to store the sum of the temperature, humidity, wind speed, wind bearing, low temperature, wind gust speed, and precipitation. It also initializes variables to store the condition and precipitation probability.

```yaml
{% for i in range(0, 3) %}
  {% if forecast is defined and forecast[i] is defined %}
```
This loop iterates over the first 3 hours of the forecast data. It checks if the forecast data for each hour exists before trying to access it.

```yaml
    {% set ns.temp_sum = ns.temp_sum + forecast[i]['temperature']|float %}
    {% set ns.humidity_sum = ns.humidity_sum + forecast[i]['humidity']|float %}
    {% set ns.wind_speed_sum = ns.wind_speed_sum + forecast[i]['wind_speed']|float %}
    {% set ns.wind_bearing_sum = ns.wind_bearing_sum + forecast[i]['wind_bearing']|float %}
    {% set ns.low_temp_sum = ns.low_temp_sum + forecast[i]['templow']|float %}
    {% set ns.gust_speed_sum = ns.gust_speed_sum + forecast[i]['wind_gust_speed']|float %}
    {% set ns.precipitation_sum = ns.precipitation_sum + forecast[i]['precipitation']|float %}
    {% set ns.condition = forecast[i]['condition'] %}
    {% set ns.precipitation_probability = ns.precipitation_probability + forecast[i]['precipitation_probability']|float %}
```
These lines add the temperature, humidity, wind speed, wind bearing, low temperature, wind gust speed, and precipitation to their respective sums. They also fetch the condition and precipitation probability.

```yaml
  {% endif %}
{% endfor %}
```
This ends the loop and the if condition.

```yaml
Average forecast for the next 3 hours:
  Average Temperature: {{ (ns.temp_sum / 3)|round(1) }}
  Average Humidity: {{ (ns.humidity_sum / 3)|round(1) }}
  Average Wind Speed: {{ (ns.wind_speed_sum / 3)|round(1) }}
  Average Wind Bearing: {{ (ns.wind_bearing_sum / 3)|round(1) }}
  Average Low Temperature: {{ (ns.low_temp_sum / 3)|round(1) }}
  Average Wind Gust Speed: {{ (ns.gust_speed_sum / 3)|round(1) }}
  Average Precipitation: {{ (ns.precipitation_sum / 3)|round(1) }}
  Condition: {{ ns.condition }}
  Average Precipitation Probability: {{ (ns.precipitation_probability / 3)|round(1) }}
```
These lines calculate the average for each metric by dividing the sum by 3. The results are rounded to one decimal place. The condition and average precipitation probability are also displayed.
