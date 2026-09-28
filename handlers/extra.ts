import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Profile, PlayerLog, KanojoType, createDefaultPlayerLog, createDefaultProfile } from "../models/profile";

/**
 * Extra Handlers: Ranking, Event Logs, and Cross-Game Linkage with LovePlus ARCADE (LPAC)
 */

/**
 * Helper to extract refid / eaid across various request node structures
 */
function extractRefId(data: any): string {
  return (
    $(data).str("data.eaid", "") ||
    $(data).str("eaid", "") ||
    $(data).str("data.refid", "") ||
    $(data).str("refid", "") ||
    $(data).str("data.userid", "") ||
    $(data).str("userid", "")
  ).trim();
}

/**
 * kpm_rank.get & kpm_totalrank.get - Machine / National medal ranking list
 * Response parser (sub_10007B90) expects:
 * root attribute records@ (record count) and child nodes with:
 * - username: string
 * - shopname: string
 * - userid: string
 * - prefecture: u16
 * - score: u32
 * - date: string ("YYYY-MM-DD HH:MM")
 */
export const rank_get: EPR = async (info, data, send) => {
  console.log(`[LPM:rank.get] Ranking requested for module=${info.module}, method=${info.method}`);
  // Return standard empty records attribute
  return send.xml(`<${info.module} status="0" records="0"/>`);
};

/**
 * kpm_rank.my_get & kpm_totalrank.my_get - Machine / National personal ranking
 * Evaluated by CKpmRankingMyRank and CKpmTotalRankingMyRank in KPM_EAM_MOD.DLL.
 * Response parser (sub_10008260) expects:
 * - username: string (Type 11)
 * - shopname: string (Type 11)
 * - prefecture: u16 (Type 5)
 * - rank: u32 (Type 7)
 * - score: u32 (Type 7)
 * - date: string (format "YYYY-MM-DD HH:MM", Type 11)
 */
export const rank_my_get: EPR = async (info, data, send) => {
  const refId = extractRefId(data);

  let profile: Profile | null = null;
  if (refId) {
    profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
  }

  const userName = profile ? (profile.nick_name || profile.real_name || "彼氏") : "彼氏";
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  console.log(`[LPM:rank.my_get] refId=${refId}, user=${userName}`);

  return send.object({
    username: K.ITEM("str", userName),
    shopname: K.ITEM("str", "AMUSEMENT PLAZA"),
    prefecture: K.ITEM("u16", 13), // 13 = Tokyo (Type 5: u16)
    rank: K.ITEM("u32", 1),         // Type 7: u32
    score: K.ITEM("u32", profile?.total_play ?? 100), // Type 7: u32
    date: K.ITEM("str", dateStr),
  });
};

/**
 * kpm_rank.put - Submit ranking score
 * Request serialized by sub_10008000:
 * sends userid (str), username (str), shopname (str), prefecture (u16), score (u32), shopcode (str).
 */
export const rank_put: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  const score = $(data).number("score", 0);
  const username = $(data).str("username", "");
  console.log(`[LPM:rank.put] refId=${refId}, username=${username}, score=${score}`);
  return send.success();
};

/**
 * tf_logdata.play - Session play & medal income/outcome log
 * Uploaded by CTFLogUserPlaySave in tf_eam_mod.dll on card logout / session finish.
 * Request contains: userid, stno, millionet, logindate, logoutdate, medalin, medalout, reserved, shopcode.
 */
export const tf_logdata_play: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  const medalin = $(data).number("medalin", 0) || $(data).number("data.medalin", 0);
  const medalout = $(data).number("medalout", 0) || $(data).number("data.medalout", 0);
  const logindate = $(data).str("logindate", "") || $(data).str("data.logindate", "");
  const logoutdate = $(data).str("logoutdate", "") || $(data).str("data.logoutdate", "");

  if (refId) {
    await DB.Insert<any>(refId, {
      collection: "playlog",
      medalin,
      medalout,
      logindate,
      logoutdate,
      timestamp: Date.now(),
    });
    console.log(`[LPM:tf_logdata.play] refId=${refId}, in=${medalin}, out=${medalout}`);
  }

  return send.success();
};

