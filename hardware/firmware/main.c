// sudo macropad firmware — RP2040 / W25Q16JV
//
// Polls 4 buttons (GPIO0-3), sends USB HID keycodes per the on-flash config,
// pulses the under-glow LEDs (GPIO24/25) on each press, and listens on USB
// CDC for app-driven LED state changes (idle / processing / success / etc).
//
// Build: see CMakeLists.txt and README.md.

#include <stdint.h>
#include <stdbool.h>
#include <string.h>

#include "pico/stdlib.h"
#include "pico/bootrom.h"
#include "hardware/gpio.h"
#include "hardware/flash.h"

#include "tusb.h"
#include "bsp/board.h"

#include "sudo_config.h"

// -----------------------------------------------------------------------------
// Pin map (matches sudo-supply.kicad_sch)
// -----------------------------------------------------------------------------

#define PIN_BTN1   0   // bottom — approve
#define PIN_BTN2   1   // action3
#define PIN_BTN3   2   // reject
#define PIN_BTN4   3   // top — action4
#define PIN_LED1  25
#define PIN_LED2  24

static const uint8_t button_pins[SUDO_NUM_BUTTONS] = {
    PIN_BTN1, PIN_BTN2, PIN_BTN3, PIN_BTN4,
};

// -----------------------------------------------------------------------------
// Config (read from flash)
// -----------------------------------------------------------------------------

// On RP2040 the QSPI flash is XIP-mapped at 0x10000000, so we can read the
// config struct as a regular pointer.
static const sudo_config_t *config_ptr = (const sudo_config_t *)SUDO_CONFIG_FLASH_ADDR;
static sudo_config_t active_config;

// Default config used when flash is blank or magic doesn't match. All buttons
// pass through F13-F16 with ctrl+shift, matching the app's hotkey defaults.
static void load_default_config(void) {
    memset(&active_config, 0, sizeof(active_config));
    active_config.magic   = SUDO_CONFIG_MAGIC;
    active_config.version = SUDO_CONFIG_VERSION;
    active_config.mode    = 2;
    static const uint8_t fkeys[SUDO_NUM_BUTTONS] = {
        0x68 /*F13*/, 0x6A /*F15*/, 0x69 /*F14*/, 0x6B /*F16*/,
    };
    for (int i = 0; i < SUDO_NUM_BUTTONS; i++) {
        active_config.buttons[i].action_mode   = SUDO_MODE_KEYCOMBO;
        active_config.buttons[i].hid_keycode   = fkeys[i];
        active_config.buttons[i].hid_modifiers = SUDO_MOD_CTRL | SUDO_MOD_SHIFT;
        snprintf(active_config.buttons[i].name, SUDO_NAME_LEN, "button %d", i + 1);
    }
}

static void load_config(void) {
    if (config_ptr->magic == SUDO_CONFIG_MAGIC &&
        config_ptr->version == SUDO_CONFIG_VERSION) {
        memcpy(&active_config, config_ptr, sizeof(active_config));
    } else {
        load_default_config();
    }
}

// -----------------------------------------------------------------------------
// LED state machine
// -----------------------------------------------------------------------------

typedef enum {
    LED_IDLE             = 0x01,
    LED_PROCESSING       = 0x02,
    LED_SUCCESS          = 0x03,
    LED_FAILURE          = 0x04,
    LED_WAITING_FOR_INPUT = 0x05,
    LED_BUTTON_PRESSED   = 0x06,
} led_state_t;

// CDC command bytes that aren't LED states. The app sends these to drive
// non-visual behaviour (currently: jump to BOOTSEL for re-flashing).
#define CDC_CMD_REBOOT_BOOTSEL  0x07

static led_state_t led_state = LED_IDLE;
static uint32_t led_state_set_at_ms = 0;

static void led_set_pwm(uint pin, uint8_t brightness) {
    // Cheap software PWM via period-modulated GPIO would be smoother, but for
    // an under-glow flash a simple on/off threshold is good enough and keeps
    // the main loop small.
    gpio_put(pin, brightness > 0x40 ? 1 : 0);
}

static void leds_init(void) {
    gpio_init(PIN_LED1);
    gpio_init(PIN_LED2);
    gpio_set_dir(PIN_LED1, GPIO_OUT);
    gpio_set_dir(PIN_LED2, GPIO_OUT);
    gpio_put(PIN_LED1, 0);
    gpio_put(PIN_LED2, 0);
}

static void leds_set(uint8_t b1, uint8_t b2) {
    led_set_pwm(PIN_LED1, b1);
    led_set_pwm(PIN_LED2, b2);
}

static void set_led_state(led_state_t s) {
    led_state = s;
    led_state_set_at_ms = board_millis();
}

// Drive both LEDs from the current state. Called from the main loop.
static void leds_tick(void) {
    uint32_t since = board_millis() - led_state_set_at_ms;
    switch (led_state) {
    case LED_IDLE: {
        leds_set(0x10, 0x10);  // dim under-glow
        break;
    }
    case LED_PROCESSING: {
        // 1 Hz pulse
        uint8_t v = ((since / 250) & 1) ? 0xFF : 0x40;
        leds_set(v, v);
        break;
    }
    case LED_SUCCESS: {
        leds_set(0xFF, 0xFF);
        if (since > 600) set_led_state(LED_IDLE);
        break;
    }
    case LED_FAILURE: {
        // Quick double-flash
        uint8_t v = (since < 100 || (since > 200 && since < 300)) ? 0xFF : 0;
        leds_set(v, v);
        if (since > 800) set_led_state(LED_IDLE);
        break;
    }
    case LED_WAITING_FOR_INPUT: {
        leds_set(0xFF, 0xFF);
        break;
    }
    case LED_BUTTON_PRESSED: {
        // Brief flash — under-glow lights on every physical press
        leds_set(0xFF, 0xFF);
        if (since > 120) set_led_state(LED_IDLE);
        break;
    }
    }
}

