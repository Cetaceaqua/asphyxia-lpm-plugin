/**
 * Common System, Network & Accounting Handlers for LovePlus MEDAL
 */

/**
 * status.set - Machine status heartbeat / registration
 */
export const status_set: EPR = async (info, data, send) => {
  return send.success();
};

/**
 * shopinfo.register - Register arcade machine PCB ID and network address
 */
export const shopinfo_register: EPR = async (info, data, send) => {
  const pcbid = $(data).attr().pcbid || "014014000003CCCBC5E6";
  return send.object({
    record: K.ATTR({
      pcbid: pcbid,
      global_ip: "127.0.0.1",
      private_ip: "127.0.0.1",
      global_port: "8083",
    }),
  });
};

/**
 * config.get - Network operational parameters (FPS, keepalive interval)
 */
export const config_get: EPR = async (info, data, send) => {
  return send.xml(`
<config status="0" records="2">
  <record key="fps" value="60"/>
  <record key="keepalive" value="30"/>
</config>
  `.trim());
};

// Counter to track sequence of tf_setting.config requests if key is omitted or ambiguous
let configRequestIndex = 0;

/**
 * Dynamically construct the 50-character feature string for CEamuseControl::ConfigRecieve[0]
 * Exact bit layout verified via sub_54BF20 in KT_SKELETON_ST_DUAL.EXE:
 * - bit[0]: KPU ON/OFF ('1'/'0') -> GRAND CROSS CHRONICLE linkage
 * - bit[1]: IX8 ON/OFF ('1'/'0') -> FORTUNE TRINITY linkage
 * - bit[2]: K70 ON/OFF ('1'/'0') -> Anima Lotta linkage
 * - bit[3]: KLP ON/OFF ('1'/'0') -> LovePlus ARCADE Colorful Clip linkage
 * - bit[4..5]: NLP[0..1]
 * - bit[6..11]: IR[0..5]
 * - bit[12]: DemoCampaign (attract mode demo campaign banner)
 * - bit[13..15]: Campaign[0..2]
 * - bit[16..31]: DATE[0..15] (seasonal holiday date events)
 * - bit[32..39]: JPSLOT[0..7] (jackpot slot event flags)
 * - bit[40..47]: NLP[0..7] (extended New Love Plus events)
 * - bit[48..49]: "00" (reserved padding)
 */
function buildFeatureBits(): string {
  const kpu = (U.GetConfig("enable_kpu_event") !== false) ? "1" : "0";
  const ix8 = (U.GetConfig("enable_ix8_event") !== false) ? "1" : "0";
  const k70 = (U.GetConfig("enable_k70_event") !== false) ? "1" : "0";
  const klp = (U.GetConfig("enable_lpac_link") !== false) ? "1" : "0";
  const nlp = (U.GetConfig("enable_nlp_events") !== false) ? "1" : "0";
  const demoCamp = (U.GetConfig("enable_demo_campaign") !== false) ? "1" : "0";
  const camp0 = (U.GetConfig("enable_campaign_0") !== false) ? "1" : "0";
  const camp1 = (U.GetConfig("enable_campaign_1") !== false) ? "1" : "0";
  const camp2 = (U.GetConfig("enable_campaign_2") !== false) ? "1" : "0";
  // Reverse engineering sub_47FE70 confirms:
  // If DATE mask is 0xFFFF (all 16 bits '1' or '0'), the game overrides it with fallback 0x0135 (only 5 date spots).
  // To unlock all 13 date spots, bits 0..12 must be '1' and bits 13..15 must be '0' (0x1FFF != 0xFFFF).
  const dateEvents = (U.GetConfig("enable_date_events") !== false) ? ("1".repeat(13) + "000") : "0".repeat(16);
  const jpslot = (U.GetConfig("enable_jpslot_events") !== false) ? "1".repeat(8) : "0".repeat(8);
  const nlp8 = (U.GetConfig("enable_nlp_events") !== false) ? "1".repeat(8) : "0".repeat(8);

  const bits = [
    kpu,
    ix8,
    k70,
    klp,
    nlp, nlp,                 // bit 4..5: NLP[0..1]
    nlp, nlp, nlp, nlp, nlp, nlp, // bit 6..11: IR[0..5]
    demoCamp,                 // bit 12: DemoCampaign (title logo A/B & White Day event popup)
    camp0,                    // bit 13: Campaign[0] (HALLS mints tie-in wallpaper)
    camp1,                    // bit 14: Campaign[1] (SUMMER beach event, BGM & 3x drop rate)
    camp2,                    // bit 15: Campaign[2] (Extended campaign)
    dateEvents,               // bit 16..31: DATE[0..15] (16 chars; 13 spots + 3 padding)
    jpslot,                   // bit 32..39: JPSLOT[0..7] (8 chars; Jackpot Slot illustration packs)
    nlp8,                     // bit 40..47: NLP[0..7] (8 chars; 3DS link & QR Tadaima struct)
    "00",                     // bit 48..49: Padding (2 chars)
  ].join("");

  return bits.padEnd(50, "0").slice(0, 50);
}

