> 2026-11-04更新：製造対象は修正後のmanufacturing/EmerFlux-11ch-driver.kicad_pcb。最新の判定・変更点はmanufacturing/jlcpcb/設計レビュー.mdを優先。以下の旧検証・寸法・電流上限の記述は履歴を含みます。

# EmerFlux 11×11 pump controller — Rev.A design package

This package defines two PCB types for the 121-pump EmerFlux system:

1. **ROW-DRV-11** — one 11-channel PCA9685-to-pump driver board per physical row; build 11 identical boards.
2. **PWR-I2C-DIST-11** — one central power, I²C, and emergency-stop distribution board.

The design is based on these verified load assumptions:

| Item | Value |
|---|---:|
| Pump | Mercury Motor WP310B-120 |
| Pump count | 121 (11 × 11) |
| Rated voltage | 12 V |
| Manufacturer maximum current | 0.30 A per pump |
| Measured system maximum | approximately 13 A |
| Theoretical 121-pump maximum | 36.3 A |
| Existing controller | Arduino Mega |
| PWM resolution | PCA9685, 12 bit |
| Existing PSU | LETOUR 12 V / 30 A / 360 W (Amazon ASIN B07KJC5M6N) |
| Maximum distributor-to-row distance | less than 300 mm |
| Optimized row-board outline | 100 × 50 mm |

## Architecture

```text
Arduino Mega
    │ SDA / SCL / GND / ARM
    ▼
PWR-I2C-DIST-11
    ├── I2C branch A ── ROW 0 ─ ROW 1 ─ ROW 2 ─ ROW 3
    ├── I2C branch B ── ROW 4 ─ ROW 5 ─ ROW 6 ─ ROW 7
    └── I2C branch C ── ROW 8 ─ ROW 9 ─ ROW 10

12 V PSU (25–40 A, selected after peak-current measurement)
    │
    ├── accessible DC-rated master disconnect/breaker
    │
    └── external 3-way power block
          ├── Bank A input ── four fused row outputs
          ├── Bank B input ── four fused row outputs
          └── Bank C input ── three fused row outputs
```

The three power inputs prevent the total possible 36.3 A from travelling through one PCB terminal or one PCB trace. The same 12 V supply may feed all three inputs, but it must be split by an external, appropriately rated distribution block after the master disconnect.

## Documents

- [日本語の設計概要](設計概要.md)
- [ROW-DRV-11 electrical design](electrical/row-driver.md)
- [ROW-DRV-11 schematic capture specification](electrical/row-driver-schematic.md)
- [PWR-I2C-DIST-11 electrical design](electrical/distribution.md)
- [PWR-I2C-DIST-11 schematic capture specification](electrical/distribution-schematic.md)
- [System connections](electrical/interfaces.md)
- [Power and thermal calculations](electrical/calculations.md)
- [Driver-board BOM](bom/row-driver-bom.csv)
- [Akizuki parts cost estimate](bom/akizuki-cost-estimate.md)
- [Distribution-board BOM](bom/distribution-bom.csv)
- [121-pump harness BOM](bom/pump-harness-bom.csv)
- [Address and coordinate map](tables/address-map.csv)
- [Bring-up and design-review checklist](verification/checklist.md)
- [EasyEDA/AI implementation prompt](easyeda-agent-prompt.md)
- [PCA9685 safe firmware bring-up](firmware/pca9685-bringup.md)
- [ROW-DRV-11 1:1 planning template](mechanical/row-driver-1to1.svg)
- [EmerFlux 11-channel routed PCB (KiCad/EasyEDA import)](manufacturing/EmerFlux-11ch-driver.kicad_pcb)
- [EmerFlux 11-channel PCB 1:1 preview](manufacturing/EmerFlux-11ch-driver-1to1.svg)
- [PWR-I2C-DIST-11 1:1 planning template](mechanical/distribution-1to1.svg)

## Rev.A decisions

- The existing AE-PCA9685 modules remain in use; the row PCB is the driver/interface board between one module and eleven pumps.
- Two TBD62783APG source-driver arrays per row are split 6 + 5 channels for thermal balance.
- Pump connector pin 1 is the PWM-switched positive output; pin 2 is common ground.
- A dedicated emergency-stop button/contactor is optional in Rev.A. At minimum, use an accessible DC-rated master disconnect or breaker upstream of the three power banks; `OE` does not disconnect a 30 A source.
- I²C is divided into three branches by a TCA9548A to reduce bus capacitance and isolate cable faults.
- The TCA9548A address is `0x77`, avoiding the PCA9685 power-up All-Call address `0x70`; row addresses are `0x40` through `0x4A`.
- Row power uses a 5.08 mm two-pin terminal block; pump and PCA signal connections use JST XH.
- Initial I²C speed is 100 kHz. Increase only after measuring SDA/SCL rise times and testing with all pumps switching.
- Initial PWM test points are 100, 200, 400, and 800 Hz. The pump manufacturer does not specify PWM operation, so the final frequency and minimum duty cycle require testing.

## Items that must be confirmed before fabrication

1. Measure one existing VKLSVAN B08BCBLDR8 jumper and prove its JST XH crimp with a pull test; its listing does not specify AWG or insulation OD. Use specified UL1007 AWG24 stranded copper for the final 121 harnesses unless the existing wire passes inspection and test.
2. Maximum cable length from a row board to each pump (the present 20 cm lead is accepted if it reaches the installed position without tension).
3. Actual startup peak current of one pump and eleven pumps.
4. Whether the distribution board will use 2 oz copper plus reinforced bus rails, or an external fused distribution block for all pump power.
5. TBD62783APG package temperature with six and five pumps at the worst intended duty.

Do not order eleven populated boards before one complete row board passes the verification checklist.
