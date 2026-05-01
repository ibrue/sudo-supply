# Helper that imports the Pico SDK from PICO_SDK_PATH. Copy this file from
# the upstream pico-sdk repo (it lives at the root) — kept here so the
# firmware build is self-contained relative to a known SDK install.
#
# To use:
#   1. git clone https://github.com/raspberrypi/pico-sdk
#   2. cp pico-sdk/external/pico_sdk_import.cmake hardware/firmware/
#   3. export PICO_SDK_PATH=/path/to/pico-sdk
#
# We don't vendor the file directly — it changes between SDK versions and
# CMakeLists.txt above will fail loudly with a clear error if it's missing.

if (NOT DEFINED PICO_SDK_PATH AND NOT DEFINED ENV{PICO_SDK_PATH})
    message(FATAL_ERROR
        "PICO_SDK_PATH is not set.\n"
        "Install the Pico SDK and either:\n"
        "  export PICO_SDK_PATH=/path/to/pico-sdk\n"
        "or pass -DPICO_SDK_PATH=... to cmake.\n"
        "Then copy pico-sdk/external/pico_sdk_import.cmake into this directory.")
endif()

# Once you've copied the real pico_sdk_import.cmake from the SDK over this
# placeholder, the include below resolves and the build proceeds normally.
# This file deliberately does nothing useful on its own.
