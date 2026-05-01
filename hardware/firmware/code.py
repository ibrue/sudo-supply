# sudo macropad firmware — CircuitPython
#
# Lives at /code.py on the CIRCUITPY mass-storage volume. Reads /config.json
# for per-button mappings; falls back to F13–F16 + ctrl+shift if missing.
#
# Hardware (matches sudo-supply.kicad_sch):
#   GP0–GP3   buttons 1–4 (active-low, internal pull-up)
#   GP24      LED2 (under-glow)
#   GP25      LED1 (under-glow)
#
# The companion app updates behaviour by writing /config.json directly to the
# CIRCUITPY volume — CircuitPython auto-reloads on every save, so changes go
# live in <1 s without BOOTSEL or UF2 dances.

import board
import digitalio
import json
import supervisor
import time
import usb_hid

from adafruit_hid.keyboard import Keyboard
from adafruit_hid.consumer_control import ConsumerControl


# ----------------------------------------------------------------------------
# Pin map
# ----------------------------------------------------------------------------

BUTTON_PINS = (board.GP0, board.GP1, board.GP2, board.GP3)
LED_PINS = (board.GP25, board.GP24)


def _make_input(pin):
    p = digitalio.DigitalInOut(pin)
    p.direction = digitalio.Direction.INPUT
    p.pull = digitalio.Pull.UP
    return p


def _make_output(pin):
    p = digitalio.DigitalInOut(pin)
    p.direction = digitalio.Direction.OUTPUT
    p.value = False
    return p


buttons = [_make_input(pin) for pin in BUTTON_PINS]
leds = [_make_output(pin) for pin in LED_PINS]


# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------

# Default = passthrough mode: F13–F16 + ctrl+shift, matching the app's
# default hotkey bindings. Any blank or new device behaves correctly with
# the companion app even before a config has been written.
DEFAULT_BUTTONS = [
    {"mode": "keycombo", "keycode": 0x68, "modifiers": 0x03, "name": "button 1"},  # F13
    {"mode": "keycombo", "keycode": 0x6A, "modifiers": 0x03, "name": "button 2"},  # F15
    {"mode": "keycombo", "keycode": 0x69, "modifiers": 0x03, "name": "button 3"},  # F14
    {"mode": "keycombo", "keycode": 0x6B, "modifiers": 0x03, "name": "button 4"},  # F16
]


def load_config():
    try:
        with open("/config.json") as f:
            data = json.load(f)
        cfg = data.get("buttons", DEFAULT_BUTTONS)
        if len(cfg) != 4:
            return DEFAULT_BUTTONS
        return cfg
    except (OSError, ValueError):
        return DEFAULT_BUTTONS


button_configs = load_config()


# ----------------------------------------------------------------------------
# HID
# ----------------------------------------------------------------------------

kbd = Keyboard(usb_hid.devices)
cc = ConsumerControl(usb_hid.devices)


# Modifier bitmask → list of HID modifier keycodes.
def _modifier_keycodes(mask):
    out = []
    if mask & 0x01:
        out.append(0xE0)  # left ctrl
    if mask & 0x02:
        out.append(0xE1)  # left shift
    if mask & 0x04:
        out.append(0xE2)  # left alt
    if mask & 0x08:
        out.append(0xE3)  # left gui (cmd)
    return out


# macOS NX_KEYTYPE values (passed through from the app/JSON) → consumer-
# control HID usage codes.
_CONSUMER_CODES = {
    16: 0xCD,  # play/pause
    17: 0xB5,  # next track
    18: 0xB6,  # previous track
    19: 0xB7,  # stop
    20: 0xE2,  # mute
}


def dispatch(idx):
    cfg = button_configs[idx]
    mode = cfg.get("mode", "keycombo")
    keycode = cfg.get("keycode", 0)

    if mode == "keycombo" or mode == "passthrough":
        modifiers = cfg.get("modifiers", 0)
        all_codes = _modifier_keycodes(modifiers)
        if keycode:
            all_codes.append(keycode)
        if all_codes:
            kbd.press(*all_codes)
            time.sleep(0.015)
            kbd.release_all()
    elif mode == "mediakey":
        usage = _CONSUMER_CODES.get(keycode, 0)
        if usage:
            cc.send(usage)


# ----------------------------------------------------------------------------
# LED feedback
# ----------------------------------------------------------------------------

def leds_set(on):
    for led in leds:
        led.value = on


def flash_leds(duration=0.08):
    leds_set(True)
    time.sleep(duration)
    leds_set(False)


# ----------------------------------------------------------------------------
# Main loop
# ----------------------------------------------------------------------------

DEBOUNCE_MS = 20

last_state = [True] * 4
debounce_until = [0] * 4

leds_set(False)

while True:
    now = supervisor.ticks_ms()

    for i in range(4):
        if now - debounce_until[i] < 0:  # ticks_ms wraps; treat negative diff as "still debouncing"
            continue
        state = buttons[i].value  # True = released (pull-up + active-low switch)
        if state != last_state[i]:
            last_state[i] = state
            debounce_until[i] = now + DEBOUNCE_MS
            if not state:
                # Pressed: brief under-glow flash + dispatch HID
                leds_set(True)
                dispatch(i)
                time.sleep(0.05)
                leds_set(False)

    time.sleep(0.005)
