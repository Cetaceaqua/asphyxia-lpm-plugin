# LovePlus MEDAL Happy Daily Life (KPM) — Asphyxia CORE Plugin

**Plugin Name**: `lpm@asphyxia`  
**Game Identifier**: `KPM:J:A:A:2012030600`  
**Target Platform**: Konami PC-based Medal Arcade Cabinet (*LovePlus MEDAL Happy Daily Life* / ラブプラス MEDAL Happy Daily Life)  
**Supported Asphyxia CORE**: v1.60b+  
**Maintainer**: Cetaceaqua ([cetaceaqua.com](https://cetaceaqua.com))

---

## 1. Overview & Architecture

*LovePlus MEDAL Happy Daily Life* (KPM) utilizes a hybrid arcade network architecture combining standard Konami e-AMUSEMENT services with **Team Fortune (TF)** medal arcade infrastructure:

1. **e-AMUSEMENT Core Services**: Machine keepalive (`status.set`), shop facility identification (`shopinfo.register`), cabinet settings (`config.get`), and bookkeeping (`income.save`/`update`).
2. **KPM Game Services (`kpm_*`)**: Player girlfriend progress, date album memories, jackpot records, machine & nationwide rankings, and cross-game linkage with *LovePlus ARCADE Colorful Clip* (`LPAC`).
3. **Team Fortune Services (`tf_*`)**: Station management, central jackpot event synchronization, and player play session accounting logs (`tf_logdata.play`).
4. **Medal Cross-Game Events**: Shared lottery promotions across Konami medal games (`kpu_event`, `ix8_event`, `k70_event`).

All communication uses standard Konami e-AMUSEMENT XML-RPC over HTTP with Shift-JIS / UTF-8 payload encoding.

---

## 2. API & Endpoint Specifications

### 2.1 System & Machine Boot Endpoints

| Method | Description | Request Key Elements | Response Elements |
|---|---|---|---|
| `status.set` | Machine boot & periodic keepalive ping | `<status>` | `<status __type="s32">0</status>` |
| `shopinfo.register` | Shop facility & location registration | `<shop>` | `<shop><status __type="s32">0</status></shop>` |
| `config.get` | Global network and cabinet service flags | `<config>` | `<config><status __type="s32">0</status></config>` |
| `tf_setting.config` | Team Fortune medal system operating params | `<tf_setting>` | `<tf_setting><status __type="s32">0</status></tf_setting>` |
| `gamelog.write` | Hardware/system error & diagnostic logs | `<gamelog>` | `<status __type="s32">0</status>` |
| `income.save` | Daily machine revenue counter snapshot | `<income>` | `<status __type="s32">0</status>` |
| `income.update` | Periodic bookkeeping counter delta updates | `<income>` | `<status __type="s32">0</status>` |

---

### 2.2 Player Profile & Save Data (`kpm_player.*`)

KPM stores comprehensive relationship data, girlfriend customization, and medal progress:

#### `kpm_player.pload` (Player Load)
Loads the player's core profile and girlfriend appearance.
- **Request**: `<data><refid __type="str">...</refid><userid __type="str">...</userid></data>`
- **Response Structure**:
  ```xml
  <data>
    <real_name __type="str">彼氏</real_name>
    <nick_name __type="str">彼氏</nick_name>
    <nick_id __type="u32">1</nick_id>
    <birth_month __type="u16">9</birth_month>
    <birth_day __type="u16">12</birth_day>
    <blood_type __type="u16">1</blood_type>
    <kanojo __type="u16">1</kanojo> <!-- 1: Manaka, 2: Rinko, 3: Nene -->
    <hair_style __type="u16">1</hair_style>
    <hair_color __type="u16">1</hair_color>
    <real_date __type="u16" __count="8">0 0 0 0 0 0 0 0</real_date>
    <reserved __type="u16" __count="5">0 0 0 0 0</reserved>
    <total_play __type="u32">0</total_play>
    <last_bet __type="str">2026-09-12 12:00</last_bet>
    <last_play __type="str">2026-09-12 12:00</last_play>
    <reserved2 __type="u32" __count="10">0 0 0 0 0 0 0 0 0 0</reserved2>
  </data>
  ```

#### `kpm_player.psave` (Player Save)
Persists updated player girlfriend profile, hair style, hair color, and relationship stats.
- **Request**: Receives all `<data>` fields listed above.
- **Response**: Standard success acknowledgement.

#### Date Memories & Jackpot Records
- **`kpm_player.dload` / `dsave`**: Date Memory Album records (date event results, unlocked outfits, date timestamps).
- **`kpm_player.jload` / `jsave`**: Jackpot Memory records (jackpot payout amounts and achievement timestamps).
- **`kpm_player.ptime`**: Total cumulative play session timer.
- **`kpm_player.lastp`**: Timestamp of last active slot play.
- **`kpm_player.lastb`**: Timestamp and amount of last medal bet.

---

### 2.3 Ranking Services (`kpm_rank.*` & `kpm_totalrank.*`)

Evaluated by `CKpmRankingMyRank` and `CKpmTotalRankingMyRank` in `KPM_EAM_MOD.DLL`.

#### `kpm_rank.my_get` & `kpm_totalrank.my_get` (Personal Ranking Query)
- **Client Request**:
  - `userid` (string): e-AMUSEMENT User ID.
  - `month` (s32, for `kpm_rank.my_get`): Ranking calendar month.
  - `shoponly` (s32): 1 for local shop ranking only, 0 for nationwide.
  - `shopcode` (string): Arcade facility ID.
- **Client Response Parser (`sub_10008260`) Expectation**:
  ```xml
  <username __type="str">彼氏</username>
  <shopname __type="str">AMUSEMENT PLAZA</shopname>
  <prefecture __type="s16">13</prefecture> <!-- Tokyo = 13 -->
  <rank __type="s32">1</rank>
  <score __type="s32">1000</score>
  <date __type="str">2026-09-13 14:00:00</date>
  ```
  *(Note: The client parses `<date>` using format string `"%d-%d-%d %d:%d%s"`. It is required to provide a valid ISO-like date string).*

#### `kpm_rank.get` & `kpm_totalrank.get` (Ranking Board Query)
Returns full machine or nationwide leaderboards.
- **Response**:
  ```xml
  <records>
    <!-- Individual ranking records if available -->
  </records>
  ```

#### `kpm_rank.put` (Score Submission)
Submits a new high-score or jackpot record from the current session.
- **Response**: Standard success acknowledgement (`<status __type="s32">0</status>`).

---

### 2.4 Team Fortune Play Session Logging (`tf_logdata.*`)

Evaluated by `CTFLogUserPlaySave` in `tf_eam_mod.dll`. Triggered on card logout or session completion.

#### `tf_logdata.play`
- **Client Request Payload**:
  - `userid` (string): Player e-AMUSEMENT ID.
  - `stno` (s16): Dual-station index (0 or 1).
  - `millionet` (s16): Connected Millionet terminal ID.
  - `logindate` (string): Session start time (`YYYY-MM-DD HH:MM:00.0`).
  - `logoutdate` (string): Session end time (`YYYY-MM-DD HH:MM:00.0`).
  - `medalin` (s32): Total medals inserted during this session.
  - `medalout` (s32): Total medals paid out during this session.
  - `reserved` (binary): Reserved verification chunk.
  - `shopcode` (string): Arcade shop code.
- **Server Action**: Records the play session entry into the Asphyxia MongoDB database (`playlog` collection).
- **Response**: Standard success acknowledgement (`<status __type="s32">0</status>`).

---

### 2.5 LovePlus ARCADE Linkage (`klp_link.*`, `kpm_link.*` & `kpm_player.data_load`)

Allows players who previously played *LovePlus ARCADE Colorful Clip* (`LPAC`) to carry over their girlfriend intimacy, nicknames, hairstyle, and wardrobe:

- **Official Endpoints**: `klp_link.data_load` (RPC method registered in `KPM_EAM_MOD.DLL`), `kpm_link.shop_check`, `kpm_link.LPAC00`
- **Mechanism**:
  1. Automatic inheritance on first login: When a new card is registered (`!profile`), the server directly parses `savedata/lpac@asphyxia.db` via native `fs` and initializes the LPM profile with the player's LPAC girlfriend (Manaka/Rinko/Nene), real name, birthday, blood type, and hairstyle.
  2. If the client queries `klp_link.data_load` / `kpm_link.LPAC00`, returns converted `<player><record>` structures with Base64-encoded strings and bindata.

---

### 2.6 Medal Cross-Game Event Lottery

Shared promotional events across Konami medal machines:
- **`kpu_event.*`**: *GI-Gran Desire* cross-event.
- **`ix8_event.*`**: *Infinity Rings* cross-event.
- **`k70_event.*`**: *Twinkle Drop* / *SEVEN's BEAT* cross-event.
- **Methods**:
  - `*.status`: Returns lottery availability (`<enable __type="u16">0</enable>`).
  - `*.regist`: Registers player participation (`<status __type="s32">0</status>`).
  - `*.end`: Finalizes lottery results (`<status __type="s32">0</status>`).

---

## 3. Configuration Options

Configured in `config.json` or through the Asphyxia WebUI:

| Option | Type | Default | Description |
|---|---|---|---|
| `enable_lpac_link` | `boolean` | `true` | Enable cross-game profile linkage with *LovePlus ARCADE Colorful Clip*. |
| `default_kanojo` | `integer` | `1` | Default girlfriend for newly created player profiles (`1`: Manaka, `2`: Rinko, `3`: Nene). |

---

## 4. Integration with `kpmhook` & `bemanitools`

When used in combination with `bemanitools` (`kpmhook.dll` & `eamhook.dll`):

1. **e-AMUSEMENT Service URL**:
   In `contents/prop/KPMConfig.xml` (or `contents/eamuse/eam_if.conf`), configure:
   ```xml
   <SERVICES>http://127.0.0.1:80/services/</SERVICES>
   ```
2. **Card Reader Emulation**:
   `kpmhook` emulates the COM1 RFID card reader. When an e-AMUSEMENT card is tapped in `kpmio`:
   - `eam_if.exe` communicates with `lpm@asphyxia` to authenticate the card ID.
   - `kpm_player.pload` retrieves the player profile.
   - `kpm_rank.my_get` displays player ranking cards on the dual touchscreens.
   - On eject, `tf_logdata.play` commits session earnings to the server.
3. **NVRAM Persistence**:
   Test Mode settings (Coin/Medal conversion rates, AGING MODE) are persisted locally in `contents/NVRAM/sram.bin` via `kpmhook`'s battery SRAM emulation.

---

## 5. Database Collections

- `profile`: Core player and girlfriend profile data.
- `playlog`: Historical play sessions logged by `tf_logdata.play`.
- `ranking`: Machine medal records and high scores.

