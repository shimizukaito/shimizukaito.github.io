# PWR-I2C-DIST-11 schematic capture specification

This is the connection-level source for the Rev.A distribution PCB. The board carries three separately protected positive pump-power banks. The bank returns use dedicated high-current paths back to the external star block, but they are not galvanically isolated: logic/signal ground is referenced to pump ground on every row board. Layout must make the heavy return harness much lower impedance than any signal-ground path.

## Sheet 1 — three power banks

### Bank inputs

JPA, JPB, and JPC are Phoenix Contact `MKDS 5/ 2-9,5` (`1714926`), 2-position fixed screw terminal blocks, nominal 32 A. Pin 1 is +12 V and pin 2 is the matching bank return. Use separate net names:

| Bank | Input positive | Input return | Rows |
|---|---|---|---|
| A | BANK_A_12V_IN | BANK_A_GND | 0–3 |
| B | BANK_B_12V_IN | BANK_B_GND | 4–7 |
| C | BANK_C_12V_IN | BANK_C_GND | 8–10 |

FBA/FBB/FBC use Littelfuse `01530008Z` vertical MINI blade-fuse holders. Initial fuse is 15 A / 32 V DC; the final value follows full-bank startup testing. After each fuse, create `BANK_A_12V`, `BANK_B_12V`, or `BANK_C_12V`.

Across each post-fuse bank rail fit one SMBJ15A TVS (cathode to positive), one 470 µF/25 V low-ESR capacitor, one 1 µF/25 V X7R, and one 100 nF/25 V X7R. The footprint may accept 1000 µF, but increasing capacitance requires inrush testing.

### Row fuse and output cell

Repeat eleven times. Fn uses Littelfuse `01530008Z`; initial fuse is 5 A / 32 V DC. JROWn is JST `B2P-VH-FB-B`, mating `VHR-2N`.

| Row | Source positive | Source return | Output positive | Output return |
|---:|---|---|---|---|
| 0–3 | BANK_A_12V | BANK_A_GND | ROW0–ROW3_12V | BANK_A_GND |
| 4–7 | BANK_B_12V | BANK_B_GND | ROW4–ROW7_12V | BANK_B_GND |
| 8–10 | BANK_C_12V | BANK_C_GND | ROW8–ROW10_12V | BANK_C_GND |

Connection for each row `n`:

```text
BANK_x_12V ─ Fn 5 A MINI ─ ROWn_12V ─ JROWn pin 1
BANK_x_GND ─────────────────────────── JROWn pin 2
ROWn_12V ─ RLEDn 10 kΩ ─ LEDn red ─ BANK_x_GND
```

LED anode faces RLEDn; LED cathode faces the bank return. The LED is a fuse-output indicator, not proof that a pump is running.

## Sheet 2 — 5 V logic supply

U2 is Murata `OKI-78SR-5/1.5-W36-C`, fixed 5 V/1.5 A, 7–36 V input. Its footprint and pin order must come from the current Murata drawing; do not substitute a generic 7805 footprint without comparison.

```text
BANK_A_12V ─ FLOGIC 0.75 A resettable fuse ─ U2 VIN
BANK_A_GND ───────────────────────────────── U2 GND
U2 VOUT ───────────────────────────────────── +5V_LOGIC
```

FLOGIC baseline is a 30 V or higher PTC with 0.75 A nominal hold current. Place 10 µF + 100 nF at U2 input and 22 µF + 100 nF at its output, subject to the module datasheet. Add a green 5 V LED with 4.7 kΩ resistor.

The logic ground is referenced to BANK_A_GND at one net tie beside U2 input. BANK_B_GND and BANK_C_GND do not connect to LOGIC_GND on this PCB.

## Sheet 3 — TCA9548A and I²C

### U1 TCA9548APWR, TSSOP-24

