# EmerFlux 11チャンネル行ドライバ基板

現行PCB：manufacturing/EmerFlux-11ch-driver.kicad_pcb。製造資料：manufacturing/jlcpcb/README.md。
100×50mm、2層、FR-4、1.6mm、1oz指定。外付けAE-PCA9685、TBD62783APG×3（4＋4＋3台）。同じ基板11枚で121台。
最終DRC違反0、未配線0。Gerber7層＋ドリル2ファイルを生成・再読込済み。
安全な連続運転・量産は未承認。起動／拘束電流、IC温度、MF-R185×3の評価が必要。最初に1枚だけ実装してください。
旧EasyEDA内蔵PCA9685＋MOSFET案は製造禁止。過去資料はhistoryに保存。before-audit PCBは製造禁止。