// -----------------------------------------------------------------------------
// HID
// -----------------------------------------------------------------------------

static void send_keyboard_report(uint8_t modifiers, uint8_t keycode) {
    uint8_t keycodes[6] = {0};
    if (keycode != 0) keycodes[0] = keycode;
    tud_hid_keyboard_report(0 /*report_id*/, modifiers, keycodes);
}

static void release_keyboard(void) {
    tud_hid_keyboard_report(0, 0, NULL);
}

static void send_consumer_control(uint16_t usage) {
    tud_hid_report(2 /*consumer report id*/, &usage, 2);
    uint16_t zero = 0;
    sleep_ms(10);
    tud_hid_report(2, &zero, 2);
}

// Map macOS NX_KEYTYPE values (passed through from the app/UF2) to HID
// consumer-control usage codes. Covers play/pause, next, prev.
static uint16_t mediakey_to_consumer(uint8_t nx_keytype) {
    switch (nx_keytype) {
    case 16: return 0xCD;  // play/pause
    case 17: return 0xB5;  // next track
    case 18: return 0xB6;  // previous track
    case 19: return 0xB7;  // stop
    case 20: return 0xE2;  // mute
    default: return 0;
    }
}

static void dispatch_button(int idx) {
    if (idx < 0 || idx >= SUDO_NUM_BUTTONS) return;
    sudo_button_t b = active_config.buttons[idx];
    set_led_state(LED_BUTTON_PRESSED);

    switch (b.action_mode) {
    case SUDO_MODE_KEYCOMBO:
    case SUDO_MODE_PASSTHROUGH:
        send_keyboard_report(b.hid_modifiers, b.hid_keycode);
        sleep_ms(15);
        release_keyboard();
        break;
    case SUDO_MODE_MEDIAKEY: {
        uint16_t usage = mediakey_to_consumer(b.hid_keycode);
        if (usage != 0) send_consumer_control(usage);
        break;
    }
    }
}

// -----------------------------------------------------------------------------
// Buttons
// -----------------------------------------------------------------------------

static bool prev_button_state[SUDO_NUM_BUTTONS] = {true, true, true, true};
static uint32_t debounce_until_ms[SUDO_NUM_BUTTONS] = {0, 0, 0, 0};
#define DEBOUNCE_MS 20

static void buttons_init(void) {
    for (int i = 0; i < SUDO_NUM_BUTTONS; i++) {
        gpio_init(button_pins[i]);
        gpio_set_dir(button_pins[i], GPIO_IN);
        gpio_pull_up(button_pins[i]);  // schematic: switch shorts to GND
    }
}

// Poll once per main-loop tick. Buttons are active-low.
static void buttons_tick(void) {
    uint32_t now = board_millis();
    for (int i = 0; i < SUDO_NUM_BUTTONS; i++) {
        if (now < debounce_until_ms[i]) continue;
        bool state = gpio_get(button_pins[i]);  // true = released (pulled high)
        if (state != prev_button_state[i]) {
            prev_button_state[i] = state;
            debounce_until_ms[i] = now + DEBOUNCE_MS;
            if (!state) {
                // pressed (falling edge)
                dispatch_button(i);
            }
        }
    }
}

// -----------------------------------------------------------------------------
// USB CDC: app → firmware LED commands
// -----------------------------------------------------------------------------

// One-byte commands; matches PadCommunicator in sudo-app.
static void cdc_tick(void) {
    if (!tud_cdc_available()) return;
    uint8_t buf[8];
    uint32_t n = tud_cdc_read(buf, sizeof(buf));
    for (uint32_t i = 0; i < n; i++) {
        switch (buf[i]) {
        case LED_IDLE:
        case LED_PROCESSING:
        case LED_SUCCESS:
        case LED_FAILURE:
        case LED_WAITING_FOR_INPUT:
        case LED_BUTTON_PRESSED:
            set_led_state((led_state_t)buf[i]);
            break;
        case CDC_CMD_REBOOT_BOOTSEL:
            // Flash both LEDs full-on as a "going down for flashing"
            // indicator, then jump to the ROM bootloader. This call doesn't
            // return — the device disconnects from USB and re-enumerates
            // as RPI-RP2 mass storage. After this, the user never has to
            // physically press the BOOTSEL button to reflash.
            leds_set(0xFF, 0xFF);
            sleep_ms(50);
            reset_usb_boot(0, 0);
            break;
        default:
            break;  // unknown — ignore
        }
    }
}

// -----------------------------------------------------------------------------
// TinyUSB callbacks (descriptors live in usb_descriptors.c)
// -----------------------------------------------------------------------------

uint16_t tud_hid_get_report_cb(uint8_t instance, uint8_t report_id,
                                hid_report_type_t report_type,
                                uint8_t *buffer, uint16_t reqlen) {
    (void) instance; (void) report_id; (void) report_type;
    (void) buffer; (void) reqlen;
    return 0;
}

void tud_hid_set_report_cb(uint8_t instance, uint8_t report_id,
                            hid_report_type_t report_type,
                            uint8_t const *buffer, uint16_t bufsize) {
    (void) instance; (void) report_id; (void) report_type;
    (void) buffer; (void) bufsize;
}

// -----------------------------------------------------------------------------
// main
// -----------------------------------------------------------------------------

int main(void) {
    board_init();
    leds_init();
    buttons_init();
    load_config();
    tusb_init();
    set_led_state(LED_IDLE);

    while (true) {
        tud_task();
        cdc_tick();
        buttons_tick();
        leds_tick();
    }
}
