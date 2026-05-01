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

# Pins listed in physical order, bottom → top, so buttons[0] is the
# bottom button (button 1 in the app), buttons[3] is the top (button 4).
# The hardware happens to wire GP3 to the bottom switch; if we used GP0..GP3
# in numeric order the indexing would be flipped from what the app shows.
PINS = (board.GP3, board.GP2, board.GP1, board.GP0)

buttons = []
for pin in PINS:
    p = digitalio.DigitalInOut(pin)
    p.direction = digitalio.Direction.INPUT
    p.pull = digitalio.Pull.UP
    buttons.append(p)


# --- LED feedback ----------------------------------------------------------
#
# GP24 only — GP25 is the Pico's onboard status LED and CircuitPython
# uses it for boot / error patterns. Claiming GP25 has crashed previous
# firmware revisions; not worth the visual.
#
# Wrapped in try/except so a board without LED2 wired up (or one that
# can't claim the pin for any reason) still runs the rest of the
# firmware. Flash duration is short — just a "tap" feedback on press.

LED_PIN = board.GP24
LED_FLASH_MS = 120
_led_off_at = 0

try:
    _led = digitalio.DigitalInOut(LED_PIN)
    _led.direction = digitalio.Direction.OUTPUT
    _led.value = False
    _led_ok = True
except Exception:  # noqa: BLE001
    _led_ok = False


def flash_led():
    global _led_off_at
    if not _led_ok:
        return
    try:
        _led.value = True
        _led_off_at = supervisor.ticks_ms() + LED_FLASH_MS
    except Exception:  # noqa: BLE001
        pass


def update_led():
    global _led_off_at
    if not _led_ok or _led_off_at == 0:
        return
    try:
        if ticks_diff(supervisor.ticks_ms(), _led_off_at) >= 0:
            _led.value = False
            _led_off_at = 0
    except Exception:  # noqa: BLE001
        _led_off_at = 0


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

def send_key_down(modifiers, keycode):
    """Begin holding a HID keystroke. The key stays pressed until
    send_key_up() runs, so the host sees a real held key (which is what
    YouTube needs for press-and-hold-for-2x-speed, etc)."""
    if keyboard is None:
        return
    try:
        rpt = bytearray(8)
        rpt[0] = modifiers & 0xFF
        rpt[2] = keycode & 0xFF
        keyboard.send_report(rpt)
    except Exception:  # noqa: BLE001
        pass


def send_key_up():
    """Release whatever keyboard report is currently held. Single-button
    case only — if a future revision needs simultaneous holds we can
    track per-button and OR the reports, but the macropad only ever sees
    one finger at a time in practice."""
    if keyboard is None:
        return
    try:
        keyboard.send_report(bytearray(8))
    except Exception:  # noqa: BLE001
        pass


def send_key(modifiers, keycode):
    """Tap: down + 15ms + up. Used for legacy mediakey paths and for
    consumer-control keystrokes that don't make sense to hold."""
    send_key_down(modifiers, keycode)
    time.sleep(0.015)
    send_key_up()


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


# Track which buttons have an active key-down report on the host.
# Indexed the same way as `buttons[]`. Only used for keycombo /
# passthrough modes where holding is meaningful — mediakey codes are
# always taps.
key_held = [False] * 4


def dispatch_press(i):
    b = config[i]
    mode = b.get("mode", "keycombo")
    if mode == "mediakey":
        usage = _CONSUMER.get(b.get("keycode", 0), 0)
        if usage:
            send_consumer(usage)
    else:
        # keycombo or passthrough — start holding the key. The matching
        # release is sent from dispatch_release() when the user lets go.
        send_key_down(b.get("modifiers", 0), b.get("keycode", 0))
        key_held[i] = True


def dispatch_release(i):
    if key_held[i]:
        send_key_up()
        key_held[i] = False


# --- Main loop -------------------------------------------------------------

DEBOUNCE_MS = 20
last_state = [True] * 4
debounce_until = [0] * 4

while True:
    try:
        now = supervisor.ticks_ms()
        update_led()
        for i in range(4):
            if ticks_diff(now, debounce_until[i]) < 0:
                continue
            state = buttons[i].value  # True = released (pull-up)
            if state != last_state[i]:
                last_state[i] = state
                debounce_until[i] = now + DEBOUNCE_MS
                if not state:
                    flash_led()
                    dispatch_press(i)
                else:
                    dispatch_release(i)
        time.sleep(0.005)
    except Exception:  # noqa: BLE001
        try:
            time.sleep(0.1)
        except Exception:  # noqa: BLE001
            pass
