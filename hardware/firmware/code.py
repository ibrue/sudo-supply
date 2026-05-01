# sudo macropad firmware — CircuitPython
#
# Lives at /code.py on the CIRCUITPY mass-storage volume. Reads /config.json
# for per-button mappings; falls back to F13/F17/F18/F16 + ctrl+shift if
# missing.
#
# Hardware (matches sudo-supply.kicad_sch):
#   GP0–GP3   buttons 1–4 (active-low, internal pull-up)
#   GP24      LED2 (under-glow)
#   GP25      LED1 (under-glow)
#
# Uses only built-in CircuitPython modules (`usb_hid`, `digitalio`,
# `pwmio`, `supervisor`) — sends raw HID reports rather than depending
# on the adafruit_hid library, so there's nothing to install in /lib/.
#
# The companion app updates behaviour by writing /config.json directly to the
# CIRCUITPY volume — CircuitPython auto-reloads on every save, so changes go
# live in <1 s without BOOTSEL or UF2 dances.
#
# Why F13/F17/F18/F16 instead of F13–F16 in default mode:
#   macOS treats raw F14 / F15 as display-brightness keys on Apple-style
#   keyboards even when modifiers are present. We use F17/F18 for the two
#   middle buttons because those F-keys aren't claimed by the system.

import board
import digitalio
import json
import pwmio
import supervisor
import time
import usb_hid


# ----------------------------------------------------------------------------
# HID device discovery
# ----------------------------------------------------------------------------

# CircuitPython exposes usb_hid.devices as a tuple of HID devices the host
# enumerated. The default profile includes a keyboard and a consumer-control
# device — we find them by their HID usage page + usage code.
keyboard_device = None
consumer_device = None
for _device in usb_hid.devices:
    # Generic Desktop / Keyboard
    if _device.usage_page == 0x01 and _device.usage == 0x06:
        keyboard_device = _device
    # Consumer / Consumer Control
    elif _device.usage_page == 0x0C and _device.usage == 0x01:
        consumer_device = _device


# ----------------------------------------------------------------------------
# Pin map
# ----------------------------------------------------------------------------

BUTTON_PINS = (board.GP0, board.GP1, board.GP2, board.GP3)
LED_PIN_1 = board.GP25
LED_PIN_2 = board.GP24


def _make_input(pin):
    p = digitalio.DigitalInOut(pin)
    p.direction = digitalio.Direction.INPUT
    p.pull = digitalio.Pull.UP
    return p


buttons = [_make_input(pin) for pin in BUTTON_PINS]

# PWM-driven LEDs for smooth fade-in/fade-out animations.
led1 = pwmio.PWMOut(LED_PIN_1, frequency=1000, duty_cycle=0)
led2 = pwmio.PWMOut(LED_PIN_2, frequency=1000, duty_cycle=0)


# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------

