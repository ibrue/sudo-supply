# sudo macropad firmware — CircuitPython
#
# Lives at /code.py on the CIRCUITPY mass-storage volume. Reads /config.json
# for per-button mappings; falls back to F13/F17/F18/F16 + ctrl+shift if
# the file is missing or malformed.
#
# Hardware (matches sudo-supply.kicad_sch):
#   GP0–GP3   buttons 1–4 (active-low, internal pull-up)
#   GP24      LED2 (under-glow)
#   GP25      LED1 (under-glow / Pico onboard LED)
#
# Uses only built-in CircuitPython modules — no adafruit_hid, nothing to
# install in /lib/.
#
# The companion app updates behaviour by writing /config.json directly to the
# CIRCUITPY volume — CircuitPython auto-reloads on every save, so changes go
# live in <1 s without BOOTSEL or UF2 dances.
#
# Why F13/F17/F18/F16 instead of F13–F16 in default mode:
#   macOS treats raw F14 / F15 as display-brightness keys on Apple-style
#   keyboards even when modifiers are present. F17/F18 (0x6C / 0x6D) are
#   unclaimed by the system, so the keystrokes survive to HotkeyListener.

import board
import digitalio
import json
import supervisor
import time
import usb_hid


# ----------------------------------------------------------------------------
# HID device discovery
# ----------------------------------------------------------------------------

keyboard_device = None
consumer_device = None
for _device in usb_hid.devices:
    if _device.usage_page == 0x01 and _device.usage == 0x06:
        keyboard_device = _device
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


def _make_output(pin):
    p = digitalio.DigitalInOut(pin)
    p.direction = digitalio.Direction.OUTPUT
    p.value = False
    return p


buttons = [_make_input(pin) for pin in BUTTON_PINS]

# Plain digital LEDs — no PWM, no animation, just on/off. Wrapped in
# try/except so a pin-allocation hiccup (e.g. CP claiming GP25 for its
# status indicator) can't kill the whole firmware.
try:
    led1 = _make_output(LED_PIN_1)
    led2 = _make_output(LED_PIN_2)
    _leds_ok = True
except Exception:  # noqa: BLE001
    _leds_ok = False


# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------

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

def _send_keyboard(modifier, keycode):
    if keyboard_device is None:
        return
    try:
        report = bytearray(8)
        report[0] = modifier & 0xFF
        if keycode:
            report[2] = keycode & 0xFF
        keyboard_device.send_report(report)
    except Exception:  # noqa: BLE001
        pass


def _release_keyboard():
    if keyboard_device is None:
        return
    try:
        keyboard_device.send_report(bytearray(8))
    except Exception:  # noqa: BLE001
        pass


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
# LED feedback — non-blocking. Flash both LEDs for LED_FLASH_MS on press.
# ----------------------------------------------------------------------------

LED_FLASH_MS = 120
_led_off_at = 0


def flash_leds():
    global _led_off_at
    if not _leds_ok:
        return
    try:
        led1.value = True
        led2.value = True
        _led_off_at = supervisor.ticks_ms() + LED_FLASH_MS
    except Exception:  # noqa: BLE001
        pass


def update_leds():
    global _led_off_at
    if not _leds_ok or _led_off_at == 0:
        return
    try:
        if supervisor.ticks_diff(supervisor.ticks_ms(), _led_off_at) >= 0:
            led1.value = False
            led2.value = False
            _led_off_at = 0
    except Exception:  # noqa: BLE001
        _led_off_at = 0


# ----------------------------------------------------------------------------
# Main loop
# ----------------------------------------------------------------------------

DEBOUNCE_MS = 20

last_state = [True] * 4
debounce_until = [0] * 4

while True:
    try:
        now = supervisor.ticks_ms()

        update_leds()

        for i in range(4):
            if supervisor.ticks_diff(now, debounce_until[i]) < 0:
                continue
            state = buttons[i].value  # True = released
            if state != last_state[i]:
                last_state[i] = state
                debounce_until[i] = now + DEBOUNCE_MS
                if not state:
                    flash_leds()
                    dispatch(i)

        time.sleep(0.005)
    except Exception:  # noqa: BLE001
        try:
            time.sleep(0.1)
        except Exception:  # noqa: BLE001
            pass
