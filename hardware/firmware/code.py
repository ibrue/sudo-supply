# sudo macropad firmware — CircuitPython
#
# Lives at /code.py on the CIRCUITPY mass-storage volume. Reads /config.json
# for per-button mappings.
#
# Hardware:
#   GP0–GP3   buttons 1–4 (active-low, internal pull-up)
#
# Communication channels:
#   usb_cdc.data    — primary path. Pad writes "PRESS <1-4>\n" lines on
#                     each button press. Host app reads + dispatches per
#                     app. Configured by boot.py; None until first
#                     hardware reset after boot.py is in place.
#   usb_hid         — secondary. In keycombo / mediakey modes the pad
#                     ALSO types real keystrokes so it works standalone
#                     without the app running. In passthrough mode (the
#                     "dynamic" app mode) we skip HID entirely — the app
#                     receives the press over serial and decides what to
#                     type itself. This avoids the F-key/brightness
#                     swallowing problem on macOS.

import board
import digitalio
import json
import supervisor
import time
import usb_cdc
import usb_hid


# --- Self-recovery ---------------------------------------------------------
#
# Auto-reload only re-runs code.py, not boot.py. So the very first time
# the app writes boot.py to a fresh CIRCUITPY volume, usb_cdc.data is
# still None — boot.py hasn't actually run yet. Detect that and trigger
# a hardware reset so boot.py executes and the data channel comes up.

if usb_cdc.data is None:
    try:
        with open("/boot.py", "r") as _f:
            _f.read(1)  # if this works, boot.py exists
        # boot.py is on disk but didn't activate the data channel —
        # that means we're running on a stale boot. Reset hard.
        import microcontroller
        microcontroller.reset()  # never returns
    except OSError:
        # No boot.py at all. Run in HID-only mode (legacy fallback).
        pass


serial = usb_cdc.data  # may still be None on legacy installs


# --- HID device discovery --------------------------------------------------

keyboard_device = None
consumer_device = None
for _device in usb_hid.devices:
    if _device.usage_page == 0x01 and _device.usage == 0x06:
        keyboard_device = _device
    elif _device.usage_page == 0x0C and _device.usage == 0x01:
        consumer_device = _device


# --- Pin map ---------------------------------------------------------------

BUTTON_PINS = (board.GP0, board.GP1, board.GP2, board.GP3)


def _make_input(pin):
    p = digitalio.DigitalInOut(pin)
    p.direction = digitalio.Direction.INPUT
    p.pull = digitalio.Pull.UP
    return p


buttons = [_make_input(pin) for pin in BUTTON_PINS]


# --- Config ----------------------------------------------------------------
#
# Default = passthrough on every button. The app handles dispatch.
# When the app writes a real config.json (after the first flash), each
# button's mode is overridden per the user's chosen app mode.

DEFAULT_BUTTONS = [
    {"mode": "passthrough", "keycode": 0, "modifiers": 0, "name": "button 1"},
    {"mode": "passthrough", "keycode": 0, "modifiers": 0, "name": "button 2"},
    {"mode": "passthrough", "keycode": 0, "modifiers": 0, "name": "button 3"},
    {"mode": "passthrough", "keycode": 0, "modifiers": 0, "name": "button 4"},
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


# --- Send helpers ----------------------------------------------------------

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


def _send_press(idx):
    """Notify host that physical button (idx + 1) was just pressed."""
    if serial is None:
        return
    try:
        serial.write(("PRESS %d\n" % (idx + 1)).encode("utf-8"))
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
    mode = cfg.get("mode", "passthrough")

    if mode == "passthrough":
        # App-driven dispatch over serial. NO HID — that's the whole
        # point of this transport.
        _send_press(idx)
    elif mode == "keycombo":
        keycode = cfg.get("keycode", 0)
        modifiers = cfg.get("modifiers", 0)
        _send_keyboard(modifiers, keycode)
        time.sleep(0.015)
        _release_keyboard()
    elif mode == "mediakey":
        keycode = cfg.get("keycode", 0)
        usage = _CONSUMER_CODES.get(keycode, 0)
        if usage:
            _send_consumer(usage)


# --- Main loop -------------------------------------------------------------

DEBOUNCE_MS = 20

last_state = [True] * 4
debounce_until = [0] * 4

while True:
    try:
        now = supervisor.ticks_ms()

        for i in range(4):
            if supervisor.ticks_diff(now, debounce_until[i]) < 0:
                continue
            state = buttons[i].value  # True = released
            if state != last_state[i]:
                last_state[i] = state
                debounce_until[i] = now + DEBOUNCE_MS
                if not state:
                    dispatch(i)

        time.sleep(0.005)
    except Exception:  # noqa: BLE001
        try:
            time.sleep(0.1)
        except Exception:  # noqa: BLE001
            pass
