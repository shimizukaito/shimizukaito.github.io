> 2026-11-04更新：製造対象は修正後のmanufacturing/EmerFlux-11ch-driver.kicad_pcb。最新の判定・変更点はmanufacturing/jlcpcb/設計レビュー.mdを優先。以下の旧検証・寸法・電流上限の記述は履歴を含みます。

# Rev.A verification checklist

## Before schematic release

- [ ] Cut and measure one existing VKLSVAN B08BCBLDR8 lead; confirm it is AWG30–22 equivalent and insulation diameter is 0.9–1.9 mm for `SXH-001T-P0.6`.
- [ ] Inspect stripped copper for discoloration/corrosion, crimp one sample, and perform a firm manual pull test before making the remaining harnesses.
- [ ] For production wire, verify the selected UL1007 AWG24 supplier datasheet gives insulation OD no greater than 1.9 mm.
- [ ] Confirm all eleven JST XH connectors fit at 8.2 mm centre pitch on the 100 × 50 mm 1:1 print and can be unplugged by gripping each housing.
- [ ] Confirm six cable-tie strain-relief slots do not weaken the board edge or interfere with copper.
- [ ] Confirm all power connector continuous-current ratings at expected enclosure temperature.
- [ ] Confirm PCA9685 output polarity: HIGH must turn the corresponding source-driver channel ON.
- [ ] Confirm TCA9548A is strapped to 0x77 and no device other than PCA9685 All-Call responds at 0x70 during initial power-up.
- [ ] Confirm firmware disables MODE1.ALLCALL on every row before ARM can be asserted.
- [ ] Confirm both TBD62783APG footprints use pins 1–8 input, 9 VCC, 10 GND, and 11–18 output in reverse channel order.
- [ ] Confirm U1/U2 split is 6 + 5 and all unused driver inputs are grounded.
- [ ] Confirm no Arduino 5 V connection can back-feed the distributor 5 V rail.
- [ ] Confirm TCA9548A address does not collide with other installed I²C devices.
- [ ] Confirm all eleven row-board address combinations.
- [ ] Confirm the accessible manual DC disconnect removes all pump-bank power.
- [ ] Confirm broken ARM/OE cables produce the OFF state.

## ERC/DRC

EasyEDA Pro RevH: 2026-09-01にGNDベタ再構築後 `All (0)` を確認。以下の未チェック項目は、実機・熱・製造条件の確認が必要なため残す。

- [x] No unconnected used driver inputs, VCC, or GND pins (EasyEDA DRC `All (0)`).
- [ ] Power flags correctly describe externally powered nets.
- [ ] Separate power and logic ground regions join at the intended net tie only.
- [ ] Power pours have no thermal-relief bottlenecks at high-current connectors.
- [ ] Bank trunks meet fabricator-reviewed 15 A current requirement.
- [ ] Row trunks meet fabricator-reviewed 4 A current requirement.
- [ ] Each row board has its MF-R300 PTC fitted; verify it does not nuisance-trip during the 11-pump worst-case run.
- [ ] Confirm the MF-R300 footprint is 5.1 mm lead pitch and the installed part has adequate clearance from the 12 V terminal.
- [x] EasyEDA default copper-clearance rules pass with no DRC errors; final fabricator capability review is still required before ordering.
- [ ] Mounting hardware cannot short a power pour.

## Single row-board bring-up

- [ ] Power the PCA module only and confirm every PWM input is LOW before applying 12 V.
- [ ] Test one source-driver channel using a resistive/LED load before a pump.
- [ ] Connect one pump through a current-limited 12 V supply.
- [ ] Verify both TBD62783APG package temperatures at 100, 200, 400, and 800 Hz.
- [ ] Capture output and 12 V rail voltage at turn-off and check against the driver/pump ratings.
- [ ] Measure minimum reliable startup duty for at least three pumps.
- [ ] Run eleven pumps for 30 minutes at the worst intended duty.
- [ ] Test simultaneous start and staggered start.
- [ ] Verify removal of the signal cable immediately turns all pumps off.

## Multi-board test

- [ ] Connect four boards to branch A and scan all addresses.
- [ ] Measure SDA and SCL rise time at the farthest board.
- [ ] Switch all 44 branch-A pumps while monitoring I²C errors.
- [ ] Repeat for branches B and C.
- [ ] Update a full 121-value frame and measure maximum achievable frame rate.
- [ ] Confirm PWM phase staggering reduces supply-current spikes.
- [ ] Disconnect one branch and verify other branches continue operating or fail safely as specified.

## Safety and cutoff test

- [ ] Manual DC disconnect removes all three pump banks.
- [ ] Optional stop/interlock input, or opening its jumper, disables PCA9685 OE.
- [ ] Re-enabling the disconnect does not automatically restart pumps before Arduino re-arms the system.
- [ ] Arduino reset, USB removal, or firmware crash turns pumps off.
- [ ] A row short opens only its row fuse before harness or PCB damage.
- [ ] Bank fuse and main protection coordinate correctly with row fuses.
- [ ] Enclosure prevents contact with live high-current terminals and contains possible fuse debris.
