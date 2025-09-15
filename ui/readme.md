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
