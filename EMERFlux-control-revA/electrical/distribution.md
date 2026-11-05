# PWR-I2C-DIST-11 electrical design

## Purpose

The distribution board performs four functions:

1. Splits pump power into eleven individually fused row feeds.
2. Splits I²C into three isolated-capacitance branches; the longest distributor-to-row distance is under 300 mm.
3. Generates the 5 V logic rail for the PCA9685 row boards.
4. Implements fail-safe global output enable and preserves an optional future stop/contactor interface.

It does **not** replace the external high-current three-way distribution block or an accessible DC-rated master disconnect.

## Power architecture

```text
12 V PSU
   │
DC-rated master disconnect/breaker (manual cutoff)
   │
external 3-way distribution block
   ├── JPA Bank A input ── F0..F3 ── ROW_PWR_0..3
   ├── JPB Bank B input ── F4..F7 ── ROW_PWR_4..7
   └── JPC Bank C input ── F8..F10 ─ ROW_PWR_8..10
```

Each bank input must be rated for at least 15 A. Each row output must be rated for at least 5 A. Use three independent positive planes and dedicated high-current return routes to the corresponding bank terminals. The external distribution block is the primary ground star. The returns are not galvanically isolated because the row electronics and I²C require a common reference; make every power-return harness far lower impedance than the signal-ground conductors so pump current does not choose the I²C cable.

### Per-row protected output

Repeat eleven times:

```text
BANK_n_12V ── Fn 5 A time-delay ── JROW_n pin 1
BANK_n_GND ──────────────────────── JROW_n pin 2
```

Provide a red LED and 10 kΩ resistor after each fuse so an open fuse is visible when the row is connected. The final fuse rating must follow measured startup current and wiring ampacity.

### Bank input protection and monitoring

For each of Bank A, B, and C:

- Input connector ≥15 A.
- 15 A replaceable bank fuse or breaker footprint.
- SMBJ15A TVS footprint.
- 1000 µF / 25 V bulk capacitor footprint.
- Test points before and after the bank fuse.
- Optional current-sensor connector/footprint. Do not commit to a shunt value until required measurement range and ADC are selected.

### Logic supply

Use the fixed Murata `OKI-78SR-5/1.5-W36-C` module (7–36 V input, 5 V/1.5 A output) with the exact current-datasheet footprint:

```text
Bank A 12 V ── 0.5 A fuse ── 5 V / ≥1 A buck ── +5V_LOGIC
```

The 5 V rail powers only the TCA9548A and eleven PCA9685 boards. Arduino Mega remains separately powered. Connect grounds, but do not tie two independently regulated 5 V outputs together.

The installed supply is listed as 12 V, 30 A, and 360 W. It covers the observed approximately 13 A load with margin, but not the pump-datasheet theoretical 36.3 A. Firmware must prevent an untested all-channel 100% condition, or the PSU and all upstream protection/wiring must be upgraded.

Fit a 0.75 A hold, 30 V or higher resettable fuse at its input and the input/output capacitors specified in `distribution-schematic.md`. Verify the ordered module pinout against the PCB footprint before fabrication.

## I²C architecture

### Master connector JM

| Pin | Signal | Direction |
|---:|---|---|
| 1 | Arduino GND | common reference |
| 2 | SDA | bidirectional |
| 3 | SCL | input from Arduino |
| 4 | ARM | input, HIGH requests pump enable |
| 5 | FAULT_N | optional output to Arduino |
| 6 | +5V_SENSE | optional sense only; do not connect to Arduino 5 V output by default |

### U1: TCA9548A

- VCC: +5V_LOGIC.
- RESET: 10 kΩ pull-up to 5 V; 100 nF to GND optional footprint; reset test pad.
- A0, A1, and A2: +5V_LOGIC, producing address `0x77`. Do not use `0x70`: every PCA9685 responds to its enabled power-up All-Call address `0x70` until firmware disables that response.
- Upstream SDA/SCL: 4.7 kΩ pull-ups to +5V_LOGIC and optional 33 Ω series resistors.
- Channel 0: rows 0–3.
- Channel 1: rows 4–7.
- Channel 2: rows 8–10.
- Channels 3–7: labelled test pads, disabled in normal firmware.

Every downstream branch gets its own 2.2–4.7 kΩ pull-ups selected after rise-time measurement. Start with 4.7 kΩ at 100 kHz. Place optional footprints for 2.2 kΩ in parallel.

### Branch signal connectors JSA…JSC

Each connector matches the row-board J1/J2 pinout:

