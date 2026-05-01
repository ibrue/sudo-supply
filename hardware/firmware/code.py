# sudo macropad firmware — CircuitPython
#
# Lives at /code.py on the CIRCUITPY mass-storage volume.
#
# Hardware:
#   GP0–GP3   buttons 1–4 (active-low, internal pull-up)
#
# Communication:
#   usb_cdc.console — REPL / debug. `screen /dev/tty.usbmodem<lower> 115200`
#                     to watch the firmware narrate what it's doing.
#   usb_cdc.data    — primary input path. Pad writes "PRESS <1-4>\n" lines
#                     here on each button press; host app reads them and
#                     dispatches per-app actions.
#   usb_hid         — secondary. In keycombo / mediakey modes the pad ALSO
#                     types real keystrokes so it works standalone without
#                     the app. In passthrough mode (the "dynamic" app
#                     mode) we skip HID entirely.

import board
import digitalio
import json
import supervisor
import time
import usb_cdc
import usb_hid


# CircuitPython's supervisor module exposes ticks_ms() but NOT ticks_diff()
# (that's a MicroPython-ism). The supervisor counter wraps at 2**29 ms,
# so naive subtraction breaks every ~6 days. Implement the standard
# wrap-safe diff inline so we don't depend on it being there.
_TICKS_PERIOD = 1 << 29
_TICKS_HALFPERIOD = _TICKS_PERIOD // 2


def ticks_diff(t1, t2):
    diff = (t1 - t2) & (_TICKS_PERIOD - 1)
    if diff >= _TICKS_HALFPERIOD:
        diff -= _TICKS_PERIOD
    return diff


def log(msg):
    """Write a line to the console (REPL) channel.

    `print` already goes to console, but we wrap it so we can also tee
    to /sudo.log on disk later if needed for offline debugging.
    """
    print("[sudo] " + msg)


# --- Startup state report --------------------------------------------------

log("firmware booting")
log("usb_cdc.console=%s usb_cdc.data=%s" % (
    "ok" if usb_cdc.console is not None else "MISSING",
    "ok" if usb_cdc.data is not None else "MISSING — boot.py probably hasn't run; unplug/replug",
))


serial = usb_cdc.data  # may be None if boot.py wasn't applied yet


# --- HID device discovery --------------------------------------------------

keyboard_device = None
consumer_device = None
for _device in usb_hid.devices:
    if _device.usage_page == 0x01 and _device.usage == 0x06:
        keyboard_device = _device
    elif _device.usage_page == 0x0C and _device.usage == 0x01:
        consumer_device = _device

log("hid keyboard=%s consumer=%s" % (
    "ok" if keyboard_device else "MISSING",
    "ok" if consumer_device else "MISSING",
))


# --- Pin map ---------------------------------------------------------------

BUTTON_PINS = (board.GP0, board.GP1, board.GP2, board.GP3)


def _make_input(pin):
    p = digitalio.DigitalInOut(pin)
    p.direction = digitalio.Direction.INPUT
    p.pull = digitalio.Pull.UP
    return p


buttons = [_make_input(pin) for pin in BUTTON_PINS]
log("buttons configured on GP0–GP3 (initial state: %s)" % (
    [b.value for b in buttons],
))


# --- Config ----------------------------------------------------------------

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
            log("config.json had %d buttons (expected 4); using defaults" % len(cfg))
            return DEFAULT_BUTTONS
        return cfg
    except OSError:
        log("config.json not found; using passthrough defaults")
        return DEFAULT_BUTTONS
    except ValueError as e:
        log("config.json invalid (%s); using defaults" % e)
        return DEFAULT_BUTTONS


button_configs = load_config()
log("modes: %s" % [b.get("mode") for b in button_configs])


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
    except Exception as e:  # noqa: BLE001
        log("keyboard send failed: %s" % e)


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
    except Exception as e:  # noqa: BLE001
        log("consumer send failed: %s" % e)


def _send_press(button_num):
    """Notify host that button `button_num` (1-indexed) was just pressed."""
    if serial is None:
        log("PRESS %d → DROPPED (usb_cdc.data unavailable)" % button_num)
        return
    if not serial.connected:
        log("PRESS %d → host not connected to data port" % button_num)
        # Still attempt the write; CircuitPython buffers it for when the
        # host opens the port. Useful so the very first press after the
        # app launches still gets through.
    try:
        n = serial.write(("PRESS %d\n" % button_num).encode("utf-8"))
        log("PRESS %d → wrote %d bytes (connected=%s)" % (
            button_num, n, serial.connected))
    except Exception as e:  # noqa: BLE001
        log("PRESS %d → write failed: %s" % (button_num, e))


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
    button_num = idx + 1

    log("button %d pressed (mode=%s)" % (button_num, mode))

    if mode == "passthrough":
        _send_press(button_num)
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
    else:
        log("unknown mode %r — ignoring press" % mode)


# --- Main loop -------------------------------------------------------------

DEBOUNCE_MS = 20

last_state = [True] * 4
debounce_until = [0] * 4

log("entering main loop")

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
    except Exception as e:  # noqa: BLE001
        try:
            log("main loop exception: %s — continuing" % e)
            time.sleep(0.1)
        except Exception:  # noqa: BLE001
            pass