/**
 * kpm_playerlog.pload - Load player activity statistics log
 * Reverse engineered from sub_10008D20 in KPM_EAM_MOD.DLL:
 * Expects ROOT-LEVEL nodes (no data wrapper!):
 * - total_game, total_bet, total_win: u32 (Type 7)
 * - sub_chara, sub_chara2: 4 x u16 (Type 5, 8 bytes each)
 * - normal_game, normal_bet, normal_win, normal_panel, normal_shuffle: 3 x u32 (Type 7, 12 bytes each)
 * - normal_slot, normal_event: 3 x u16 (Type 5, 6 bytes each)
 * - date_start, date_1st, date_2nd, date_3rd, date_spot, date_skin, date_kiss: u16 (Type 5, 2 bytes each)
 * - jp_start, jp_game, jp_times: u16 (Type 5, 2 bytes each)
 * - jp_win, jp_jpwin: u32 (Type 7, 4 bytes each)
 * - reserved: 10 x u32 (Type 7, 40 bytes)
 * - reserved2: 10 x u16 (Type 5, 20 bytes)
 */
export const playerlog_pload: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  let playerlog = await DB.FindOne<PlayerLog>(refId, { collection: "playerlog" });

  if (!playerlog) {
    playerlog = createDefaultPlayerLog();
    if (refId) {
      try {
        await DB.Insert<PlayerLog>(refId, playerlog);
      } catch {
        // Ignore collision
      }
    }
  }

  console.log(`[LPM:playerlog.pload] Sending authentic playerlog at root level for refId=${refId}`);

  return send.object({
    total_game: K.ITEM("u32", playerlog.total_game ?? 0),
    total_bet: K.ITEM("u32", playerlog.total_bet ?? 0),
    total_win: K.ITEM("u32", playerlog.total_win ?? 0),
    sub_chara: K.ARRAY("u16", playerlog.sub_chara && playerlog.sub_chara.length === 4 ? playerlog.sub_chara : [0, 0, 0, 0]),
    sub_chara2: K.ARRAY("u16", playerlog.sub_chara2 && playerlog.sub_chara2.length === 4 ? playerlog.sub_chara2 : [0, 0, 0, 0]),
    normal_game: K.ARRAY("u32", playerlog.normal_game && playerlog.normal_game.length === 3 ? playerlog.normal_game : [0, 0, 0]),
    normal_bet: K.ARRAY("u32", playerlog.normal_bet && playerlog.normal_bet.length === 3 ? playerlog.normal_bet : [0, 0, 0]),
    normal_win: K.ARRAY("u32", playerlog.normal_win && playerlog.normal_win.length === 3 ? playerlog.normal_win : [0, 0, 0]),
    normal_panel: K.ARRAY("u32", playerlog.normal_panel && playerlog.normal_panel.length === 3 ? playerlog.normal_panel : [0, 0, 0]),
    normal_shuffle: K.ARRAY("u32", playerlog.normal_shuffle && playerlog.normal_shuffle.length === 3 ? playerlog.normal_shuffle : [0, 0, 0]),
    normal_slot: K.ARRAY("u16", playerlog.normal_slot && playerlog.normal_slot.length === 3 ? playerlog.normal_slot : [0, 0, 0]),
    normal_event: K.ARRAY("u16", playerlog.normal_event && playerlog.normal_event.length === 3 ? playerlog.normal_event : [0, 0, 0]),
    date_start: K.ITEM("u16", playerlog.date_start ?? 0),
    date_1st: K.ITEM("u16", playerlog.date_1st ?? 0),
    date_2nd: K.ITEM("u16", playerlog.date_2nd ?? 0),
    date_3rd: K.ITEM("u16", playerlog.date_3rd ?? 0),
    date_spot: K.ITEM("u16", playerlog.date_spot ?? 0),
    date_skin: K.ITEM("u16", playerlog.date_skin ?? 0),
    date_kiss: K.ITEM("u16", playerlog.date_kiss ?? 0),
    jp_start: K.ITEM("u16", playerlog.jp_start ?? 0),
    jp_game: K.ITEM("u16", playerlog.jp_game ?? 0),
    jp_times: K.ITEM("u16", playerlog.jp_times ?? 0),
    jp_win: K.ITEM("u32", playerlog.jp_win ?? 0),
    jp_jpwin: K.ITEM("u32", playerlog.jp_jpwin ?? 0),
    reserved: K.ARRAY("u32", playerlog.reserved && playerlog.reserved.length === 10 ? playerlog.reserved : new Array(10).fill(0)),
    reserved2: K.ARRAY("u16", playerlog.reserved2 && playerlog.reserved2.length === 10 ? playerlog.reserved2 : new Array(10).fill(0)),
  });
};