| Pin | Name | Net / connection |
|---:|---|---|
| 1 | A0 | +5V_LOGIC |
| 2 | A1 | +5V_LOGIC |
| 3 | RESET | `TCA_RESET_N`; 10 kΩ to +5V_LOGIC; 100 nF DNP to LOGIC_GND; test pad |
| 4 | SD0 | BR0_SDA |
| 5 | SC0 | BR0_SCL |
| 6 | SD1 | BR1_SDA |
| 7 | SC1 | BR1_SCL |
| 8 | SD2 | BR2_SDA |
| 9 | SC2 | BR2_SCL |
| 10–11 | SD3/SC3 | labelled test pads only |
| 12 | GND | LOGIC_GND |
| 13–20 | SD4/SC4…SD7/SC7 | labelled test pads only |
| 21 | A2 | +5V_LOGIC |
| 22 | SCL | MASTER_SCL |
| 23 | SDA | MASTER_SDA |
| 24 | VCC | +5V_LOGIC |

The resulting TCA9548A address is `0x77`. Fit C1 100 nF directly between pins 24 and 12 and C2 4.7 µF nearby.

Pull-ups:

- MASTER_SDA and MASTER_SCL: 4.7 kΩ each to +5V_LOGIC.
- BR0, BR1, and BR2 SDA/SCL: 4.7 kΩ each to +5V_LOGIC.
- Provide a DNP 4.7 kΩ parallel footprint beside each fitted 4.7 kΩ, allowing an effective value near 2.35 kΩ only after rise-time measurement.
- Do not fit pull-ups to unused channels 3–7.

### Branch connectors

JSA/JSB/JSC are JST `B6B-XH-A(LF)(SN)` with the same pin order as every row board:

| Pin | JSA | JSB | JSC |
|---:|---|---|---|
| 1 | LOGIC_GND | LOGIC_GND | LOGIC_GND |
| 2 | BR0_SDA | BR1_SDA | BR2_SDA |
| 3 | LOGIC_GND | LOGIC_GND | LOGIC_GND |
| 4 | BR0_SCL | BR1_SCL | BR2_SCL |
| 5 | +5V_LOGIC | +5V_LOGIC | +5V_LOGIC |
| 6 | PWM_OE_N | PWM_OE_N | PWM_OE_N |

### Arduino master connector JM

JM is JST `B6B-XH-A(LF)(SN)`.

| Pin | Signal |
|---:|---|
| 1 | LOGIC_GND / Arduino GND |
| 2 | MASTER_SDA / Arduino Mega pin 20 |
| 3 | MASTER_SCL / Arduino Mega pin 21 |
| 4 | ARM |
| 5 | FAULT_N reserved; DNP/test pad in Rev.A |
| 6 | NC; do not connect Arduino 5 V |

## Sheet 4 — fail-safe global output enable

QOE is a 2N7002 N-channel MOSFET, pins 1 G, 2 S, 3 D. It is only a logic sink; it does not switch pump current.

```text
+5V_LOGIC ─ ROE 10 kΩ ─ PWM_OE_N ─ QOE pin 3 D
ARM ─ RARM 1 kΩ ─ ARM_GATE ───────── QOE pin 1 G
                    │
                 RARMPD 100 kΩ
                    │
                 LOGIC_GND ───────── QOE pin 2 S
```

ARM LOW, a broken ARM wire, an unpowered Arduino, or QOE not fitted leaves PWM_OE_N HIGH and disables all PCA9685 outputs. Add an optional normally-closed interlock connector and solder jumper in the ARM-to-RARM path; populate the jumper for Rev.A because a dedicated emergency-stop loop is not installed.

## Required ERC assertions

- There must be no connection among the three post-fuse positive rails BANK_A_12V, BANK_B_12V, and BANK_C_12V.
- Each high-current row return must route directly to its assigned bank-return terminal. Signal ground is a reference path, not a pump-current return.
- Every row fuse must source exactly one row connector and indicator LED.
- Every row connector return must return to the same bank as its positive feed.
- U2 may be powered only from post-bank-fuse BANK_A_12V through FLOGIC.
- Arduino 5 V must not appear on JM or connect to +5V_LOGIC.
- TCA pins 1, 2, and 21 must all be HIGH, giving address 0x77.
- Unused TCA channel pins may have test pads but no pull-ups.
- PWM_OE_N must have one 10 kΩ pull-up and may only be pulled low by QOE.
- JSA, JSB, and JSC pin order must match row-board J1/J2 exactly.
