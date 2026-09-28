import { Profile, PlayerLog, KanojoType, createDefaultProfile, createDefaultPlayerLog } from "../models/profile";

/**
 * WebUI Event: updateProfile
 * Updates player & girlfriend basic profile and game log from the WebUI.
 */
export async function updateProfile(data: any): Promise<void> {
  const refId = data.refid;
  if (!refId) {
    throw new Error("Missing refid");
  }

  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
  if (!profile) {
    profile = createDefaultProfile();
  }

  // Update profile fields
  if (data.real_name !== undefined) profile.real_name = String(data.real_name).trim();
  if (data.nick_name !== undefined) profile.nick_name = String(data.nick_name).trim();
  if (data.kanojo !== undefined) profile.kanojo = Number(data.kanojo);
  if (data.birth_month !== undefined) profile.birth_month = Number(data.birth_month);
  if (data.birth_day !== undefined) profile.birth_day = Number(data.birth_day);
  if (data.blood_type !== undefined) profile.blood_type = Number(data.blood_type);
  if (data.hair_style !== undefined) profile.hair_style = Number(data.hair_style);
  if (data.hair_color !== undefined) profile.hair_color = Number(data.hair_color);

  // Optional: unlock items flag from form
  if (data.unlock_all_items) {
    const coldata = new Array(128).fill(0);
    for (let i = 0; i < 38; i++) coldata[i] = 1;
    for (let d = 0; d < 19; d++) coldata[64 + d] = 1;
    profile.coldata = coldata;
  }

  await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);

  // Update playerlog stats if provided
  let playerlog = await DB.FindOne<PlayerLog>(refId, { collection: "playerlog" });
  if (!playerlog) {
    playerlog = createDefaultPlayerLog();
  }

  if (data.total_game !== undefined) playerlog.total_game = Number(data.total_game);
  if (data.total_bet !== undefined) playerlog.total_bet = Number(data.total_bet);
  if (data.total_win !== undefined) playerlog.total_win = Number(data.total_win);
  if (data.normal_play !== undefined) playerlog.normal_play = Number(data.normal_play);
  if (data.date_play !== undefined) playerlog.date_play = Number(data.date_play);
  if (data.jp_play !== undefined) playerlog.jp_play = Number(data.jp_play);

  await DB.Upsert<PlayerLog>(refId, { collection: "playerlog" }, playerlog);

  console.log(`[LPM:webui] Successfully updated profile & stats for refId=${refId}`);
}

/**
 * WebUI Event: unlockAllItems
 * Safely unlocks all valid items and costumes in the game:
 * - 38 items / accessories: coldata[0..37]
 * - 19 costumes / dresses: coldata[64..82] (16 universal + 3 girlfriend unique)
 * All other slots (38..63 and 83..127) remain 0 to prevent closet buffer overflow crash (sub_4E8D00).
 */
export async function unlockAllItems(data: any): Promise<void> {
  const refId = data.refid;
  if (!refId) {
    throw new Error("Missing refid");
  }

  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
  if (!profile) {
    profile = createDefaultProfile();
  }

  const coldata = new Array(128).fill(0);

  // 1. Valid Items (0..37, 38 items total)
  for (let i = 0; i < 38; i++) {
    coldata[i] = 1;
  }

  // 2. Valid Costumes / Dresses (64..82, 19 dresses total: 16 universal + 3 unique per girl)
  for (let d = 0; d < 19; d++) {
    coldata[64 + d] = 1;
  }

  profile.coldata = coldata;

  await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
  console.log(`[LPM:webui] Safely unlocked all 57 legitimate items & costumes (38 items + 19 dresses) for refId=${refId}`);
}

/**
 * WebUI Event: resetAllItems
 * Resets all 128 collection items and costumes to 0.
 */
export async function resetAllItems(data: any): Promise<void> {
  const refId = data.refid;
  if (!refId) {
    throw new Error("Missing refid");
  }

  let profile = await DB.FindOne<Profile>(refId, { collection: "profile" });
  if (!profile) {
    profile = createDefaultProfile();
  }

  // Reset all 128 item/costume flags to 0
  profile.coldata = new Array(128).fill(0);

  await DB.Upsert<Profile>(refId, { collection: "profile" }, profile);
  console.log(`[LPM:webui] Reset all items & costumes for refId=${refId}`);
}