# Default = passthrough mode: F13/F17/F18/F16 + ctrl+shift, matching the
# app's default hotkey bindings.
DEFAULT_BUTTONS = [
    {"mode": "keycombo", "keycode": 0x68, "modifiers": 0x03, "name": "button 1"},  # F13
    {"mode": "keycombo", "keycode": 0x6D, "modifiers": 0x03, "name": "button 2"},  # F18
    {"mode": "keycombo", "keycode": 0x6C, "modifiers": 0x03, "name": "button 3"},  # F17
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
# HID send helpers
# ----------------------------------------------------------------------------

# Standard 8-byte boot keyboard report: [modifier, reserved, k1, k2, k3, k4, k5, k6].
def _send_keyboard(modifier, keycode):
    if keyboard_device is None:
        return
    try:
        report = bytearray(8)
        report[0] = modifier & 0xFF
        if keycode:
            report[2] = keycode & 0xFF
        keyboard_device.send_report(report)
    except Exception:  # noqa: BLE001 — never let a USB hiccup kill the loop
        pass


def _release_keyboard():
    if keyboard_device is None:
        return
    try:
        keyboard_device.send_report(bytearray(8))
    except Exception:  # noqa: BLE001
        pass


# 2-byte consumer-control report with the 16-bit usage code.
def _send_consumer(usage):
    if consumer_device is None:
        return
    try:
        pressed = bytearray(2)
        pressed[0] = usage & 0xFF
        pressed[1] = (usage >> 8) & 0xFF
        consumer_device.send_report(pressed)
        time.sleep(0.01)
        consumer_device.send_report(bytearray(2))
    except Exception:  # noqa: BLE001
        pass


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
        _send_keyboard(modifiers, keycode)
        time.sleep(0.015)
        _release_keyboard()
    elif mode == "mediakey":
        usage = _CONSUMER_CODES.get(keycode, 0)
        if usage:
            _send_consumer(usage)


# ----------------------------------------------------------------------------
# LED animation — non-blocking state machine
# ----------------------------------------------------------------------------
#
# On a button press we trigger a fade-in/fade-out animation on both LEDs.
# The animation is driven by ticks_diff each iteration of the main loop —
# never blocks, so button polling stays responsive throughout.
#
# Curve:
#                         peak (65535)
#                          /\
#                         /  \
#                        /    \
#                       /      \____
#                      /            \____
#       0  ___________/                  \____  0
#          press   80ms             280ms

ANIM_RAMP_UP_MS = 80
ANIM_RAMP_DOWN_MS = 200
ANIM_TOTAL_MS = ANIM_RAMP_UP_MS + ANIM_RAMP_DOWN_MS

_anim_active = False
_anim_started_at = 0


def trigger_animation():
    global _anim_active, _anim_started_at
    _anim_active = True
    _anim_started_at = supervisor.ticks_ms()


def update_animation():
    global _anim_active
    if not _anim_active:
        return
    elapsed = supervisor.ticks_diff(supervisor.ticks_ms(), _anim_started_at)
    if elapsed < 0:
        elapsed = 0
    if elapsed < ANIM_RAMP_UP_MS:
        # Fade in
        level = int((elapsed / ANIM_RAMP_UP_MS) * 65535)
    elif elapsed < ANIM_TOTAL_MS:
        # Fade out
        progress = (elapsed - ANIM_RAMP_UP_MS) / ANIM_RAMP_DOWN_MS
        level = int((1.0 - progress) * 65535)
    else:
        level = 0
        _anim_active = False
    led1.duty_cycle = level
    led2.duty_cycle = level


def leds_off():
    led1.duty_cycle = 0
    led2.duty_cycle = 0


# ----------------------------------------------------------------------------
# Main loop
# ----------------------------------------------------------------------------

DEBOUNCE_MS = 20

last_state = [True] * 4
debounce_until = [0] * 4

leds_off()

# Top-level try/except so a transient USB blip during sleep / suspend can't
# silently kill the firmware. CircuitPython would otherwise drop to the REPL
# and the device would stop responding to button presses until reset.
while True:
    try:
        now = supervisor.ticks_ms()

        # Always tick the LED animation, regardless of input state.
        update_animation()

        for i in range(4):
            # ticks wraps; supervisor.ticks_diff handles the wrap correctly.
            if supervisor.ticks_diff(now, debounce_until[i]) < 0:
                continue
            state = buttons[i].value  # True = released
            if state != last_state[i]:
                last_state[i] = state
                debounce_until[i] = now + DEBOUNCE_MS
                if not state:
                    # Pressed: kick off LED animation and dispatch HID.
                    trigger_animation()
                    dispatch(i)

        time.sleep(0.005)
    except Exception:  # noqa: BLE001
        # Anything went sideways — give the bus a beat and start the loop
        # over. Don't print/log: we don't have a console attached.
        try:
            time.sleep(0.1)
        except Exception:  # noqa: BLE001
            pass
