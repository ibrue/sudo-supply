# sudo macropad — boot.py
#
# Runs once at every cold boot, BEFORE code.py. Enables a second USB
# serial channel (usb_cdc.data) so the host app can receive button
# events on a dedicated wire instead of trying to intercept HID F-keys
# system-wide.
#
# Console (REPL) stays enabled on its own /dev/tty.usbmodem* device for
# debugging. Data channel is what the app actually listens on.
#
# IMPORTANT: changes to boot.py require a hardware reset (unplug/replug
# the device) to take effect. CircuitPython auto-reload only re-runs
# code.py.

import usb_cdc

usb_cdc.enable(console=True, data=True)
