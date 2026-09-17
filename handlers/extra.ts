import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Profile, PlayerLog, createDefaultPlayerLog } from "../models/profile";

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
 */
export const rank_get: EPR = async (info, data, send) => {
  console.log(`[LPM:rank.get] Ranking requested for module=${info.module}, method=${info.method}`);
  return send.object({
    records: {},
  });
};

/**
 * kpm_rank.my_get & kpm_totalrank.my_get - Machine / National personal ranking
 * Evaluated by CKpmRankingMyRank and CKpmTotalRankingMyRank in KPM_EAM_MOD.DLL.
 * Response parser (sub_10008260) expects:
 * - username: string
 * - shopname: string
 * - prefecture: s16
 * - rank: s32
 * - score: s32
 * - date: string (format "YYYY-MM-DD HH:MM:SS")
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
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  console.log(`[LPM:rank.my_get] refId=${refId}, user=${userName}`);

  return send.object({
    username: K.ITEM("str", userName),
    shopname: K.ITEM("str", "AMUSEMENT PLAZA"),
    prefecture: K.ITEM("s16", 13), // 13 = Tokyo
    rank: K.ITEM("s32", 1),
    score: K.ITEM("s32", profile?.total_play ?? 100),
    date: K.ITEM("str", dateStr),
  });
};

/**
 * kpm_rank.put - Submit ranking score
 */
export const rank_put: EPR = async (info, data, send) => {
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
 * Expected 14 statistical counters parsed by sub_100090A0 in KPM_EAM_MOD.DLL.
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

  console.log(`[LPM:playerlog.pload] refId=${refId}, total_game=${playerlog.total_game}, total_bet=${playerlog.total_bet}`);

  return send.object({
    data: {
      total_game: K.ITEM("s32", playerlog.total_game ?? 0),
      total_bet: K.ITEM("s32", playerlog.total_bet ?? 0),
      total_win: K.ITEM("s32", playerlog.total_win ?? 0),
      normal_play: K.ITEM("s32", playerlog.normal_play ?? 0),
      normal_bet: K.ITEM("s32", playerlog.normal_bet ?? 0),
      normal_win: K.ITEM("s32", playerlog.normal_win ?? 0),
      normal_reach: K.ITEM("s32", playerlog.normal_reach ?? 0),
      date_play: K.ITEM("s32", playerlog.date_play ?? 0),
      date_bet: K.ITEM("s32", playerlog.date_bet ?? 0),
      date_win: K.ITEM("s32", playerlog.date_win ?? 0),
      date_reach: K.ITEM("s32", playerlog.date_reach ?? 0),
      jp_play: K.ITEM("s32", playerlog.jp_play ?? 0),
      jp_bet: K.ITEM("s32", playerlog.jp_bet ?? 0),
      jp_win: K.ITEM("s32", playerlog.jp_win ?? 0),
    },
  });
};

/**
 * kpm_playerlog.psave - Save player activity statistics log
 */
export const playerlog_psave: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  if (refId) {
    let playerlog = await DB.FindOne<PlayerLog>(refId, { collection: "playerlog" });
    if (!playerlog) {
      playerlog = createDefaultPlayerLog();
    }

    const getVal = (key: string, def: number) => {
      const v = $(data).number(key);
      if (v !== undefined && !isNaN(v)) return v;
      const vData = $(data).number(`data.${key}`);
      if (vData !== undefined && !isNaN(vData)) return vData;
      return def;
    };

    playerlog.total_game = getVal("total_game", playerlog.total_game);
    playerlog.total_bet = getVal("total_bet", playerlog.total_bet);
    playerlog.total_win = getVal("total_win", playerlog.total_win);
    playerlog.normal_play = getVal("normal_play", playerlog.normal_play);
    playerlog.normal_bet = getVal("normal_bet", playerlog.normal_bet);
    playerlog.normal_win = getVal("normal_win", playerlog.normal_win);
    playerlog.normal_reach = getVal("normal_reach", playerlog.normal_reach);
    playerlog.date_play = getVal("date_play", playerlog.date_play);
    playerlog.date_bet = getVal("date_bet", playerlog.date_bet);
    playerlog.date_win = getVal("date_win", playerlog.date_win);
    playerlog.date_reach = getVal("date_reach", playerlog.date_reach);
    playerlog.jp_play = getVal("jp_play", playerlog.jp_play);
    playerlog.jp_bet = getVal("jp_bet", playerlog.jp_bet);
    playerlog.jp_win = getVal("jp_win", playerlog.jp_win);

    await DB.Upsert<PlayerLog>(refId, { collection: "playerlog" }, playerlog);
    console.log(`[LPM:playerlog.psave] Saved statistics for refId=${refId}`);
  }
  return send.success();
};

/**
 * Reads LPAC profile across Asphyxia plugin storage boundary using built-in fs module.
 */
function loadLpacProfileCrossPlugin(refId: string): any | null {
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
 * tf_userdata.cload - Load Team Fortune custom player data (coldata)
 */
export const tf_userdata_cload: EPR = async (info, data, send) => {
  const refId = extractRefId(data);
  console.log(`[LPM:tf_userdata.cload] refId=${refId}`);
  return send.object({
    result: K.ITEM("s32", 0),
    coldata: {},
  });
};

/**
 * tf_userdata.csave, isave, iload - Save/Load Team Fortune custom player data
 */
export const tf_userdata_save: EPR = async (info, data, send) => {
  return send.success();
};

/**
 * Generic event status handler for medal cross-events:
 * kpu_event.status, ix8_event.status, k70_event.status
 */
export const event_status: EPR = async (info, data, send) => {
  return send.object({
    enable: K.ITEM("u16", 0),
  });
};