/**
 * kpm_playerlog.psave - Save player activity statistics log
 * Reverse engineered from sub_100090A0 in KPM_EAM_MOD.DLL:
 * Client uploads at root level.
 */
export const playerlog_psave: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  if (refId) {
    let playerlog = await DB.FindOne<PlayerLog>(refId, { collection: "playerlog" });
    if (!playerlog) {
      playerlog = createDefaultPlayerLog();
    }

    const numField = (key: string, def: number) => {
      const v = $(data).number(key);
      if (v !== undefined && !isNaN(v)) return v;
      const vData = $(data).number(`data.${key}`);
      if (vData !== undefined && !isNaN(vData)) return vData;
      return def;
    };

    const arrField = (key: string) => $(data).numbers(key) || $(data).numbers(`data.${key}`);

    playerlog.total_game = numField("total_game", playerlog.total_game);
    playerlog.total_bet = numField("total_bet", playerlog.total_bet);
    playerlog.total_win = numField("total_win", playerlog.total_win);

    const sub_chara = arrField("sub_chara");
    if (sub_chara && sub_chara.length > 0) playerlog.sub_chara = sub_chara;

    const sub_chara2 = arrField("sub_chara2");
    if (sub_chara2 && sub_chara2.length > 0) playerlog.sub_chara2 = sub_chara2;

    const normal_game = arrField("normal_game");
    if (normal_game && normal_game.length > 0) playerlog.normal_game = normal_game;

    const normal_bet = arrField("normal_bet");
    if (normal_bet && normal_bet.length > 0) playerlog.normal_bet = normal_bet;

    const normal_win = arrField("normal_win");
    if (normal_win && normal_win.length > 0) playerlog.normal_win = normal_win;

    const normal_panel = arrField("normal_panel");
    if (normal_panel && normal_panel.length > 0) playerlog.normal_panel = normal_panel;

    const normal_shuffle = arrField("normal_shuffle");
    if (normal_shuffle && normal_shuffle.length > 0) playerlog.normal_shuffle = normal_shuffle;

    const normal_slot = arrField("normal_slot");
    if (normal_slot && normal_slot.length > 0) playerlog.normal_slot = normal_slot;

    const normal_event = arrField("normal_event");
    if (normal_event && normal_event.length > 0) playerlog.normal_event = normal_event;

    playerlog.date_start = numField("date_start", playerlog.date_start);
    playerlog.date_1st = numField("date_1st", playerlog.date_1st);
    playerlog.date_2nd = numField("date_2nd", playerlog.date_2nd);
    playerlog.date_3rd = numField("date_3rd", playerlog.date_3rd);
    playerlog.date_spot = numField("date_spot", playerlog.date_spot);
    playerlog.date_skin = numField("date_skin", playerlog.date_skin);
    playerlog.date_kiss = numField("date_kiss", playerlog.date_kiss);

    playerlog.jp_start = numField("jp_start", playerlog.jp_start);
    playerlog.jp_game = numField("jp_game", playerlog.jp_game);
    playerlog.jp_times = numField("jp_times", playerlog.jp_times);
    playerlog.jp_win = numField("jp_win", playerlog.jp_win);
    playerlog.jp_jpwin = numField("jp_jpwin", playerlog.jp_jpwin);

    const reserved = arrField("reserved");
    if (reserved && reserved.length > 0) playerlog.reserved = reserved;

    const reserved2 = arrField("reserved2");
    if (reserved2 && reserved2.length > 0) playerlog.reserved2 = reserved2;

    await DB.Upsert<PlayerLog>(refId, { collection: "playerlog" }, playerlog);
    console.log(`[LPM:playerlog.psave] Saved authentic statistics for refId=${refId}`);
  }
  return send.success();
};

