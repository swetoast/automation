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
type: custom:pollen-se-card
entity: sensor.pollen_data
season_entity: sensor.season
accuweather_entity: sensor.pollens_accuweather
no_pollens_label: No significant pollen levels
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