/**
 * tf_setting.config - Team Fortune server-side cabinet settings
 * Evaluated by CTFConfigGet in tf_eam_mod.dll and processed by CEamuseControl::ConfigRecieve in game.
 * - ConfigRecieve[0]: Feature bits string (MUST BE EXACTLY 50 CHARS!).
 * - ConfigRecieve[1]: PO SETTING (payout rate offset, e.g. "0")
 * - ConfigRecieve[2]: GAME BALANCE (difficulty balance index, e.g. "1")
 * - ConfigRecieve[3]: REAL DATE (bet threshold for promotional items, e.g. "300")
 * - TelopRecieve[0..3]: telop_1 .. telop_4 (scrolling marquee & login activity notification)
 */
export const tf_setting_config: EPR = async (info, data, send) => {
  const key = $(data).str("key", "") || $(data).str("data.key", "");
  const currentIdx = configRequestIndex++;

  const featureBits = buildFeatureBits();

  let val = "1";
  if (key === "setinfo2" || key === "0" || key === "feature" || key === "config0") {
    val = featureBits;
  } else if (key === "po_rate" || key === "1") {
    val = "0"; // Payout rate offset (±10)
  } else if (key === "game_balance" || key === "2") {
    val = "1"; // Balance index 0..2
  } else if (key === "real_date" || key === "3") {
    val = "300"; // Real Date bet counter threshold (300..2000, default 500)
  } else if (key === "telop_1") {
    val = "【イベント情報】ラブプラス MEDAL 好評稼働中！\\n";
  } else if (key === "telop_2") {
    val = "ホワイトデー＆サマーキャンペーン開催中！\\n";
  } else if (key === "telop_3") {
    val = "ジャックポットで限定イラスト大量出現中！\\n";
  } else if (key === "telop_4") {
    val = "カノジョと一緒にメダルを楽しもう♪\\n";
  } else if (key === "") {
    // If key is omitted, fallback to round-robin
    val = (currentIdx % 4 === 0) ? featureBits : "1";
  }

  console.log(`[LPM:tf_setting.config] Request #${currentIdx} key='${key}' -> returning value (len=${val.length}): ${val.slice(0, 32)}${val.length > 32 ? "..." : ""}`);

  return send.object({
    value: K.ITEM("str", val),
  });
};

/**
 * gamelog.write - Game event and security log submission
 */
export const gamelog_write: EPR = async (info, data, send) => {
  return send.success();
};

/**
 * shopinfo.setaddress - Report and update arcade machine network addresses
 * Sent by CShopinfoSetAddr in eam_if.exe with attributes:
 * model, label, shopcode, private_ip, global_ip, global_port, macaddr, pcbid
 */
export const shopinfo_setaddress: EPR = async (info, data, send) => {
  const attr = $(data).attr();
  const pcbid = attr.pcbid || "014014000003CCCBC5E6";
  const model = attr.model || "";
  const shopcode = attr.shopcode || "";
  const private_ip = attr.private_ip || "127.0.0.1";
  const global_ip = attr.global_ip || "127.0.0.1";
  const global_port = attr.global_port || "8083";
  const macaddr = attr.macaddr || "";

  console.log(`[LPM:shopinfo.setaddress] pcbid=${pcbid}, model=${model}, shopcode=${shopcode}, ip=${private_ip}/${global_ip}:${global_port}, mac=${macaddr}`);

  try {
    await DB.Upsert<any>(
      { collection: "machine", pcbid },
      {
        collection: "machine",
        pcbid,
        model,
        shopcode,
        private_ip,
        global_ip,
        global_port,
        macaddr,
        last_online: Date.now(),
      }
    );
  } catch (err) {
    console.warn(`[LPM:shopinfo.setaddress] DB update failed:`, err);
  }

  return send.success();
};

/**
 * pjpgroup.list - Progressive Jackpot Group host machine list query
 * Sent by CPJackpotHostList in eam_if.exe.
 * Client parser (sub_41C370 & sub_553700) checks machinenum@ and groupid@.
 * When machinenum="0", client safely falls back to standalone local Progressive Jackpot.
 */
export const pjpgroup_list: EPR = async (info, data, send) => {
  const attr = $(data).attr();
  console.log(`[LPM:pjpgroup.list] Machine queried PJP host group list (shop=${attr.shopcode || ""}, pcbid=${attr.pcbid || ""}) -> reporting standalone PJP (machinenum=0)`);

  return send.xml(`<pjpgroup status="0" machinenum="0" groupid="0"/>`);
};

/**
 * pjpgroup.register - Progressive Jackpot Group machine registration
 * Sent by CPJackpotGroupModule in eam_if.exe.
 */
export const pjpgroup_register: EPR = async (info, data, send) => {
  const attr = $(data).attr();
  console.log(`[LPM:pjpgroup.register] Machine registered to PJP (pcbid=${attr.pcbid || ""}, key1=${attr.key1 || ""}, key2=${attr.key2 || ""})`);
  return send.success();
};

/**
 * tf_errorlog.error - Team Fortune runtime error report
 */
export const tf_errorlog_error: EPR = async (info, data, send) => {
  console.warn(`[LPM:tf_errorlog.error] Machine error reported:`, $(data).attr());
  return send.success();
};

/**
 * income.save - Coin / medal bookkeeping report save
 */
export const income_save: EPR = async (info, data, send) => {
  return send.success();
};

/**
 * income.update - Coin / medal bookkeeping report update
 */
export const income_update: EPR = async (info, data, send) => {
  return send.success();
};