/**
 * Reads LPAC profile across Asphyxia plugin storage boundary using built-in fs module.
 */
export function loadLpacProfileCrossPlugin(refId: string): any | null {
  if (!refId) return null;
  const targetId = refId.toUpperCase();

  const lpacDbPath = join(process.cwd(), "savedata", "lpac@asphyxia.db");
  if (!existsSync(lpacDbPath)) {
    console.log(`[LPM:link_lpac] LPAC database not found at ${lpacDbPath}`);
    return null;
  }

  try {
    const content = readFileSync(lpacDbPath, "utf-8");
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const doc = JSON.parse(line);
        if (doc.__refid && doc.__refid.toUpperCase() === targetId && doc.collection === "profile") {
          return doc;
        }
      } catch {
        // Ignore single line parse error
      }
    }
  } catch (err) {
    console.error(`[LPM:link_lpac] Error reading ${lpacDbPath}:`, err);
  }

  return null;
}

/**
 * Inherits player and girlfriend profile attributes directly from LovePlus ARCADE save data.
 */
export function inheritProfileFromLpac(refId: string): Profile | null {
  const lpacDoc = loadLpacProfileCrossPlugin(refId);
  if (!lpacDoc || !lpacDoc.usergamedata) return null;

  const lpac00 = lpacDoc.usergamedata.LPAC00;
  const lpac01 = lpacDoc.usergamedata.LPAC01;
  const str00 = lpac00?.strdata || [];
  const b01 = lpac01?.bindata || [];

  const real_name = (str00.length > 27 && str00[27]) ? str00[27] : "彼氏";
  const nick_name = real_name;

  // Girlfriend mapping from LPAC00 strdata[6]
  // '0': Manaka (0), '10000': Rinko (1), '20000': Nene (2)
  const gId = str00.length > 6 ? String(str00[6]) : "0";
  let kanojo = KanojoType.MANAKA;
  if (gId === "10000") kanojo = KanojoType.RINKO;
  else if (gId === "20000") kanojo = KanojoType.NENE;

  // Birthday & Blood Type from LPAC00 strdata[5] (hex format e.g. "51c01")
  const bb = str00.length > 5 && str00[5].length >= 5 ? str00[5] : "90c00";
  const birth_month = parseInt(bb[0], 16) || 9;
  const birth_day = parseInt(bb.slice(1, 3), 16) || 12;
  const btHex = bb.slice(3, 5);
  // '00': A (1), '01': O (2), '02': B (3), '03': AB (4)
  const blood_type = btHex === "01" ? 2 : btHex === "02" ? 3 : btHex === "03" ? 4 : 1;

  // Hairstyle & Color from LPAC01 bindata
  let hair_style = 1;
  let hair_color = 1;
  if (b01.length >= 352) {
    const hairType = (b01[350] << 8) | b01[351];
    hair_style = hairType > 0 ? (hairType % 10) + 1 : 1;
    hair_color = b01[349] > 0 ? b01[349] + 1 : 1;
  }

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  console.log(`[LPM:inheritProfileFromLpac] Successfully inherited LPAC profile for refId=${refId}: kanojo=${kanojo}, name=${real_name}, bday=${birth_month}/${birth_day}, blood=${blood_type}, hair=${hair_style}/${hair_color}`);

  return {
    collection: "profile",
    real_name,
    nick_name,
    nick_id: 1,
    birth_month,
    birth_day,
    blood_type,
    kanojo,
    hair_style,
    hair_color,
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

/**
 * kpm_link.LPAC00 & kpm_player.data_load - Cross-game linkage with LovePlus ARCADE
 * Imports girlfriend relationship and character customization from LovePlus ARCADE.
 * Evaluated by CKpmLink in KPM_EAM_MOD.DLL.
 */
export const link_lpac: EPR = async (info, data, send) => {
  const isLinkEnabled = U.GetConfig("enable_lpac_link") !== false;
  const refId = extractRefId(data);

  console.log(`[LPM:link_lpac] Incoming request: refId='${refId}', linkEnabled=${isLinkEnabled}`);

  if (!isLinkEnabled || !refId) {
    console.log(`[LPM:link_lpac] Linkage disabled or no refId, returning <NODATA>`);
    return send.object({
      result: K.ITEM("s32", 0),
      player: {
        record: [{ d: [K.ITEM("str", "<NODATA>")] }],
        record_num: K.ITEM("u32", 1),
      },
    });
  }

  // 1. First attempt to load profile from LPAC's database (savedata/lpac@asphyxia.db)
  let lpacProfile = loadLpacProfileCrossPlugin(refId);

  // 2. Fallback to local profile if available
  if (!lpacProfile) {
    lpacProfile = await DB.FindOne<any>(refId, { collection: "profile" });
  }

  const d: any[] = [];
  let recordCount = 0;

  if (lpacProfile && lpacProfile.usergamedata) {
    const rawRecvCsv = $(data).str("data.recv_csv", "") || $(data).str("recv_csv", "");
    const dataTypes = rawRecvCsv
      ? rawRecvCsv.split(",").filter((_, i) => i % 2 === 0)
      : ["LPAC00", "LPAC01"];

    console.log(`[LPM:link_lpac] Found LPAC profile for ${refId}. Requested types:`, dataTypes);

    for (const dataType of dataTypes) {
      const savedData = lpacProfile.usergamedata[dataType];
      if (!savedData) continue;

      const strData = savedData.strdata.slice(2).join(",");
      d.push({
        ...K.ITEM(
          "str",
          U.EncodeString(strData, "shift_jis").toString("base64")
        ),
        bin1: K.ITEM(
          "str",
          Buffer.from(savedData.bindata).toString("base64")
        ),
      });
      recordCount++;
      console.log(`[LPM:link_lpac] Added ${dataType} payload (str length=${strData.length}, bin length=${savedData.bindata.length})`);
    }
  }

  if (recordCount === 0) {
    console.log(`[LPM:link_lpac] No LPAC data found for ${refId}, returning <NODATA>`);
    return send.object({
      result: K.ITEM("s32", 0),
      player: {
        record: [{ d: [K.ITEM("str", "<NODATA>")] }],
        record_num: K.ITEM("u32", 1),
      },
    });
  }

  console.log(`[LPM:link_lpac] Returning ${recordCount} LPAC records for ${refId}`);
  return send.object({
    result: K.ITEM("s32", 0),
    player: {
      record: [{ d }],
      record_num: K.ITEM("u32", recordCount),
    },
  });
};

/**
 * tf_userdata.assign - Assign or resolve Team Fortune user profile
 */
export const tf_userdata_assign: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  console.log(`[LPM:tf_userdata.assign] refId=${refId}`);
  return send.object({
    refid: K.ITEM("str", refId),
    userid: K.ITEM("str", refId),
    newid: K.ITEM("u16", 0),
    play_times: K.ITEM("u32", 1),
  });
};

/**
 * tf_userdata.cload - Load Team Fortune custom player data (coldata: collection items & costumes)
 * Response parsed by sub_100044E0 in tf_eam_mod.dll:
 * Expects coldata000..coldata127 as u16 (type 5).
 * Elements 0..63 are accessory/items, elements 64..127 are costumes/dresses.
 */
export const tf_userdata_cload: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  let profile = refId ? await DB.FindOne<Profile>(refId, { collection: "profile" }) : null;

  const coldata = profile?.coldata && profile.coldata.length >= 128
    ? profile.coldata
    : new Array(128).fill(0);

  const res: any = {
    result: K.ITEM("s32", 0),
  };

  for (let i = 0; i < 128; i++) {
    const key = `coldata${i.toString().padStart(3, "0")}`;
    res[key] = K.ITEM("u16", coldata[i] ?? 0);
  }

  const unlockedCount = coldata.filter(x => x > 0).length;
  console.log(`[LPM:tf_userdata.cload] refId=${refId}, unlockedItems=${unlockedCount}/128`);

  return send.object(res);
};

