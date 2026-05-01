# sudo macropad firmware

RP2040 firmware for the sudo macropad. Polls 4 buttons, sends USB HID
keystrokes, drives the under-glow LEDs, and talks to the companion app over
USB CDC.

## What's here

| File | Purpose |
|---|---|
| `main.c` | main loop: button polling, HID dispatch, LED state machine, CDC reader |
| `sudo_config.h` | binary layout of the on-flash user config — must match `SudoConfigUF2.swift` in the app |
| `usb_descriptors.c` | composite USB device: HID keyboard + consumer-control + CDC |
| `tusb_config.h` | TinyUSB feature flags for this build |
| `CMakeLists.txt` | Pico SDK build config |

## Pin map

Matches `pcb/sudo-supply.kicad_sch`:

| Net | GPIO | Direction |
|---|---|---|
| BTN1 (bottom, approve) | 0 | input, pull-up |
| BTN2 (action3) | 1 | input, pull-up |
| BTN3 (reject) | 2 | input, pull-up |
| BTN4 (top, action4) | 3 | input, pull-up |
| LED1 | 25 | output |
| LED2 | 24 | output |

## How config flashing works

The companion app generates a 256-byte config blob, wraps it in a single
512-byte UF2 block targeting flash address `0x101FF000` (last 4 KB sector of
the 2 MB W25Q16JV), and copies it to the `RPI-RP2` mass-storage volume that
appears when BOOTSEL is held during USB enumeration. The bootloader writes
the block to flash without touching the rest. On the next boot the firmware
checks the magic at that address and applies the per-button mappings.

Because the config sector lives at the very end of flash, the firmware itself
can grow up to ~2 MB - 4 KB without colliding.

## Building

```bash
# one-time SDK setup
git clone https://github.com/raspberrypi/pico-sdk
cd pico-sdk && git submodule update --init && cd ..
export PICO_SDK_PATH="$(pwd)/pico-sdk"
cp pico-sdk/external/pico_sdk_import.cmake .

# build
mkdir build && cd build
cmake ..
make -j
```

The build output is `sudo_firmware.uf2`. To flash:

1. Hold the BOOTSEL switch (SW1) and plug the device into USB.
2. The `RPI-RP2` volume will mount.
3. Drag `sudo_firmware.uf2` onto it.
4. The board reboots into normal mode.

After that, use the sudo app's `[ flash config ]` button to push the user's
button config into the reserved sector — no firmware reflash needed.

## LED state protocol (CDC)

The app sends single bytes over the CDC channel; the firmware updates its
under-glow accordingly. See `enum led_state_t` in `main.c` and
`PadLEDState` in `Sudo/Sources/Sudo/Services/PadCommunicator.swift`.

| Byte | Meaning |
|---|---|
| `0x01` | idle (dim under-glow) |
| `0x02` | processing (1 Hz pulse) |
| `0x03` | success (full-on flash, ~600 ms) |
| `0x04` | failure (double-flash, ~800 ms) |
| `0x05` | waiting for input (full-on) |
| `0x06` | button pressed (~120 ms flash) |
| `0x07` | reboot into BOOTSEL — used by the app to re-flash the device without the user pressing the BOOTSEL switch (calls `reset_usb_boot()`, doesn't return) |

The `button pressed` state is also asserted internally by the firmware on
every physical press, so under-glow feedback is instantaneous even when the
host app isn't connected.

## Wiring with the app

| App-side change | Firmware effect |
|---|---|
| `[mode: dynamic]` + flash config | every button passes through F13–F16 with ctrl+shift; the macOS app does AI search |
| `[mode: simple]` + apply preset + flash config | each button sends the preset's keycombo natively (no app needed) |
| `[mode: custom]` + per-button config + flash config | each button sends the user-defined keycombo or media key natively |

Note: `dynamic` mode flashes a passthrough config so the device still works
when the app isn't running.
