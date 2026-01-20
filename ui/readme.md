Ollama Chat Card
```yaml
type: custom:ollama-chat-card
host: http://localhost
port: 15001
think: true
model: llama3.1
notreachable_message: AI is unreachable
check_interval: 10000
check_timeout: 3000
```
Pollen Card
```yaml
type: custom:pollen-card
title: Accuweather Seasonal Pollens
title_logo: >-
  https://cdn.brandfetch.io/idz9AroCHx/w/400/h/400/theme/dark/icon.jpeg?c=1dxbfHSJFAPEGdCLU4o5B
entities:
  - sensor.pollens_accuweather
  - sensor.pollen_data
icon: mdi:flower-pollen
seasonal: true
auto_hide: true
```
Västtrafik Card
```yaml
type: custom:vasttrafik-table-card
title: Departures
show_delay: true
logo: /local/iconset/vasttrafik.png
refresh_interval_ms: 60000
go_time: 5
empty_text: No trips at the moment
entities:
  - sensor.mot_järntorget
  - sensor.mot_musikvägen
```
