# README for Auto-Update: Install JDownloader Updates

This README provides a comprehensive breakdown of the automation script used to automatically install JDownloader updates when they become available.

## Overview

The automation script is designed to automatically install updates for JDownloader when they are available, provided that JDownloader is in an idle or stopped state. This ensures that updates are applied without interrupting any ongoing downloads or activities.

## Automation Breakdown

### Alias

- **Alias**: "Auto-Update: Install JDownloader Updates"
- **Description**: Automatically install JDownloader updates

### Trigger

The automation is triggered when the state of the `update.jdownloader_updates` entity changes to "on", indicating that an update is available.

```yaml
trigger:
  - platform: state
    entity_id:
      - update.jdownloader_updates
    to: "on"
```

### Condition

The condition ensures that updates are only installed if JDownloader is in an idle or stopped state. This is checked using a template condition that evaluates the state of the `sensor.jdownloader_current_status` entity.

```yaml
condition:
  - condition: template
    value_template: "{{ states('sensor.jdownloader_current_status') in ['idle', 'stopped'] }}"
```

### Action

The actions performed by the automation are as follows:

1. **Install the Update**:
   - The `update.install` service is called to install the available update for JDownloader.

    ```yaml
    action:
      - target:
          entity_id: update.jdownloader_updates
        action: update.install
        data: {}
    ```

2. **Delay**:
   - A delay of 1 minute is introduced to ensure the update process has time to complete.

    ```yaml
    - delay:
        hours: 0
        minutes: 1
        seconds: 0
        milliseconds: 0
    ```

3. **Reload Configuration Entry**:
   - The `homeassistant.reload_config_entry` service is called to reload the JDownloader configuration entry, ensuring that the system recognizes the newly installed update.

    ```yaml
    - data:
        entry_id: "!secret jdownloader_entry_id"
      action: homeassistant.reload_config_entry
    ```

### Mode

The automation is set to `restart` mode, meaning that if the automation is triggered again while it is already running, it will restart from the beginning.

```yaml
mode: restart
```
