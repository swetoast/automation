# README for Activity State Jinja Template

This README provides a comprehensive breakdown of the Jinja template used to generate personalized messages based on various sensor states and activities detected by your devices.

## Overview

The Jinja template dynamically generates messages based on the activity states of a Google Pixel Watch 2, a Pixel 8 Pro, and a Quest 2 VR headset. It considers factors such as whether the devices are being interacted with, the current activity (e.g., running, walking), and the person's location.

## Template Breakdown

### Variable Definitions

- `watch_activity`: The current activity state of the Google Pixel Watch 2.
- `phone_activity`: The detected activity state of the Pixel 8 Pro.
- `vr_in_use`: Boolean indicating if the Quest 2 VR headset is in use.
- `watch_on_body`: Boolean indicating if the Google Pixel Watch 2 is being worn.
- `person_location`: The current location of the person (e.g., home, work).
- `phone_interactive`: Boolean indicating if the Pixel 8 Pro is being interacted with.
- `watch_interactive`: Boolean indicating if the Google Pixel Watch 2 is being interacted with.

### Conditional Statements

The template uses a series of `if`, `elif`, and `else` statements to determine the appropriate message based on the sensor states and activities.

#### VR in Use

```jinja
{% if vr_in_use %}
  You're immersed in VR. Have fun exploring!
```

#### Active States

```jinja
{% elif phone_activity in ['running', 'on_bicycle'] or (watch_on_body and watch_activity == 'exercise') %}
  {% if phone_activity in ['running', 'on_bicycle'] %}
    You're staying active: {{ phone_activity }}. Keep up the great work!
  {% else %}
    {% set exercise_type = state_attr('sensor.google_pixel_watch_2_activity_state', 'exercise_type') %}
    {% if exercise_type %}
      You're staying active: {{ exercise_type }}. Keep up the great work!
    {% else %}
      You're staying active. Keep up the great work!
    {% endif %}
  {% endif %}
```

#### Asleep State

```jinja
{% elif phone_activity in ['still', 'unknown'] and watch_on_body and watch_activity == 'asleep' %}
  You're also asleep. Sweet dreams!
```

#### Still or Unknown Activity

```jinja
{% elif phone_activity in ['still', 'unknown'] %}
  {% if person_location == 'work' %}
    {% if phone_interactive or watch_interactive %}
      You're at work but interacting with your device. Stay focused!
    {% else %}
      You're working. Keep up the good work!
    {% endif %}
  {% else %}
    {% if phone_interactive or watch_interactive %}
      You're interacting with your device. Stay engaged!
    {% else %}
      You're taking a break. Relax and recharge!
    {% endif %}
  {% endif %}
```

#### Passive or Unknown Activity

```jinja
{% elif phone_activity in ['passive', 'unknown'] and watch_on_body and watch_activity in ['passive', 'unknown'] %}
  {% if phone_interactive or watch_interactive %}
    You're interacting with your device. Stay engaged!
  {% else %}
    You're taking a break. Relax and recharge!
  {% endif %}
```

#### In Vehicle

```jinja
{% elif phone_activity == 'in_vehicle' %}
  {% if phone_interactive %}
    You're using your phone while in a vehicle. Stay connected!
  {% else %}
    Looks like you're in a vehicle. Sit back and enjoy the ride!
  {% endif %}
```

#### On Foot or Walking

```jinja
{% elif phone_activity in ['on_foot', 'walking'] %}
  {% if person_location == 'home' %}
    Moving around the apartment. Keep moving!
  {% elif person_location == 'work' %}
    Moving around at Work. Stay productive!
  {% else %}
    Taking a walk. Enjoy your stroll!
  {% endif %}
```

#### Tilting

```jinja
{% elif phone_activity == 'tilting' %}
  Your device is tilting. Make sure it's secure!
{% endif %}
```

### Final Output

The template outputs a personalized message based on the conditions met.
