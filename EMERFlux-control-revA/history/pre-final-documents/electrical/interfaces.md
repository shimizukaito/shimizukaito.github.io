# System interfaces

## Row assignment

Each row board drives eleven adjacent pumps. Logical coordinates use `(x, y)` where `x = 0…10` and `y = 0…10`.

```text
row board = y
PCA9685 channel = x
```

## Harnesses

### H1 — pump harness, quantity 121

- Two conductors.
- Pin 1: PWM-switched positive +12 V.
- Pin 2: permanent GND.
- Connector: JST XH `XHP-2` housing to PCB `B2B-XH-A(LF)(SN)` header; polarized friction/weak lock.
- Production baseline: specified stranded copper wire, UL1007 AWG24, red/black, with insulation OD no greater than 1.9 mm. Verify the selected supplier's datasheet.
- Existing VKLSVAN B08BCBLDR8 20 cm Dupont wire may be used for prototype harnesses only after measuring conductor/insulation and passing the crimp pull test; its listing does not state AWG or insulation OD.
- Cut off only the existing male Dupont contact, then strip and crimp a genuine `SXH-001T-P0.6` contact onto sound, untarnished copper. The contact accepts AWG30–22 and 0.9–1.9 mm insulation diameter.
- Secure each cable group through the row-board strain-relief slots; do not rely on XH retention against cable pull.

### H2 — row power harness, quantity 11

- Two conductors.
- Design current: 4 A continuous per row.
- Suggested starting point: 0.75 mm² copper or larger, verified against length, bundle temperature, and connector rating.
- Distributor end and row-board end must use different gender/keying to prevent accidental power output-to-output connections.

### H3 — row signal harness, quantity 11 segments across three daisy chains

- Six conductors.
- Pair SDA with GND and SCL with GND.
- Keep separate from pump wiring.
- Connect shield to chassis at the distributor end only if a shielded cable is used; provide a chassis pad, not an automatic logic-ground connection.
- Wiring order is distributor→rows 0–3, distributor→rows 4–7, and distributor→rows 8–10. Avoid star stubs.
- With a maximum approximately 300 mm distributor-to-row distance, begin at 100 kHz and verify waveforms at the farthest board under full pump switching.

### H4 — Arduino master harness, quantity 1

- GND, SDA, SCL, ARM, optional FAULT_N.
- Arduino Mega SDA/SCL are pins 20/21.
- ARM must have a default-low pull-down at the Arduino side.

## Power-domain rules

- Arduino and the PCB system share ground for I²C.
- Arduino 5 V and distributor 5 V must not be paralleled.
- Pump power ground enters each row board through its power connector, not through the signal connector.
- The signal connector ground is a reference/return for logic only.
- The external power distribution block is the single system star point for the three 12 V bank returns.

## Addressing

TCA9548A strapped address: `0x77`. Address `0x70` is reserved here for the PCA9685 power-up All-Call response and is disabled in every PCA9685 during initialization.

PCA9685 row addresses are `0x40 + y`. Keeping globally unique addresses simplifies diagnostics even though rows are split among three branches.

| I²C branch | TCA channel | Rows |
|---|---:|---|
| A | 0 | 0, 1, 2, 3 |
| B | 1 | 4, 5, 6, 7 |
| C | 2 | 8, 9, 10 |

## Update sequence

For a full 11 × 11 frame:

1. Assert `PWM_OE_N` high during initialization.
2. Select TCA channel 0 and update rows 0–3.
3. Select TCA channel 1 and update rows 4–7.
4. Select TCA channel 2 and update rows 8–10.
5. After all PCA registers are valid and safety inputs pass, pull `PWM_OE_N` low.
6. On communication timeout, I²C error, brownout, or emergency stop, release `PWM_OE_N` immediately.

Stagger each PCA9685 channel's ON count across the 4096-step PWM period so 121 pumps do not switch simultaneously. Preserve the requested duty by shifting ON and OFF counts together.
