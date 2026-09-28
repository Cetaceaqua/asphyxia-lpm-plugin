import { Profile, KanojoType, createDefaultProfile } from "../models/profile";
import { inheritProfileFromLpac } from "./extra";

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
    // 1. Try to inherit girlfriend and player info from LovePlus ARCADE save data
    const isLinkEnabled = U.GetConfig("enable_lpac_link") !== false;
    if (isLinkEnabled && refId) {
      profile = inheritProfileFromLpac(refId);
    }

    if (profile) {
      console.log(`[LPM:player.pload] Created profile inherited from LPAC for refId=${refId}`);
      try {
        await DB.Insert<Profile>(refId, profile);
      } catch {
        // Ignore insert collision
      }
    } else {
      // 2. Pure new card (or LPAC link disabled/not found):
      // DO NOT automatically create a default "彼氏" profile here!
      // Return an empty profile with empty real_name and nick_name.
      // The game client's CEamuseData::GetProfileData (0x00555D40) will detect
      // strlen(real_name) == 0, return false, and automatically launch the authentic
      // in-game Mode 3 (CGameCharaSelect) girlfriend selection, naming, and birthday setup!
      console.log(`[LPM:player.pload] No profile found for refId=${refId}. Reporting uninitialized profile to trigger in-game CharaSelect & Naming workflow (Mode 3)`);
      return send.object({
        data: {
          real_name: K.ITEM("str", ""),
          nick_name: K.ITEM("str", ""),
          nick_id: K.ITEM("u32", 0),
          birth_month: K.ITEM("u16", 0),
          birth_day: K.ITEM("u16", 0),
          blood_type: K.ITEM("u16", 0),
          kanojo: K.ITEM("u16", 0),
          hair_style: K.ITEM("u16", 0),
          hair_color: K.ITEM("u16", 0),
          real_date: K.ARRAY("u16", [0, 0, 0, 0, 0, 0, 0, 0]),
          reserved: K.ARRAY("u16", [0, 0, 0, 0, 0]),
          total_play: K.ITEM("u32", 0),
          last_bet: K.ITEM("str", ""),
          last_play: K.ITEM("str", ""),
          reserved2: K.ARRAY("u32", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
        },
      });
    }
  }

  console.log(`[LPM:player.pload] Sending to client: refId=${refId}, name=${profile.real_name}, nick=${profile.nick_name}, kanojo=${profile.kanojo} (0:Manaka, 1:Rinko, 2:Nene)`);

  // Reverse engineering sub_10005830 in KPM_EAM_MOD.DLL confirms exact property types required:
  // - data/real_name: string (Type 11)
  // - data/nick_name: string (Type 11)
  // - data/nick_id: u32 (Type 7)
  // - data/birth_month: u16 (Type 5)
  // - data/birth_day: u16 (Type 5)
  // - data/blood_type: u16 (Type 5)
  // - data/kanojo: u16 (Type 5, 0:Manaka, 1:Rinko, 2:Nene) -> CRITICAL: Must be u16!
  // - data/hair_style: u16 (Type 5)
  // - data/hair_color: u16 (Type 5)
  // - data/real_date: 8 x u16 (Type 5)
  // - data/reserved: 5 x u16 (Type 5)
  // - data/total_play: u32 (Type 7)
  // - data/last_bet: string (Type 11, format "YYYY-MM-DD HH:MM")
  // - data/last_play: string (Type 11, format "YYYY-MM-DD HH:MM")
  // - data/reserved2: 10 x u32 (Type 7)
  return send.object({
    data: {
      real_name: K.ITEM("str", profile.real_name || "彼氏"),
      nick_name: K.ITEM("str", profile.nick_name || "彼氏"),
      nick_id: K.ITEM("u32", profile.nick_id ?? 1),
      birth_month: K.ITEM("u16", profile.birth_month ?? 9),
      birth_day: K.ITEM("u16", profile.birth_day ?? 12),
      blood_type: K.ITEM("u16", profile.blood_type ?? 1),
      kanojo: K.ITEM("u16", profile.kanojo ?? KanojoType.MANAKA),
      hair_style: K.ITEM("u16", profile.hair_style ?? 1),
      hair_color: K.ITEM("u16", profile.hair_color ?? 1),
      real_date: K.ARRAY("u16", profile.real_date || [0, 0, 0, 0, 0, 0, 0, 0]),
      reserved: K.ARRAY("u16", profile.reserved || [0, 0, 0, 0, 0]),
      total_play: K.ITEM("u32", profile.total_play ?? 0),
      last_bet: K.ITEM("str", profile.last_bet || "2026-09-12 12:00"),
      last_play: K.ITEM("str", profile.last_play || "2026-09-12 12:00"),
      reserved2: K.ARRAY("u32", profile.reserved2 || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
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
 * Reverse engineered from sub_10006090 in KPM_EAM_MOD.DLL:
 * Expects ROOT-LEVEL nodes (no data wrapper!):
 * - date_result: 32 x u16 (Type 5, 64 bytes)
 * - dress_request: 5 x u16 (Type 5, 10 bytes)
 * - date_time: 32 x u32 (Type 7, 128 bytes epoch seconds)
 */
export const player_dload: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  const date_result = profile?.date_result && profile.date_result.length === 32
    ? profile.date_result
    : new Array(32).fill(0);

  const dress_request = profile?.dress_request && profile.dress_request.length === 5
    ? profile.dress_request
    : new Array(5).fill(0);

  const date_time = profile?.date_time && profile.date_time.length === 32
    ? profile.date_time
    : new Array(32).fill(0);

  console.log(`[LPM:player.dload] Sending Date Memories at root level for refId=${refId}`);

  return send.object({
    date_result: K.ARRAY("u16", date_result),
    dress_request: K.ARRAY("u16", dress_request),
    date_time: K.ARRAY("u32", date_time),
  });
};

/**
 * kpm_player.dsave - Save Date Memory (思い出アルバム)
 * Reverse engineered from sub_10006170 in KPM_EAM_MOD.DLL:
 * Client uploads at root level:
 * - userid: string (Type 11)
 * - date_result: array of u16 (Type 47 / 5)
 * - dress_request: array of u16 (Type 47 / 5)
 * - date_time: array of u32 (Type 47 / 7)
 */
export const player_dsave: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  if (refId) {
    let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (!profile) {
      profile = createDefaultProfile();
    }

    const date_result = $(data).numbers("date_result") || $(data).numbers("data.date_result");
    if (date_result && date_result.length > 0) {
      profile.date_result = date_result;
    }

    const dress_request = $(data).numbers("dress_request") || $(data).numbers("data.dress_request");
    if (dress_request && dress_request.length > 0) {
      profile.dress_request = dress_request;
    }

    const date_time = $(data).numbers("date_time") || $(data).numbers("data.date_time");
    if (date_time && date_time.length > 0) {
      profile.date_time = date_time;
    }

    await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
    console.log(`[LPM:player.dsave] Saved Date Memories for refId=${refId}`);
  }
  return send.success();
};

/**
 * kpm_player.jload - Load Jackpot Record (JPアルバム)
 * Reverse engineered from sub_10006300 in KPM_EAM_MOD.DLL:
 * Expects ROOT-LEVEL nodes (no data wrapper!):
 * - jp_win: 32 x u16 (Type 5, 64 bytes)
 * - jp_time: 32 x u32 (Type 7, 128 bytes epoch seconds)
 */
export const player_jload: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  const profile = await DB.FindOne<Profile>(refId, { collection: "profile" });

  const jp_win = profile?.jp_win && profile.jp_win.length === 32
    ? profile.jp_win
    : new Array(32).fill(0);

  const jp_time = profile?.jp_time && profile.jp_time.length === 32
    ? profile.jp_time
    : new Array(32).fill(0);

  console.log(`[LPM:player.jload] Sending JP Memories at root level for refId=${refId}`);

  return send.object({
    jp_win: K.ARRAY("u16", jp_win),
    jp_time: K.ARRAY("u32", jp_time),
  });
};

/**
 * kpm_player.jsave - Save Jackpot Record (JPアルバム)
 * Reverse engineered from sub_10006400 in KPM_EAM_MOD.DLL:
 * Client uploads at root level:
 * - userid: string (Type 11)
 * - jp_win: array of u16 (Type 47 / 5)
 * - jp_time: array of u32 (Type 47 / 7)
 */
export const player_jsave: EPR = async (info, data, send) => {
  const refId = getRefId(data);
  if (refId) {
    let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
    if (!profile) {
      profile = createDefaultProfile();
    }

    const jp_win = $(data).numbers("jp_win") || $(data).numbers("data.jp_win");
    if (jp_win && jp_win.length > 0) {
      profile.jp_win = jp_win;
    }

    const jp_time = $(data).numbers("jp_time") || $(data).numbers("data.jp_time");
    if (jp_time && jp_time.length > 0) {
      profile.jp_time = jp_time;
    }

    await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
    console.log(`[LPM:player.jsave] Saved JP Memories for refId=${refId}`);
  }
  return send.success();
};