/**
 * tf_userdata.csave, isave - Save Team Fortune custom player data (coldata)
 * Request packed by sub_10004690 in tf_eam_mod.dll:
 * Sends coldata000..coldata127 as u16.
 */
export const tf_userdata_save: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  if (refId && (info.method === "csave" || info.method === "save")) {
    let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (!profile) {
      profile = createDefaultProfile();
    }

    const coldata = profile.coldata && profile.coldata.length >= 128
      ? [...profile.coldata]
      : new Array(128).fill(0);

    let updated = false;
    for (let i = 0; i < 128; i++) {
      const key = `coldata${i.toString().padStart(3, "0")}`;
      const val = $(data).number(key);
      if (val !== undefined && !isNaN(val)) {
        coldata[i] = val;
        updated = true;
      }
    }

    if (updated) {
      profile.coldata = coldata;
      await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
      const unlockedCount = coldata.filter(x => x > 0).length;
      console.log(`[LPM:tf_userdata.csave] Saved coldata for refId=${refId}, unlocked=${unlockedCount}/128`);
    }
  }
  return send.success();
};

/**
 * tf_userdata.isave - Save Team Fortune user info
 * Request packed by sub_10003FC0 in tf_eam_mod.dll:
 * Sends userid, username, local, sex, prefecture, birthday ("YYYY-MM-DD"), reserved.
 */
