> 2026-11-04更新：製造対象は修正後のmanufacturing/EmerFlux-11ch-driver.kicad_pcb。最新の判定・変更点はmanufacturing/jlcpcb/設計レビュー.mdを優先。以下の旧検証・寸法・電流上限の記述は履歴を含みます。

# Power and thermal calculations

## Pump currents

Manufacturer maximum per pump:

```text
I_pump,max = 0.30 A
```

Per row:

```text
I_row,max = 11 × 0.30 = 3.30 A
P_row,max = 12 × 3.30 = 39.6 W
```

Complete array:

```text
I_array,theoretical = 121 × 0.30 = 36.3 A
P_array,theoretical = 12 × 36.3 = 435.6 W
```

Measured system maximum:

```text
I_array,measured ≈ 13 A
P_array,measured ≈ 156 W
mean current per pump ≈ 107 mA
mean current per row ≈ 1.18 A
```

Do not size connectors and protective devices only from the mean values. Startup current and blocked-pump current are not specified in the available pump datasheet.

## Three power banks

```text
Bank A: 4 rows × 3.3 A = 13.2 A theoretical
Bank B: 4 rows × 3.3 A = 13.2 A theoretical
Bank C: 3 rows × 3.3 A =  9.9 A theoretical
```

Baseline design target:

- Bank A/B connectors and copper: ≥15 A continuous.
- Bank C connector and copper: ≥12 A continuous; using the same ≥15 A parts is preferable.
- Row outputs: ≥4 A continuous.

## TBD62783APG thermal estimate

Using its typical 1.6 Ω output resistance:

```text
P_channel at 0.30 A = 0.30² × 1.6 ≈ 0.144 W
P_U1 for 6 channels ≈ 0.86 W
P_U2 for 5 channels ≈ 0.72 W
```

These are typical-resistance estimates, not guaranteed worst cases. The datasheet also limits simultaneous-channel current as duty cycle and ambient temperature rise. The 6 + 5 split reduces heating, but a fully loaded 30-minute temperature test remains mandatory.

## Power-supply selection

A 12 V / 25–30 A supply covers the measured 13 A with operating margin, but it cannot provide the theoretical 36.3 A continuously. If firmware permits all channels at 100%, either:

- select a 12 V supply near 40 A with correctly rated contactor and wiring; or
- enforce a tested total-current/duty limit and stagger starts.

The final choice follows oscilloscope/current-probe measurement of:

1. One pump at 100% startup.
2. Eleven pumps started simultaneously.
3. Eleven pumps with staggered start.
4. The intended worst-case visual pattern across all 121 pumps.

The current LETOUR supply is listed as 12 V / 30 A / 360 W. Treat 30 A as an upper system limit, not an available per-pattern target. Derive a conservative firmware limit from measured peak and sustained current, leaving margin for supply temperature and transient response.

## PWM interpretation

PWM does not deliver a reduced constant DC voltage. It switches approximately 12 V on and off. The pump datasheet specifies 11.2–12.8 V continuous operation but does not specify PWM frequency, minimum duty, or lifetime under PWM. Establish a safe operating map experimentally.
