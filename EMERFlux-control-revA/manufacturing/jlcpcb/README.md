# EmerFlux 製造データ

Gerber ZIP生成済み。DRC違反0・未配線0。**安全性の未確認事項があるため、発注判断は保留**です。設計レビューを先に読んでください。

- EmerFlux-11ch-driver-RevD-1oz-JLCPCB-Gerber.zip：Gerber7ファイル＋PTH/NPTHドリル2ファイル、直下に9ファイルのみ。
- JLCPCB注文手順.md：注文操作と設定
- 製造前チェックリスト.md：購入・実装前の確認
- 設計レビュー.md：修正・検証・残存リスク
- BOM-手はんだ用.csv：1枚／11枚分
- 部品実装ガイド.md：実装と初回試験
- 部品配置-表面シルク.png：番号と極性
- evidence/：各Gerber層画像、DRC結果、穴数報告
- Gerber-ZIP内容.txt：ZIP内容とハッシュ

最初に行うこと：設計レビューのMF-R185×3、IC発熱、未測定電流、試作運転の制限を確認し、電流制限付き電源での試験計画を決める。量産・全11枚の実装は不可。
元データは元フォルダと ../EmerFlux-11ch-driver.before-audit.kicad_pcb に保持。旧EasyEDA ZIPは製造に使わないでください。
