# PCA9685 safe bring-up requirements

1. Keep the hardware `ARM` request LOW so `PWM_OE_N` remains HIGH.
2. Select one TCA9548A branch at address `0x77` and verify only the intended bit is enabled.
3. Probe for the expected row addresses from `0x40` to `0x4A`. An unexpected address or duplicate physical row is a fault.
4. Disable the PCA9685 All-Call response (`MODE1.ALLCALL = 0`) on every discovered row before enabling pumps.
5. Configure non-inverted totem-pole output (`MODE2.OUTDRV = 1`, `MODE2.INVRT = 0`).
6. Write FULL-OFF to all sixteen channels before setting PWM frequency or asserting ARM.
7. Start at 200 Hz, one pump, 10% duty. Test 100, 200, 400, and 800 Hz while measuring current, acoustic behaviour, reliable starting duty, 12 V/output overshoot, and both TBD62783APG package temperatures.
8. Enforce a configurable system current budget. The initial software limit must prevent the untested 121-channel/100% case.
9. On I²C error, watchdog reset, over-current estimate, or address mismatch: deassert ARM first, then attempt recovery.

Do not use the PCA9685 output value alone as a safety state. `PWM_OE_N` is the immediate global inhibit, while the accessible DC-rated master disconnect is the manual power isolation.
