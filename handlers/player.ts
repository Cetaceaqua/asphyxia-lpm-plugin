import { Profile, KanojoType, createDefaultProfile } from "../models/profile";

/**
 * Extracts refid from XML request data.
 */
function getRefId(data: any): string {
  return (
    $(data).str("refid", "") ||
    $(data).str("userid", "") ||
    $(data).str("data.refid", "") ||
    $(data).str("data.userid", "")
  );
}

/**
 * kpm_player.pload - Load main player & girlfriend profile
 */
export const player_pload: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (!profile) {
    profile = createDefaultProfile();
    try {
      await DB.Insert<Profile>(refId, profile);
      console.log(`[LPM:player.pload] Created new default profile for refId=${refId}`);
    } catch {
      // Ignore insert collision
    }
  }

  console.log(`[LPM:player.pload] refId=${refId}, name=${profile.real_name}, nick=${profile.nick_name}, kanojo=${profile.kanojo}`);

  return send.object({
    data: {
      real_name: K.ITEM("str", profile.real_name || "彼氏"),
      nick_name: K.ITEM("str", profile.nick_name || "彼氏"),
      // Binary reverse confirms sub_100078A0 parses nick_id as 32-bit integer (Type 7)
      nick_id: K.ITEM("s32", profile.nick_id ?? 1),
      birth_month: K.ITEM("s16", profile.birth_month ?? 9),
      birth_day: K.ITEM("s16", profile.birth_day ?? 12),
      blood_type: K.ITEM("s16", profile.blood_type ?? 1),
      kanojo: K.ITEM("s16", profile.kanojo ?? KanojoType.MANAKA),
      hair_style: K.ITEM("s16", profile.hair_style ?? 1),
      hair_color: K.ITEM("s16", profile.hair_color ?? 1),
      real_date: K.ARRAY("s16", profile.real_date || [0, 0, 0, 0, 0, 0, 0, 0]),
      reserved: K.ARRAY("s16", profile.reserved || [0, 0, 0, 0, 0]),
      total_play: K.ITEM("s32", profile.total_play ?? 0),
      last_bet: K.ITEM("str", profile.last_bet || "2026-09-12 12:00"),
      last_play: K.ITEM("str", profile.last_play || "2026-09-12 12:00"),
      reserved2: K.ARRAY("s32", profile.reserved2 || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    },
  });
};

/**
 * kpm_player.psave - Save updated player & girlfriend profile
 */
export const player_psave: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  if (!profile) {
    profile = createDefaultProfile();
  }

  const strField = (f: string, def: string) => $(data).str(f, "") || $(data).str(`data.${f}`, "") || def;
  const numField = (f: string, def: number) => {
    const v1 = $(data).number(f);
    if (v1 !== undefined && !isNaN(v1)) return v1;
    const v2 = $(data).number(`data.${f}`);
    if (v2 !== undefined && !isNaN(v2)) return v2;
    return def;
  };

  profile.real_name = strField("real_name", profile.real_name || "彼氏");
  profile.nick_name = strField("nick_name", profile.nick_name || "彼氏");
  profile.nick_id = numField("nick_id", profile.nick_id ?? 1);
  profile.birth_month = numField("birth_month", profile.birth_month ?? 9);
  profile.birth_day = numField("birth_day", profile.birth_day ?? 12);
  profile.blood_type = numField("blood_type", profile.blood_type ?? 1);
  profile.kanojo = numField("kanojo", profile.kanojo ?? KanojoType.MANAKA);
  profile.hair_style = numField("hair_style", profile.hair_style ?? 1);
  profile.hair_color = numField("hair_color", profile.hair_color ?? 1);

  const real_date = $(data).numbers("real_date") || $(data).numbers("data.real_date");
  if (real_date && real_date.length > 0) profile.real_date = real_date;

  const reserved = $(data).numbers("reserved") || $(data).numbers("data.reserved");
  if (reserved && reserved.length > 0) profile.reserved = reserved;

  const reserved2 = $(data).numbers("reserved2") || $(data).numbers("data.reserved2");
  if (reserved2 && reserved2.length > 0) profile.reserved2 = reserved2;

  await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
  console.log(`[LPM:player.psave] Successfully saved profile for refId=${refId}, kanojo=${profile.kanojo}`);
  return send.success();
};

/**
 * kpm_player.lastp - Update last play timestamp
 */
export const player_lastp: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  const last_play = $(data).str("last_play", "") || $(data).str("data.last_play", "");
  if (refId && last_play) {
    const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (profile) {
      profile.last_play = last_play;
      await DB.Update<Profile>(refId, { collection: "profile" }, profile);
      console.log(`[LPM:player.lastp] refId=${refId}, last_play=${last_play}`);
    }
  }
  return send.success();
};

/**
 * kpm_player.lastb - Update last bet timestamp
 */
export const player_lastb: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  const last_bet = $(data).str("last_bet", "") || $(data).str("data.last_bet", "");
  if (refId && last_bet) {
    const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (profile) {
      profile.last_bet = last_bet;
      await DB.Update<Profile>(refId, { collection: "profile" }, profile);
      console.log(`[LPM:player.lastb] refId=${refId}, last_bet=${last_bet}`);
    }
  }
  return send.success();
};

/**
 * kpm_player.ptime - Update cumulative play time
 */
export const player_ptime: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  const total_play = $(data).number("total_play", 0) || $(data).number("data.total_play", 0);
  if (refId) {
    const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (profile) {
      profile.total_play = total_play;
      await DB.Update<Profile>(refId, { collection: "profile" }, profile);
      console.log(`[LPM:player.ptime] refId=${refId}, total_play=${total_play}`);
    }
  }
  return send.success();
};

/**
 * kpm_player.dload - Load Date Memory (思い出アルバム)
 */
export const player_dload: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  return send.object({
    data: {
      date_result: K.ITEM("s32", profile?.date_result ?? 0),
      dress_request: K.ITEM("s32", profile?.dress_request ?? 0),
      date_time: K.ITEM("str", profile?.date_time || "2026-09-12 12:00"),
    },
  });
};

/**
 * kpm_player.dsave - Save Date Memory (思い出アルバム)
 */
export const player_dsave: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  if (refId) {
    let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (!profile) {
      profile = createDefaultProfile();
    }
    profile.date_result = $(data).number("date_result", profile.date_result ?? 0);
    profile.dress_request = $(data).number("dress_request", profile.dress_request ?? 0);
    profile.date_time = $(data).str("date_time", profile.date_time || "2026-09-12 12:00");
    await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
  }
  return send.success();
};

/**
 * kpm_player.jload - Load Jackpot Record (JPアルバム)
 */
export const player_jload: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  return send.object({
    data: {
      jp_win: K.ITEM("s32", profile?.jp_win ?? 0),
      jp_time: K.ITEM("str", profile?.jp_time || "2026-09-12 12:00"),
    },
  });
};

/**
 * kpm_player.jsave - Save Jackpot Record (JPアルバム)
 */
export const player_jsave: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  if (refId) {
    let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (!profile) {
      profile = createDefaultProfile();
    }
    profile.jp_win = $(data).number("jp_win", profile.jp_win ?? 0);
    profile.jp_time = $(data).str("jp_time", profile.jp_time || "2026-09-12 12:00");
    await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
  }
  return send.success();
};

