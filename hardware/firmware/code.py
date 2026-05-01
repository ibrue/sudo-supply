# sudo macropad firmware — CircuitPython
#
# Buttons on GP0-GP3 (active-low, internal pull-up). Sends HID keystrokes;
# the macOS app's HotkeyListener catches them and dispatches per-app actions.
#
# Defaults: ctrl+shift + F13/F18/F17/F16. F14/F15 are skipped because macOS
# treats those as display-brightness keys even with modifiers held.
#
# /config.json (optional, written by the app on flash) overrides per-button
# behaviour for simple / custom mode.

import board
import digitalio
import json
import supervisor
import time
import usb_hid


# CircuitPython 9.x exposes ticks_ms() but NOT ticks_diff() — that's a
# MicroPython-ism. Roll our own wrap-safe version (counter wraps at 2**29).
_TICKS_PERIOD = 1 << 29
_TICKS_HALFPERIOD = _TICKS_PERIOD // 2


def ticks_diff(t1, t2):
    diff = (t1 - t2) & (_TICKS_PERIOD - 1)
    if diff >= _TICKS_HALFPERIOD:
        diff -= _TICKS_PERIOD
    return diff


# --- HID device discovery --------------------------------------------------

keyboard = None
consumer = None
for d in usb_hid.devices:
    if d.usage_page == 0x01 and d.usage == 0x06:
        keyboard = d
    elif d.usage_page == 0x0C and d.usage == 0x01:
        consumer = d


# --- Pins ------------------------------------------------------------------

PINS = (board.GP0, board.GP1, board.GP2, board.GP3)

buttons = []
for pin in PINS:
    p = digitalio.DigitalInOut(pin)
    p.direction = digitalio.Direction.INPUT
    p.pull = digitalio.Pull.UP
    buttons.append(p)


# --- Config ----------------------------------------------------------------
#
# Physical order on the pad: button 1 (bottom) → button 4 (top), wired to
# GP0-GP3. Default mapping matches the app's defaultHotkeyBindings:
#   button 1 (approve)  → F13 (0x68)
#   button 2 (action3)  → F18 (0x6D)
#   button 3 (reject)   → F17 (0x6C)
#   button 4 (action4)  → F16 (0x6B)
# All paired with ctrl+shift (0x03) so the keystrokes never collide with
# something a user might type.

DEFAULT_BUTTONS = [
    {"mode": "keycombo", "keycode": 0x68, "modifiers": 0x03},  # F13
    {"mode": "keycombo", "keycode": 0x6D, "modifiers": 0x03},  # F18
    {"mode": "keycombo", "keycode": 0x6C, "modifiers": 0x03},  # F17
    {"mode": "keycombo", "keycode": 0x6B, "modifiers": 0x03},  # F16
]


def load_config():
    try:
        with open("/config.json") as f:
            cfg = json.load(f).get("buttons", DEFAULT_BUTTONS)
        if len(cfg) != 4:
            return DEFAULT_BUTTONS
        return cfg
    except (OSError, ValueError):
        return DEFAULT_BUTTONS


config = load_config()


# --- HID send helpers ------------------------------------------------------

def send_key(modifiers, keycode):
    if keyboard is None:
        return
    try:
        rpt = bytearray(8)
        rpt[0] = modifiers & 0xFF
        rpt[2] = keycode & 0xFF
        keyboard.send_report(rpt)
        time.sleep(0.015)
        keyboard.send_report(bytearray(8))  # release
    except Exception:  # noqa: BLE001
        pass


def send_consumer(usage):
    if consumer is None:
        return
    try:
        rpt = bytearray(2)
        rpt[0] = usage & 0xFF
        rpt[1] = (usage >> 8) & 0xFF
        consumer.send_report(rpt)
        time.sleep(0.01)
        consumer.send_report(bytearray(2))
    except Exception:  # noqa: BLE001
        pass


# macOS NX_KEYTYPE → HID consumer-control usage codes
_CONSUMER = {16: 0xCD, 17: 0xB5, 18: 0xB6, 19: 0xB7, 20: 0xE2}


def dispatch(i):
    b = config[i]
    mode = b.get("mode", "keycombo")
    if mode == "mediakey":
        usage = _CONSUMER.get(b.get("keycode", 0), 0)
        if usage:
            send_consumer(usage)
    else:
        # keycombo or passthrough — both just type the key combo
        send_key(b.get("modifiers", 0), b.get("keycode", 0))


# --- Main loop -------------------------------------------------------------

DEBOUNCE_MS = 20
last_state = [True] * 4
debounce_until = [0] * 4

while True:
    try:
        now = supervisor.ticks_ms()
        for i in range(4):
            if ticks_diff(now, debounce_until[i]) < 0:
                continue
            state = buttons[i].value  # True = released (pull-up)
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
