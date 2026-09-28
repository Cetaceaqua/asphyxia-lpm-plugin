import {
  status_set,
  shopinfo_register,
  shopinfo_setaddress,
  pjpgroup_list,
  pjpgroup_register,
  config_get,
  tf_setting_config,
  tf_errorlog_error,
  gamelog_write,
  income_save,
  income_update,
} from "./handlers/common";

import {
  player_pload,
  player_psave,
  player_lastp,
  player_lastb,
  player_ptime,
  player_dload,
  player_dsave,
  player_jload,
  player_jsave,
} from "./handlers/player";

import {
  rank_get,
  rank_my_get,
  rank_put,
  tf_logdata_play,
  playerlog_pload,
  playerlog_psave,
  link_lpac,
  tf_userdata_assign,
  tf_userdata_cload,
  tf_userdata_save,
  tf_userdata_isave,
  tf_userdata_iload,
  tf_progjp_regist,
  tf_progjp_info,
  tf_progjp_win,
  tf_progjp_group,
  event_status,
} from "./handlers/extra";

import { updateProfile, unlockAllItems, resetAllItems } from "./handlers/webui";

export function register() {
  R.GameCode("KPM");

  R.Contributor("Cetaceaqua", "https://cetaceaqua.com");

  R.Config("enable_lpac_link", {
    name: "LovePlus ARCADE Linkage",
    desc: "Enable cross-game profile linkage with LovePlus ARCADE Colorful Clip (setinfo2 bit 3).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_demo_campaign", {
    name: "Demo Campaign Banners",
    desc: "Enable event campaign banners during attract/demo title loop (setinfo2 bit 12).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_campaign_0", {
    name: "Campaign Event 1",
    desc: "Enable special in-game campaign event 1 (setinfo2 bit 13).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_campaign_1", {
    name: "Campaign Event 2",
    desc: "Enable special in-game campaign event 2 (setinfo2 bit 14).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_campaign_2", {
    name: "Campaign Event 3",
    desc: "Enable special in-game campaign event 3 (setinfo2 bit 15).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_date_events", {
    name: "Holiday & Seasonal Date Events",
    desc: "Enable 16 seasonal date events (Valentine, White Day, Summer, Christmas, etc. - setinfo2 bits 16-31).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_jpslot_events", {
    name: "Jackpot Slot Events",
    desc: "Enable special Jackpot Slot bonus chance event flags (setinfo2 bits 32-39).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_nlp_events", {
    name: "NEW Love Plus 3DS Linkage",
    desc: "Enable 3DS IR wireless communication and linkage events (setinfo2 bits 4-11, 40-47).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_kpu_event", {
    name: "GRAND CROSS CHRONICLE Linkage",
    desc: "Enable cross-game medal lottery event with GRAND CROSS CHRONICLE (KPU - setinfo2 bit 0 & kpu_event.status).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_ix8_event", {
    name: "FORTUNE TRINITY Linkage",
    desc: "Enable cross-game medal lottery event with FORTUNE TRINITY (IX8 - setinfo2 bit 1 & ix8_event.status).",
    type: "boolean",
    default: true,
  });

  R.Config("enable_k70_event", {
    name: "Anima Lotta Linkage",
    desc: "Enable cross-game medal lottery event with Anima Lotta (K70 - setinfo2 bit 2 & k70_event.status).",
    type: "boolean",
    default: true,
  });

  R.Config("default_kanojo", {
    name: "Default Girlfriend",
    desc: "Default girlfriend for newly generated player profiles (0: Manaka, 1: Rinko, 2: Nene).",
    type: "integer",
    range: [0, 2],
    default: 0,
  });

  // System & Boot routes
  R.Route("status.set", status_set);
  R.Route("shopinfo.register", shopinfo_register);
  R.Route("shopinfo.setaddress", shopinfo_setaddress);
  R.Route("pjpgroup.list", pjpgroup_list);
  R.Route("pjpgroup.register", pjpgroup_register);
  R.Route("config.get", config_get);
  R.Route("tf_setting.config", tf_setting_config);
  R.Route("tf_errorlog.error", tf_errorlog_error);
  R.Route("gamelog.write", gamelog_write);
  R.Route("income.save", income_save);
  R.Route("income.update", income_update);

  // Player routes
  R.Route("kpm_player.pload", player_pload);
  R.Route("kpm_player.psave", player_psave);
  R.Route("kpm_player.lastp", player_lastp);
  R.Route("kpm_player.lastb", player_lastb);
  R.Route("kpm_player.ptime", player_ptime);
  R.Route("kpm_player.dload", player_dload);
  R.Route("kpm_player.dsave", player_dsave);
  R.Route("kpm_player.jload", player_jload);
  R.Route("kpm_player.jsave", player_jsave);

  // Extra / ranking / link routes
  R.Route("kpm_rank.get", rank_get);
  R.Route("kpm_rank.my_get", rank_my_get);
  R.Route("kpm_rank.put", rank_put);
  R.Route("kpm_totalrank.get", rank_get);
  R.Route("kpm_totalrank.my_get", rank_my_get);
  R.Route("kpm_playerlog.pload", playerlog_pload);
  R.Route("kpm_playerlog.psave", playerlog_psave);
  R.Route("klp_link.data_load", link_lpac);
  R.Route("kpm_link.shop_check", (info, data, send) => send.success());
  R.Route("kpm_link.LPAC00", link_lpac);
  R.Route("kpm_player.data_load", link_lpac);

  // Team Fortune user data & session log routes
  R.Route("tf_userdata.assign", tf_userdata_assign);
  R.Route("tf_userdata.cload", tf_userdata_cload);
  R.Route("tf_userdata.csave", tf_userdata_save);
  R.Route("tf_userdata.isave", tf_userdata_isave);
  R.Route("tf_userdata.iload", tf_userdata_iload);
  R.Route("tf_logdata.play", tf_logdata_play);

  // Team Fortune progressive jackpot routes
  R.Route("tf_progjp.regist", tf_progjp_regist);
  R.Route("tf_progjp.info", tf_progjp_info);
  R.Route("tf_progjp.win", tf_progjp_win);
  R.Route("tf_progjp.group", tf_progjp_group);

  // Medal cross-event lottery routes
  R.Route("kpu_event.status", event_status);
  R.Route("kpu_event.regist", (info, data, send) => send.success());
  R.Route("kpu_event.end", (info, data, send) => send.success());
  R.Route("ix8_event.status", event_status);
  R.Route("ix8_event.regist", (info, data, send) => send.success());
  R.Route("ix8_event.end", (info, data, send) => send.success());
  R.Route("k70_event.status", event_status);
  R.Route("k70_event.regist", (info, data, send) => send.success());
  R.Route("k70_event.end", (info, data, send) => send.success());

  R.Unhandled();

  // WebUI Event Registrations for Profile Management & Item Unlocks
  R.WebUIEvent("updateProfile", updateProfile);
  R.WebUIEvent("unlockAllItems", unlockAllItems);
  R.WebUIEvent("resetAllItems", resetAllItems);

  console.log("Plugin [lpm@asphyxia] registered successfully.");
  console.log(`Asphyxia CORE Version: v${CORE_VERSION_MAJOR}.${CORE_VERSION_MINOR}`);
}
