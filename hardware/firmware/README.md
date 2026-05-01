# sudo macropad firmware — CircuitPython

The pad runs [CircuitPython](https://circuitpython.org/) on the RP2040.
The whole firmware is a single Python file: [`code.py`](./code.py).

## Why CircuitPython

We previously wrote our own C firmware against the Pico SDK. That worked
on paper but in practice the toolchain — Pico SDK install, ARM cross
compiler, CI builds, UF2 byte-stitching, flash sectors — was way more
machinery than a 4-button macropad warrants. CircuitPython gives us a
battle-tested HID stack from Adafruit, plain-text behaviour you can edit
on the device's mass-storage volume, and instant auto-reload on save.

## How it works

1. The companion app flashes the official CircuitPython UF2 to `RPI-RP2`
   (BOOTSEL mass storage). One time only, when the chip is blank.
2. After reboot the device enumerates as `CIRCUITPY` mass storage.
3. The app copies `code.py` and `config.json` to `CIRCUITPY` directly.
   CircuitPython watches the filesystem, sees the change, and reloads
   `code.py` within ~250 ms.
4. Subsequent config changes are just `config.json` writes — no UF2,
   no BOOTSEL, no reboot.

## Pin map

Matches `pcb/sudo-supply.kicad_sch`:

| Net | GPIO | Direction |
|---|---|---|
| BTN1 (bottom, approve) | 0  | input, pull-up |
| BTN2 (action3)         | 1  | input, pull-up |
| BTN3 (reject)          | 2  | input, pull-up |
| BTN4 (top, action4)    | 3  | input, pull-up |
| LED1                   | 25 | output |
| LED2                   | 24 | output |

## Config schema

`config.json`, written to the root of `CIRCUITPY`:

```json
{
  "version": 1,
  "mode": "dynamic" | "simple" | "custom",
  "buttons": [
    {"mode": "keycombo"|"mediakey"|"passthrough",
     "keycode": <hid usage>, "modifiers": <hid mod mask>,
     "name": "<display>"},
    ... 4 entries, physical order bottom→top
  ]
}
```

Modifier mask matches the USB HID keyboard report byte:
`0x01 = ctrl`, `0x02 = shift`, `0x04 = alt`, `0x08 = gui (cmd)`.

If `config.json` is missing or invalid, `code.py` falls back to a
passthrough config: F13–F16 + ctrl+shift, matching the app's default
hotkey bindings.

## Manual install (without the app)

If you want to install CircuitPython by hand:

1. Hold the BOOTSEL switch on the macropad while plugging in. `RPI-RP2`
   mounts.
2. Download the
   [CircuitPython UF2 for the Raspberry Pi Pico](https://circuitpython.org/board/raspberry_pi_pico/)
   and drag it onto `RPI-RP2`.
3. Once `CIRCUITPY` mounts, drag `code.py` from this directory onto it.
4. Optionally drop a `config.json` next to `code.py` — see schema above.
