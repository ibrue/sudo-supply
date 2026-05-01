# sudo macropad — boot.py
#
# Runs once at every cold boot, BEFORE code.py. This is the only place
# CircuitPython lets you reconfigure USB device classes — `storage`,
# `usb_hid`, `usb_cdc` etc. all have to be set up here.
#
# Why we hide the CIRCUITPY drive in normal use:
#   The macropad is a HID device that gets plugged / unplugged often.
#   Each unplug while CIRCUITPY is mounted triggers macOS's "Disk Not
#   Ejected Properly" warning. By calling storage.disable_usb_drive()
#   we don't expose mass storage at all — host sees only HID, no warning
#   on disconnect, totally hot-pluggable.
#
# How to flash again afterwards:
#   The drive is still needed when the companion app wants to write
#   code.py / config.json. Hold the bottom button (GP3 — "button 1")
#   while plugging the device in. boot.py reads the pin state at this
#   exact moment; if it's low (button held) we *don't* disable the
#   drive, so CIRCUITPY shows up normally and the app can flash.
#   Release the button after the drive mounts; it stays mounted for
#   the rest of that session.

import board
import digitalio
import storage

_btn = digitalio.DigitalInOut(board.GP3)
_btn.direction = digitalio.Direction.INPUT
_btn.pull = digitalio.Pull.UP

# Active-low: button pressed → pin reads False → flash mode.
_flash_mode = not _btn.value

if not _flash_mode:
    storage.disable_usb_drive()

# Release the pin so code.py can re-claim GP3 as part of buttons[].
_btn.deinit()
