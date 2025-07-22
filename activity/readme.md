# README for Location & Activity Summary Jinja Template

This template generates descriptive status summaries based on real-time activity, sensor inputs, and presence across multiple devices and rooms.

It integrates information from your phone, watch, environmental sensors, media players, and presence trackers—resulting in friendly, personalized one-line messages.

---

## Overview

The final output is a natural sentence such as:

> You’re relaxing at home, spending time in the living room, getting comfortable. Watching something on TV via Plex in bed. Meanwhile, you’re winding down before sleep and interacting on your phone.

The sentence dynamically changes depending on presence, device usage, current media, and environment.

---

## Sections

### 1. Presence & Activity Detection

- `location`: Person's current zone (e.g., home, work, bus).  
- `room`: Chooses active room (e.g., kitchen, bathroom, living room) based on presence and activity flags.  
- `sleep_confidence`: Used with `bedtime_mode` to detect if the person is sleeping or in bed.  
- `gaming`, `active_game`: Tracks if someone is gaming via a sensor and optionally adds game name.  
- `work_home`: Detects remote work from presence and device tracker.

---

### 2. Media Detection

Includes media presence across multiple players:

- `tv_on`: Bedroom TV playing status  
- `tv_title`, `tv_artist`, `tv_app`: Metadata (if available)  
- `detect_media_player(base)`: Macro to detect active PlexAmp instances  
- `lr_player`, `ph_player`: Living room and phone PlexAmp players  
- `lr_media_*`, `ph_media_*`: Title/artist/content type of what’s currently playing  

Example outputs generated:

- "watching Breaking Bad via Netflix in bed"  
- "listening to music by Bonobo on your phone"

---

### 3. Environmental & Bathroom Logic

- `fridge_open`: Kitchen activity  
- `window_open`: Used to suppress false presence from ventilation  
- `bathroom_occ`, `bath_mot`, `bath_lights`, `bathroom_steam`: Combined to infer bathing, idle presence, or basic use  
- `hum_delta`, `fan_alert`: Used to detect steamy shower conditions

Showering, bathroom motion, and humidity delta are used to express nuanced phrases like:

- “taking a warm, steamy shower”  
- “idle in the bathroom (no motion for 2 min)”  
- “using the sink or toilet”

---

### 4. Phone Notification / Interaction State

- `interactive`: Whether phone is being actively interacted with  
- `phone_state`: Whether ringing or idle  
- `call_with`: Extracts name from notification attributes if a call is active  
- `notif_count`: Total active notification count

Phrases added to output:

- “on a call with Chris”  
- “phone is ringing”  
- “interacting on your phone”

---

### 5. Macros: `zone_activity(loc)` and `place(loc, room, shower)`

These macros define contextual phrases based on:

- Location  
  - Example: “you’re at Stora Coop, picking up groceries”  
- Room activity  
  - Example: “spending time in the kitchen, getting comfortable”  
  - Special: bathroom + steam = “taking a warm, refreshing shower”

---

## Output Building Logic

Final message is built in three stages:

1. **Location Context**  
   Constructed from:  
   ```jinja
   zone_activity(location) + " and " + place(location, room, showering)
   ```

2. **Adverbial Activities**  
   Appends media, gaming, fridge or motion-based phrases like:  
   - “watching TV via Plex in bed”  
   - “snacking at the fridge”  
   - “playing Stardew Valley”

3. **Status Activities**  
   Adds conditional flags like:  
   - “doing work from home”  
   - “winding down before sleep”  
   - “interacting on your phone”

Then rendered via:

```jinja
{{ parts | join('. ') | capitalize ~ '.' }}
```

---

## Example Outputs

Depending on sensor state, some typical rendered phrases might be:

- "You're relaxing at home, spending time in the kitchen, getting comfortable. Snacking at the fridge. Meanwhile, you're interacting on your phone."  
- "You're over at Iza & Alex’s, catching up and sharing laughs. Meanwhile, you're on a call with Alex."  
- "You're focused and busy at your job, on site at work, tackling your to-do list. Watching YouTube in bed."

---

## Installation

You can add this Jinja logic as a Home Assistant Template Sensor. Use the UI (Helpers → Template Sensor) or add it to your YAML under the `template:` key. Be sure to prefix the template with:

```yaml
template:
  - sensor:
      - name: "Activity Summary"
        state: >
          {# your jinja template here #}
```
