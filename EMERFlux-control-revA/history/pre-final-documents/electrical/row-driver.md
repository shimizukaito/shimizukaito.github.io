> 2026-11-04更新：製造対象は修正後のmanufacturing/EmerFlux-11ch-driver.kicad_pcb。最新の判定・変更点はmanufacturing/jlcpcb/設計レビュー.mdを優先。以下の旧検証・寸法・電流上限の記述は履歴を含みます。

# EmerFlux 11-channel pump-driver board Rev.A

## Scope

This board connects eleven outputs of the existing Akizuki AE-PCA9685 module to eleven WP310B-120 pumps. It does not duplicate the PCA9685 controller. Eleven identical boards are used for the 11 × 11 pump grid.

## Correct drive topology

The installed driver is Toshiba **TBD62783APG**, an eight-channel source-type DMOS array in DIP-18. It is not a discrete transistor or a low-side MOSFET. Two devices are used and the load is split 6 + 5 channels to reduce package heating.

```text
AE-PCA9685 PWMn -> TBD62783APG In
12 V protected -> TBD62783APG VCC
TBD62783APG Out -> XH pin 1 -> pump +
GND ---------------------------> XH pin 2 -> pump -
```

PWM changes pump average power; it does not create a regulated analog voltage. U1 drives pumps 0–5 and U2 drives pumps 6–10. Every unused input is tied to GND and unused outputs are left open.

## Connectors

- J1–J11: genuine JST `B2B-XH-A(LF)(SN)`, 2.50 mm pitch. Pin 1 is driven `+`, pin 2 is `GND`.
- J12: twelve pins cut from Akizuki `PH-1x40SG`. Pin 1 `GND`, pins 2–12 `PWM0`…`PWM10`; this reuses the existing Dupont leads from the PCA module.
- J13: Akizuki `WJ142V-5.08-02P-14G-00A` 15 A push-in terminal. Pin 1 `+12 V`, pin 2 `GND`.
- Pump cable: `XHP-2` housing and `SXH-001T-P0.6` contacts. Replace the existing Dupont ends; do not push Dupont contacts onto XH headers.

## Protection and decoupling

- F1: Akizuki `MF-R300`, 3 A hold / 6 A trip / 30 V resettable fuse.
- C1: Akizuki `25PX470MEFC8X11.5`, 470 µF/25 V, diameter 8 mm, 3.5 mm lead pitch.
- C2/C3: Akizuki 0.1 µF/50 V radial ceramic, 2.54 mm pitch, one beside each driver.
- The TBD62783APG contains output clamp diodes, but the board still requires a stable 12 V supply and fuse.

## PCB

- 100 × 50 mm, two layers, 1.6 mm FR-4; 1 oz copper is acceptable for the measured row current when the 2 mm trunk and ground pours are retained; 2 oz remains preferable.
- 11 pump connectors along one edge at 8.2 mm centre pitch.
- 0.8 mm minimum individual output tracks, 2 mm protected 12 V trunk, ground pours on both layers.
- Four 3.2 mm non-plated mounting holes at 5 mm corner offsets.
- Keep the 12 V/GND trunk away from PCA input traces; PWM traces route on the back layer.

## Electrical limits and mandatory bench test

The pump is specified at 12 V and up to 300 mA no-load. The TBD62783APG absolute maximum is 500 mA per channel, but the usable simultaneous-channel current falls with duty cycle and temperature. Therefore the first board must be tested with a current-limited supply before ordering eleven boards:

1. Start with one pump and verify polarity and PWM direction.
2. Measure each pump's start, steady, and blocked current.
3. Run 6 + 5 pumps at the maximum intended PWM for 30 minutes.
4. Confirm both driver package temperatures remain below the design limit; reduce duty or change driver architecture if they do not.
5. Verify the 12 V rail remains within the pump's 11.2–12.8 V range.

The 13 A system observation is useful but does not replace per-pump startup and blocked-current measurements.
