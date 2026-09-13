import { Profile } from "../models/profile";

/**
 * Extra Handlers: Ranking, Event Logs, and Cross-Game Linkage with LovePlus ARCADE (LPAC)
 */

/**
 * kpm_rank.get & kpm_totalrank.get - Machine / National medal ranking list
 */
export const rank_get: EPR = async (info, data, send) => {
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
  const refId =
    $(data).str("userid", "") ||
    $(data).str("refid", "") ||
    $(data).str("data.userid", "") ||
    $(data).str("data.refid", "");

  let profile: Profile | null = null;
  if (refId) {
    profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
  }

  const userName = profile ? (profile.nick_name || profile.real_name || "彼氏") : "彼氏";
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

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
  const refId = $(data).str("userid", "") || $(data).str("data.userid", "");
  const medalin = $(data).number("medalin", 0);
  const medalout = $(data).number("medalout", 0);
  const logindate = $(data).str("logindate", "");
  const logoutdate = $(data).str("logoutdate", "");

  if (refId) {
    await DB.Insert<any>(refId, {
      collection: "playlog",
      medalin,
      medalout,
      logindate,
      logoutdate,
      timestamp: Date.now(),
    });
  }

  return send.success();
};

/**
 * kpm_playerlog.pload - Load player activity log
 */
export const playerlog_pload: EPR = async (info, data, send) => {
  return send.object({
    data: {},
  });
};

/**
 * kpm_playerlog.psave - Save player activity log
 */
export const playerlog_psave: EPR = async (info, data, send) => {
  return send.success();
};

/**
 * kpm_link.LPAC00 & kpm_player.data_load - Cross-game linkage with LovePlus ARCADE
 * Imports girlfriend relationship and character customization from LovePlus ARCADE
 */
export const link_lpac: EPR = async (info, data, send) => {
  const refId = $(data).str("data.eaid", "") || $(data).str("eaid", "");
  const lpacProfile = await DB.FindOne<any>(refId, { collection: "profile" });

  const d: any[] = [];
  let recordCount = 0;

  if (lpacProfile && lpacProfile.usergamedata) {
    const dataTypes = $(data)
      .str("data.recv_csv", "")
      .split(",")
      .filter((_, i) => i % 2 === 0);

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
    }
  }

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
  const refId = $(data).str("refid", "") || $(data).str("data.refid", "");
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
  return send.object({});
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