export const tf_userdata_isave: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  if (refId) {
    let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (!profile) {
      profile = createDefaultProfile();
    }

    const username = $(data).str("username", "") || $(data).str("data.username", "");
    if (username) {
      profile.real_name = username;
      profile.nick_name = username;
    }

    const sex = $(data).number("sex");
    if (sex !== undefined && !isNaN(sex)) {
      // sex is preserved
    }

    const prefecture = $(data).number("prefecture");
    if (prefecture !== undefined && !isNaN(prefecture)) {
      // prefecture is preserved
    }

    const birthday = $(data).str("birthday", "") || $(data).str("data.birthday", "");
    if (birthday && birthday.includes("-")) {
      const parts = birthday.split("-").map(Number);
      if (parts.length >= 3) {
        if (!isNaN(parts[1]) && parts[1] >= 1 && parts[1] <= 12) {
          profile.birth_month = parts[1];
        }
        if (!isNaN(parts[2]) && parts[2] >= 1 && parts[2] <= 31) {
          profile.birth_day = parts[2];
        }
      }
    }

    await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
    console.log(`[LPM:tf_userdata.isave] Saved user info for refId=${refId}: name=${profile.real_name}, bday=${profile.birth_month}/${profile.birth_day}`);
  }
  return send.success();
};

/**
 * tf_userdata.iload - Load Team Fortune user info (username, sex, prefecture, birthday)
 * Evaluated by CTFUserInfoLoad (sub_10004250) in tf_eam_mod.dll.
 */
export const tf_userdata_iload: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  let profile: Profile | null = null;
  if (refId) {
    profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
  }
  const userName = profile ? (profile.real_name || profile.nick_name || "彼氏") : "彼氏";
  const birthMonth = String(profile?.birth_month ?? 9).padStart(2, "0");
  const birthDay = String(profile?.birth_day ?? 12).padStart(2, "0");
  const birthday = `1990-${birthMonth}-${birthDay}`;

  console.log(`[LPM:tf_userdata.iload] refId=${refId}, username=${userName}, bday=${birthday}`);

  return send.object({
    username: K.ITEM("str", userName),
    sex: K.ITEM("u16", 1), // 1: male
    prefecture: K.ITEM("u16", 13), // 13: Tokyo
    birthday: K.ITEM("str", birthday),
  });
};

/**
 * tf_progjp.regist - Team Fortune progressive jackpot shop registration
 */
export const tf_progjp_regist: EPR = async (info, data, send) => {
  return send.success();
};

