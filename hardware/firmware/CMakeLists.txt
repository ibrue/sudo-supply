cmake_minimum_required(VERSION 3.13)

# Pull in the Pico SDK. PICO_SDK_PATH must be set in your environment, or use
# the SDK's pico_sdk_import.cmake helper (see README.md).
include(pico_sdk_import.cmake)

project(sudo_firmware C CXX ASM)
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

pico_sdk_init()

add_executable(sudo_firmware
    main.c
    usb_descriptors.c
)

target_include_directories(sudo_firmware PRIVATE ${CMAKE_CURRENT_LIST_DIR})

target_link_libraries(sudo_firmware
    pico_stdlib
    pico_unique_id
    hardware_flash
    tinyusb_device
    tinyusb_board
)

# Reserve the last 4 KB of flash for sudo config. The linker script keeps the
# firmware out of that region; the app writes its config UF2 there directly.
# 2 MB flash - 4 KB config = 0x1FF000 of usable firmware space.
target_compile_definitions(sudo_firmware PRIVATE
    PICO_FLASH_SIZE_BYTES=0x200000
)

pico_enable_stdio_usb(sudo_firmware 1)
pico_enable_stdio_uart(sudo_firmware 0)

pico_add_extra_outputs(sudo_firmware)
