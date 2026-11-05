# EasyEDA implementation prompt

Use this after the mechanical dimensions and exact connectors have been decided.

```text
Create two EasyEDA Pro projects from the attached EmerFlux Rev.A design package:

1. ROW-DRV-11: an identical 11-channel row driver PCB, quantity 11.
2. PWR-I2C-DIST-11: a three-bank power, I2C, and safety distribution PCB, quantity 1.

Authoritative inputs:
- electrical/row-driver.md
- electrical/distribution.md
- electrical/interfaces.md
- electrical/calculations.md
- bom/*.csv
- tables/address-map.csv
- verification/checklist.md

Workflow constraints:
1. Do not guess connector footprints or board dimensions. Stop and list missing mechanical data.
2. Build one repeated pump-channel hierarchical block, then instantiate it eleven times.
3. Show TBD62783APG input, VCC, GND, and reversed output pin numbering explicitly and verify it against the Toshiba datasheet.
4. Add net classes for LOGIC, PUMP_CHANNEL, ROW_4A, and BANK_15A.
5. Keep POWER_GND and LOGIC_GND separated until the specified net tie.
6. Implement fail-safe OE exactly as specified: pull-up means disabled.
7. Do not autoroute power nets.
8. Run ERC and report every warning; do not silently waive warnings.
9. Before PCB placement, output a connector pin table and obtain human approval.
10. Before Gerber generation, output copper-width/current calculations, fuse coordination assumptions, and a DRC report.
11. Generate only one ROW-DRV-11 prototype set until its physical load test passes.

The pump is WP310B-120, rated 12 V with manufacturer maximum current 300 mA.
Use two TBD62783APG DIP-18 source-driver arrays, split 6 + 5 channels. The existing AE-PCA9685 module remains external. Pump XH pin 1 is the switched positive output and pin 2 is GND. Do not substitute a low-side MOSFET topology without a new review.

Mechanical decisions already made:
- ROW-DRV-11 outline: 150 mm × 65 mm.
- Eleven pump connectors at 12 mm centre pitch.
- Pump connector: genuine JST XH B2B-XH-A(LF)(SN), cable housing XHP-2, contact SXH-001T-P0.6.
- Row signal connectors: JST B6B-XH-A(LF)(SN), cable housing XHP-6.
- Row power connector: JST B2P-VH-FB-B, cable housing VHR-2N.
- TCA9548A address: 0x77; do not use 0x70 because it is the PCA9685 power-up All-Call address.
- Add six 2 × 6 mm strain-relief slots behind the eleven pump connectors.
- Maximum distributor-to-row distance: approximately 300 mm.
- Dedicated emergency-stop contactor is DNP; preserve the optional interface and require an external manual DC disconnect.
```
