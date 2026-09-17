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
 * tf_setting.config - Team Fortune server-side cabinet settings
 * Evaluated by CTFConfigGet in tf_eam_mod.dll and processed by CEamuseControl::ConfigRecieve in game.
 * - ConfigRecieve[0]: Feature bits string (MUST BE EXACTLY 50 CHARS!).
 *   bit[0]: KPU ON/OFF ('1'/'0')
 *   bit[1]: IX8 ON/OFF ('1'/'0')
 *   bit[2]: K70 ON/OFF ('1'/'0')
 *   bit[3]: KLP ON/OFF ('1'/'0') -> Enables LovePlus ARCADE cross-linkage!
 *   bit[4..5]: NLP[0..1]
 *   bit[6..11]: IR[0..5]
 *   bit[12]: DemoCampaign
 *   bit[13..15]: Campaign[0..2]
 *   bit[16..23]: DATE[0..7]
 *   bit[24..31]: JPSLOT[0..7]
 * - ConfigRecieve[1]: PO SETTING (e.g. "1")
 * - ConfigRecieve[2]: GAME BALANCE (e.g. "1")
 * - ConfigRecieve[3]: REAL DATE (e.g. "1")
 */
export const tf_setting_config: EPR = async (info, data, send) => {
  const key = $(data).str("key", "") || $(data).str("data.key", "");
  const currentIdx = configRequestIndex++;

  // Feature bit string: 50 characters, all '1' enables KPU, IX8, K70, KLP, NLP, IR, Campaigns, DATE, JPSLOT
  // Index 3 is '1' which triggers "CEamuseControl::ConfigRecieve KLP ON" and unlocks kpm_link.LPAC00
  const featureBits = "1".repeat(50);

  let val = "1";
  if (key === "0" || key === "feature" || key === "config0" || (key === "" && currentIdx % 4 === 0)) {
    val = featureBits;
  } else if (key === "1" || key === "2" || key === "3") {
    val = "1";
  } else if (key === "") {
    // If key is not sent by client, follow the 4-step boot sequence (0: feature, 1: PO, 2: Balance, 3: RealDate)
    val = (currentIdx % 4 === 0) ? featureBits : "1";
  }

  console.log(`[LPM:tf_setting.config] Request #${currentIdx} key='${key}' -> returning value (len=${val.length}): ${val.slice(0, 16)}${val.length > 16 ? "..." : ""}`);

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

