/**
 * LovePlus MEDAL Happy Daily Life (KPM)
 * Profile Data Model
 */

export enum KanojoType {
  NONE = 0,
  MANAKA = 1, // 高嶺 愛花 (Takane Manaka)
  RINKO = 2,  // 小早川 凛子 (Kobayakawa Rinko)
  NENE = 3,   // 姉ヶ崎 寧々 (Anegasaki Nene)
}

export interface Profile {
  collection: "profile";

  // Player & Girlfriend Basic Info
  real_name?: string;      // 本名
  nick_name?: string;      // 呼び名 (ニックネーム)
  nick_id?: number;        // 呼び名ID
  birth_month?: number;    // 誕生月 (1-12)
  birth_day?: number;      // 誕生日 (1-31)
  blood_type?: number;     // 血液型 (1: A, 2: B, 3: AB, 4: O)
  kanojo?: number;         // カノジョ (1: Manaka, 2: Rinko, 3: Nene)
  hair_style?: number;     // 髪型
  hair_color?: number;     // 髪色

  // Game Progress & Counters
  real_date?: number[];    // リアルデート進捗配列 (8 elements)
  reserved?: number[];     // 予約領域1 (5 elements)
  reserved2?: number[];    // 予約領域2 (10 elements)
  total_play?: number;     // 累計プレイ回数
  last_bet?: string;       // 最終ベット日時 ("YYYY-MM-DD HH:MM")
  last_play?: string;      // 最終プレイ日時 ("YYYY-MM-DD HH:MM")

  // Date Memory (思い出アルバム)
  date_result?: number;    // デート結果ステータス
  dress_request?: number;  // 衣装リクエストフラグ
  date_time?: string;      // デート記録日時

  // Jackpot Memory (JPアルバム)
  jp_win?: number;         // JP獲得メダル枚数
  jp_time?: string;        // JP達成日時
}

export interface PlayerLog {
  collection: "playerlog";
  total_game: number;
  total_bet: number;
  total_win: number;
  normal_play: number;
  normal_bet: number;
  normal_win: number;
  normal_reach: number;
  date_play: number;
  date_bet: number;
  date_win: number;
  date_reach: number;
  jp_play: number;
  jp_bet: number;
  jp_win: number;
}

export function createDefaultPlayerLog(): PlayerLog {
  return {
    collection: "playerlog",
    total_game: 0,
    total_bet: 0,
    total_win: 0,
    normal_play: 0,
    normal_bet: 0,
    normal_win: 0,
    normal_reach: 0,
    date_play: 0,
    date_bet: 0,
    date_win: 0,
    date_reach: 0,
    jp_play: 0,
    jp_bet: 0,
    jp_win: 0,
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
    date_result: 0,
    dress_request: 0,
    date_time: dateStr,
    jp_win: 0,
    jp_time: dateStr,
  };
}