/**
 * tf_progjp.info - Team Fortune progressive jackpot group info
 * Reverse engineered from sub_10004A40 in tf_eam_mod.dll:
 * Expects root-level nodes:
 * - groupid: u16 (Type 5)
 * - shopname1, shopname2, shopname3: string (Type 11)
 * - gameid1, gameid2, gameid3: u16 (Type 5)
 * - jpwin1, jpwin2, jpwin3: u16 (Type 5)
 */
export const tf_progjp_info: EPR = async (info, data, send) => {
  return send.object({
    groupid: K.ITEM("u16", 0),
    shopname1: K.ITEM("str", "AMUSEMENT PLAZA"),
    shopname2: K.ITEM("str", ""),
    shopname3: K.ITEM("str", ""),
    gameid1: K.ITEM("u16", 0),
    gameid2: K.ITEM("u16", 0),
    gameid3: K.ITEM("u16", 0),
    jpwin1: K.ITEM("u16", 0),
    jpwin2: K.ITEM("u16", 0),
    jpwin3: K.ITEM("u16", 0),
  });
};

/**
 * tf_progjp.win - Team Fortune progressive jackpot win report
 */
export const tf_progjp_win: EPR = async (info, data, send) => {
  console.log(`[LPM:tf_progjp.win] Progressive Jackpot win reported!`, $(data).attr());
  return send.success();
};

/**
 * tf_progjp.group - Team Fortune progressive jackpot group query
 */
export const tf_progjp_group: EPR = async (info, data, send) => {
  return send.xml(`<tf_progjp status="0" records="0"/>`);
};

/**
 * Generic event status handler for medal cross-game events:
 * - kpu_event.status: GRAND CROSS CHRONICLE (KPU)
 * - ix8_event.status: FORTUNE TRINITY (IX8)
 * - k70_event.status: Anima Lotta (K70)
 */
export const event_status: EPR = async (info, data, send) => {
  const isKpu = info.module.startsWith("kpu");
  const isIx8 = info.module.startsWith("ix8");
  const isK70 = info.module.startsWith("k70");

  const enableKpu = U.GetConfig("enable_kpu_event") !== false;
  const enableIx8 = U.GetConfig("enable_ix8_event") !== false;
  const enableK70 = U.GetConfig("enable_k70_event") !== false;

  const enabled = (isKpu && enableKpu) || (isIx8 && enableIx8) || (isK70 && enableK70);
  const termDate = enabled ? "2099-12-31 23:59" : "2000-01-01 00:00";
  console.log(`[LPM:${info.module}.status] module=${info.module}, enabled=${enabled}, termDate=${termDate}`);

  if (isIx8) {
    // FORTUNE TRINITY (IX8) status response parsed by sub_100070F0 in KPM_EAM_MOD.DLL
    return send.object({
      enable: K.ITEM("u16", enabled ? 1 : 0),
      playing: K.ITEM("u16", 0),
      jpresult: K.ARRAY("u16", [0, 0, 0]),
      jpwin: K.ARRAY("u16", [0, 0, 0]),
      sky_roulette: K.ITEM("u16", 0),
      legend_mode: K.ITEM("u16", 0),
      hair_style: K.ITEM("u16", 0),
      reserved: K.ARRAY("u16", [0, 0, 0, 0, 0, 0, 0, 0]),
      term_date: K.ITEM("str", termDate),
    });
  }

  // GRAND CROSS CHRONICLE (KPU) and Anima Lotta (K70) status response parsed by sub_10007670
  return send.object({
    enable: K.ITEM("u16", enabled ? 1 : 0),
    playing: K.ITEM("u16", 0),
    jpresult: K.ITEM("u16", 0),
    jpwin: K.ITEM("u16", 0),
    hair_style: K.ITEM("u16", 0),
    reserved0: K.ITEM("u16", 0),
    reserved1: K.ITEM("u16", 0),
    reserved2: K.ITEM("u16", 0),
    reserved3: K.ITEM("u16", 0),
    reserved4: K.ITEM("u16", 0),
    reserved5: K.ITEM("u16", 0),
    reserved6: K.ITEM("u16", 0),
    reserved7: K.ITEM("u16", 0),
    term_date: K.ITEM("str", termDate),
  });
};


