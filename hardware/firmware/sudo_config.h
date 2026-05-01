// Layout of the user config blob in flash.
//
// MUST match the Swift generator in sudo-app:
//   Sudo/Sources/Sudo/Services/SudoConfigUF2.swift
//
// The companion app builds a single 256-byte payload, wraps it in a UF2
// targeting `SUDO_CONFIG_FLASH_ADDR`, and copies it to RPI-RP2 in BOOTSEL.
// The bootloader writes the block to flash; this firmware reads it on boot.

#ifndef SUDO_CONFIG_H
#define SUDO_CONFIG_H

#include <stdint.h>

// Last 4 KB sector of W25Q16JV (2 MB). Reserved for config — firmware must
// never touch this region.
#define SUDO_CONFIG_FLASH_ADDR    0x101FF000u
#define SUDO_CONFIG_MAGIC         0x4F445553u  // "SUDO" little-endian
#define SUDO_CONFIG_VERSION       0x01u
#define SUDO_CONFIG_PAYLOAD_SIZE  256
#define SUDO_NUM_BUTTONS          4
#define SUDO_NAME_LEN             28

// Per-button action mode.
enum sudo_action_mode {
    SUDO_MODE_PASSTHROUGH = 0,  // send F-key (firmware default for AI search)
    SUDO_MODE_KEYCOMBO    = 1,  // HID keycode + modifiers
    SUDO_MODE_MEDIAKEY    = 2,  // consumer-control keycode
};

// HID modifier bitmask. Matches USB HID keyboard report byte layout.
#define SUDO_MOD_CTRL  0x01
#define SUDO_MOD_SHIFT 0x02
#define SUDO_MOD_ALT   0x04
#define SUDO_MOD_GUI   0x08

#pragma pack(push, 1)

typedef struct {
    uint8_t  action_mode;
    uint8_t  reserved;
    uint8_t  hid_keycode;
    uint8_t  hid_modifiers;
    char     name[SUDO_NAME_LEN];
} sudo_button_t;

typedef struct {
    uint32_t      magic;
    uint8_t       version;
    uint8_t       mode;          // 1=simple, 2=custom (dynamic flashes as custom)
    uint16_t      reserved0;
    sudo_button_t buttons[SUDO_NUM_BUTTONS];   // physical order, bottom→top
    uint8_t       padding[120];
} sudo_config_t;

#pragma pack(pop)

_Static_assert(sizeof(sudo_button_t) == 32, "sudo_button_t must be 32 bytes");
_Static_assert(sizeof(sudo_config_t) == SUDO_CONFIG_PAYLOAD_SIZE,
               "sudo_config_t must be 256 bytes");

#endif
