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

/**
 * tf_setting.config - Team Fortune server-side cabinet settings
 */
export const tf_setting_config: EPR = async (info, data, send) => {
  return send.object({
    value: K.ITEM("str", "1"),
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

