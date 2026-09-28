/**
 * LovePlus MEDAL Happy Daily Life (KPM)
 * Profile Data Model
 */

export enum KanojoType {
  MANAKA = 0, // 高嶺 愛花 (Takane Manaka)
  RINKO = 1,  // 小早川 凛子 (Kobayakawa Rinko)
  NENE = 2,   // 姉ヶ崎 寧々 (Anegasaki Nene)
}

export interface Profile {
  collection: "profile";

  // Player & Girlfriend Basic Info
  real_name?: string;      // 本名
  nick_name?: string;      // 呼び名 (ニックネーム)
  nick_id?: number;        // 呼び名ID
  birth_month?: number;    // 誕生月 (1-12)
  birth_day?: number;      // 誕生日 (1-31)
  blood_type?: number;     // 血液型 (1: A, 2: O, 3: B, 4: AB)
  kanojo?: number;         // カノジョ (0: Manaka, 1: Rinko, 2: Nene)
  hair_style?: number;     // 髪型
  hair_color?: number;     // 髪色

  // Game Progress & Counters
  real_date?: number[];    // リアルデート進捗配列 (8 elements)
  reserved?: number[];     // 予約領域1 (5 elements)
  reserved2?: number[];    // 予約領域2 (10 elements)
  total_play?: number;     // 累計プレイ回数
  last_bet?: string;       // 最終ベット日時 ("YYYY-MM-DD HH:MM")
  last_play?: string;      // 最終プレイ日時 ("YYYY-MM-DD HH:MM")

  // Date Memory (思い出アルバム - 32 records of u16 date_result, 5 dress_requests, 32 u32 epoch timestamps)
  date_result?: number[];  // 32 x u16 (sub_10006090)
  dress_request?: number[];// 5 x u16
  date_time?: number[];    // 32 x u32 (epoch seconds)

  // Jackpot Memory (JPアルバム - 32 records of u16 jp_win medals, 32 u32 epoch timestamps)
  jp_win?: number[];       // 32 x u16 (sub_10006300)
  jp_time?: number[];      // 32 x u32 (epoch seconds)

  // Collection Data (アイテム・衣装クローゼット, 128 elements: coldata000..coldata127)
  coldata?: number[];      // 0: 未所持, 1: 所持/解禁
}

export interface PlayerLog {
  collection: "playerlog";
  // Sub_10008D20 / Sub_100090A0 authentic game log structure
  total_game: number;      // u32
  total_bet: number;       // u32
  total_win: number;       // u32
  sub_chara: number[];     // 4 x u16
  sub_chara2: number[];    // 4 x u16
  normal_game: number[];   // 3 x u32
  normal_bet: number[];    // 3 x u32
  normal_win: number[];    // 3 x u32
  normal_panel: number[];  // 3 x u32
  normal_shuffle: number[];// 3 x u32
  normal_slot: number[];   // 3 x u16
  normal_event: number[];  // 3 x u16
  date_start: number;      // u16
  date_1st: number;        // u16
  date_2nd: number;        // u16
  date_3rd: number;        // u16
  date_spot: number;       // u16
  date_skin: number;       // u16
  date_kiss: number;       // u16
  jp_start: number;        // u16
  jp_game: number;         // u16
  jp_times: number;        // u16
  jp_win: number;          // u32
  jp_jpwin: number;        // u32
  reserved: number[];      // 10 x u32
  reserved2: number[];     // 10 x u16

  // Legacy WebUI helper aliases (optional)
  normal_play?: number;
  date_play?: number;
  jp_play?: number;
}

export function createDefaultPlayerLog(): PlayerLog {
  return {
    collection: "playerlog",
    total_game: 0,
    total_bet: 0,
    total_win: 0,
    sub_chara: [0, 0, 0, 0],
    sub_chara2: [0, 0, 0, 0],
    normal_game: [0, 0, 0],
    normal_bet: [0, 0, 0],
    normal_win: [0, 0, 0],
    normal_panel: [0, 0, 0],
    normal_shuffle: [0, 0, 0],
    normal_slot: [0, 0, 0],
    normal_event: [0, 0, 0],
    date_start: 0,
    date_1st: 0,
    date_2nd: 0,
    date_3rd: 0,
    date_spot: 0,
    date_skin: 0,
    date_kiss: 0,
    jp_start: 0,
    jp_game: 0,
    jp_times: 0,
    jp_win: 0,
    jp_jpwin: 0,
    reserved: new Array(10).fill(0),
    reserved2: new Array(10).fill(0),
    normal_play: 0,
    date_play: 0,
    jp_play: 0,
  };
}

/**
 * Creates a default initial profile for a new player.
 */
export function createDefaultProfile(): Profile {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    collection: "profile",
    real_name: "彼氏",
    nick_name: "彼氏",
    nick_id: 1,
    birth_month: 9,
    birth_day: 12,
    blood_type: 1,
    kanojo: KanojoType.MANAKA,
    hair_style: 1,
    hair_color: 1,
    real_date: [0, 0, 0, 0, 0, 0, 0, 0],
    reserved: [0, 0, 0, 0, 0],
    reserved2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    total_play: 0,
    last_bet: dateStr,
    last_play: dateStr,
    date_result: new Array(32).fill(0),
    dress_request: new Array(5).fill(0),
    date_time: new Array(32).fill(0),
    jp_win: new Array(32).fill(0),
    jp_time: new Array(32).fill(0),
    coldata: new Array(128).fill(0),
  };
}
