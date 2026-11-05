> 2026-11-04更新：製造対象は修正後のmanufacturing/EmerFlux-11ch-driver.kicad_pcb。最新の判定・変更点はmanufacturing/jlcpcb/設計レビュー.mdを優先。以下の旧検証・寸法・電流上限の記述は履歴を含みます。

# EasyEDA Pro 作業状況

更新日: 2026-09-01

## クラウドプロジェクト

- 製作品名: `EmerFlux`
- 現行EasyEDAプロジェクト名: `EmerFlux_11ch_Driver_RevH`
- 現行Project ID: `706a5bb6b60c4e5682c5d03b79cb5490`
- 現行PCBページ: `EmerFlux-11ch-driver`
- 旧ドラフトProject ID: `f42c1d1f7e4943228fd9703a1ad5d5f2`（製造禁止）
- 公開範囲: Private

## 重要な設計訂正

秋月の商品番号110957は、個別MOSFETではなく `TBD62783APG`（8chソース型DMOSアレイ）であることを公式データシートで再確認した。したがって、下記のクラウド回路図（PCA9685内蔵＋個別MOSFET案）は履歴用ドラフトであり、**製造禁止**。現行設計は、既存AE-PCA9685モジュールを外付けし、TBD62783APGを2個（6+5ch）使う11ポンプ用ドライバ基板である。

現行の基板ファイル: `manufacturing/EmerFlux-11ch-driver.kicad_pcb`。EasyEDA Proへは KiCad PCB としてインポートする。

## 現行ドライバ基板（ローカルデータ）

- 100 × 50 mm、2層、11チャンネル
- ポンプ出力: JST XH 2P × 11（8.2 mm間隔）
- ドライバ: TBD62783APG × 2（6 + 5チャンネル）
- PWM入力: 1×12ピンヘッダ（GND + PWM0～PWM10、基板中央下）
- 電源入力: WJ142V-5.08-02P-14G-00A（15 A）
- 保護: MF-R300 PTC（3 A hold / 6 A trip / 30 V、5.1 mmリード間隔）
- 平滑: 470 µF / 25 V + 0.1 µF × 2
- 生成後の構造検査: 括弧バランス正常、23フットプリント、25ネット、未定義値なし
- EasyEDA Pro DRC: `All (0)`（2026-09-01、GNDベタ再構築後）
- 3D Preview: 基板外形、4取付穴、主要部品配置を確認済み

MF-R300および電源端子台はメーカー／秋月資料の実寸に合わせて2026-08-17にフットプリントを更新した。

## EasyEDAへの取り込み状況

`manufacturing/EmerFlux-11ch-driver-EasyEDA-import.zip` をEasyEDA Proへ取り込み、現行RevHプロジェクトとして保存済み。インポート後にGND銅箔ベタを再構築し、DRC 0件まで修正した。

主なDRC修正:

- DIP-18を180度回転し、入力列をPWM端子側、出力列をポンプ端子側に配置
- 入出力チャンネル割当を反転し、PWM0～10とポンプ1～11の対応を維持
- 2.50/2.54 mmピッチ部品のパッド径を2.3 mmへ調整
- PWMヘッダを基板中央下へ移動し、左右のドライバへ分岐
- PWM10を右外周へ迂回し、PTC・電源端子とのクリアランスを確保
- C2/C3および12 V保護配線を信号線から分離

注意: EasyEDAの3D Previewでは、自作フットプリントに3Dモデルが関連付けられていないため部品本体の立体形状は表示されない。基板、穴、パッド、シルクの位置確認には使用できる。

## 完了

- プロジェクト、`Board1`、`Schematic1`、`PCB1` を作成
- カスタムデバイス `PCA9685PW_NXP` を作成してクラウド保存
- NXP PCA9685PW (SOT361-1) の公式28ピン配列を登録
- LED0〜LED15を出力、SDAを双方向、VDDをPower、VSSをGroundに設定
- カスタムフットプリント枠 `TSSOP28_NXP_SOT361-1` を作成
- フットプリントに28パッドを生成し、クラウド保存できることを確認
- `Schematic1` の部品配置画面で個人ライブラリの `PCA9685PW_NXP` が検索・選択できることを確認
- `Schematic1` に `U1: PCA9685PW_NXP` を配置
- U1のVDD（28番）を `+5V_LOGIC`、VSS（14番）を `LOGIC_GND` に接続
- `C1: 100nF`（Yageo `CC0603KRX7R9BB104`、LCSC `C14663`、0603）を電源デカップリングとして接続
- `C2: 4.7uF`（Samsung `CL21A475KAQNNNE`、LCSC `C1779`、25V、0805）をバルクコンデンサとして接続
- U1のSDA/SCLを `I2C_SDA` / `I2C_SCL`、EXTCLKを `EXTCLK`、OEを `PWM_OE_N` として接続
- U1のA0〜A5を `ADDR_A0`〜`ADDR_A5` として接続
- 使用するLED0〜LED10を `PWM0`〜`PWM10` として接続（11ポンプ用）
- EasyEDA Proで保存成功を確認

## 旧クラウド案に対する作業（中止）

1. NXP SOT361-1の寸法でフットプリントを再生成する
   - 28 pins
   - lead span: 6.2–6.6 mm
   - body length: 9.6–9.8 mm
   - body width: 4.3–4.5 mm
   - lead length: 0.50–0.75 mm
   - lead width: 0.19–0.30 mm
   - pitch: 0.65 mm
   - max height: 1.1 mm
2. 生成後にピン1位置とパッド番号を照合し、`PCA9685PW_NXP`へ割り当てる
3. `ADDR_A0`〜`ADDR_A5` に各10 kΩプルダウンと6極アドレス設定スイッチを配置する
4. `PWM_OE_N` に100 kΩプルアップ、`EXTCLK` にGND接続用の通常閉ジャンパを配置する
5. J1/J2（I2C数珠つなぎ用XH-6）と、任意実装のSDA/SCL 4.7 kΩプルアップを配置する
6. `Schematic1` にMOSFET、フライバックダイオード、JST XH/VHを配置する
7. ERC後にPCBへ変換し、基板外形150 mm × 65 mmで配置する

## 注意（旧案）

寸法とピン配列はNXP公式データシートのSOT361-1を基準とする。公開ユーザーライブラリのPCA9685部品は、製造元・データシート・フットプリントの照合情報が不足していたため採用しない。

現在保存されている28パッド版は、EasyEDAウィザードの寸法欄が入力を保持しなかったため、SOIC/SOPの初期寸法のままである。これは形状確認用のドラフトであり、製造・PCB変換には使用禁止。公式寸法で再生成して照合が完了するまで `PCA9685PW_NXP` へ確定割り当てしない。

`Schematic1` の部品一覧は現在3個（U1、C1、C2）。U1の電源・制御・アドレス・使用PWM出力にはネット名を付与済み。アドレス設定抵抗／スイッチ、信号コネクタ、出力ドライバは未配置。