| Pin | Signal |
|---:|---|
| 1 | LOGIC_GND |
| 2 | branch SDA |
| 3 | LOGIC_GND |
| 4 | branch SCL |
| 5 | +5V_LOGIC |
| 6 | PWM_OE_N |

Use one daisy chain per branch; do not create an eleven-cable I²C star:

```text
JSA ─ ROW0 ─ ROW1 ─ ROW2 ─ ROW3
JSB ─ ROW4 ─ ROW5 ─ ROW6 ─ ROW7
JSC ─ ROW8 ─ ROW9 ─ ROW10
```

Keep every inter-board segment short. If the mechanical structure forces long stubs or a star, replace this wiring with differential I²C extenders or a local MCU/RS-485 architecture rather than assuming ordinary I²C will remain reliable.

## Fail-safe global enable and optional safety loop

`PWM_OE_N` is active LOW at the PCA9685 but the system must default to OFF.

```text
+5V_LOGIC ── 10 kΩ ── PWM_OE_N ── all row OE pins
                            │
                         QOE drain
Arduino ARM ── enable logic ─ QOE gate
                         QOE source
                            │
                           GND
```

QOE is allowed to pull `PWM_OE_N` low only when all conditions are true:

- 5 V logic supply is valid.
- Arduino explicitly asserts ARM.
- Optional safety loop is healthy, or its designated jumper is fitted.
- Optional fault input is inactive.

Use a small hardware AND/interlock stage rather than firmware alone. A practical Rev.A implementation is:

- ARM drives an optocoupler or NPN stage.
- An optional external stop/interlock contact can be placed in series with the QOE sink path.
- When the cable breaks, Arduino resets, or the optional stop contact opens, QOE releases and the 10 kΩ pull-up disables every PCA9685 output.

If no dedicated emergency-stop system is installed, fit the documented safety-loop jumper but retain an accessible, manually operated DC-rated disconnect/breaker before the bank split.

## Optional contactor interface

Provide an unpopulated connector/driver footprint for a future **DC-rated external contactor module** rather than routing its load current through small PCB relays.

| Pin | Signal |
|---:|---|
| 1 | contactor coil + |
| 2 | contactor coil switched return |
| 3 | auxiliary contact input |
| 4 | auxiliary contact return |

Fit a flyback diode across a DC coil unless the contactor module already provides one. The contactor contact rating must exceed the selected PSU current and must be specified for DC switching at 12 V.

## PCB construction and current paths

- Two-layer FR-4, 1.6 mm, **2 oz copper minimum**.
- Keep Banks A/B/C as separate copper systems.
- Each bank's shared input segment is designed for 15 A.
- Use top and bottom pours in parallel with via stitching.
- Target at least 15–20 mm combined copper width for each 15 A bank trunk, subject to the PCB fabricator's IPC-2152 calculation and allowed temperature rise.
- Add exposed, solder-mask-free rails so AWG12 tinned copper wire or copper strip can reinforce each bank trunk.
- Each row branch is designed for 4 A continuous and uses short, wide pours.
- Separate high-current terminals and fuses from U1 and I²C routing.
- Place I²C connectors along one board edge and power connectors along the opposite edge.
- Add a transparent cover or finger-safe fuse holders; 12 V at tens of amperes can still cause burns and fire.

## Suggested physical layout

Rev.A planning outline: **180 mm × 100 mm**, 1.6 mm thick, 2 oz copper. This is a planning limit rather than a released PCB outline: verify the exact Littelfuse fuse-holder, Phoenix bank-terminal, Murata module, and JST footprints first. Preliminary M3 hole centres are `(5,5)`, `(175,5)`, `(5,95)`, and `(175,95)` mm.

```text
┌──────────────────────────────────────────────────────────────────┐
│ BANK A IN  FA  F0  F1  F2  F3      ROW POWER 0 1 2 3             │
│ BANK B IN  FB  F4  F5  F6  F7      ROW POWER 4 5 6 7             │
│ BANK C IN  FC  F8  F9  F10         ROW POWER 8 9 10              │
│                                                                  │
│ 5V BUCK   TCA9548A   MASTER   ESTOP/CONTACTOR                    │
│ SIGNAL BRANCH A     SIGNAL BRANCH B     SIGNAL BRANCH C           │
└──────────────────────────────────────────────────────────────────┘
```

Because the theoretical load exceeds 400 W, final copper widths, connectors, fuses, contactor, and wiring must be reviewed against measured peak current and the chosen fabrication stack-up before release.
