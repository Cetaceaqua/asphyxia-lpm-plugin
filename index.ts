import {
  status_set,
  shopinfo_register,
  config_get,
  tf_setting_config,
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
  playerlog_pload,
  playerlog_psave,
  link_lpac,
  tf_userdata_assign,
  tf_userdata_cload,
  tf_userdata_save,
  event_status,
} from "./handlers/extra";

export function register() {
  R.GameCode("KPM");

  R.Contributor("Cetaceaqua", "https://cetaceaqua.com");

  R.Config("enable_lpac_link", {
    name: "LovePlus ARCADE Linkage",
    desc: "Enable cross-game profile linkage with LovePlus ARCADE Colorful Clip.",
    type: "boolean",
    default: true,
  });

  R.Config("default_kanojo", {
    name: "Default Girlfriend",
    desc: "Default girlfriend for newly generated player profiles (1: Manaka, 2: Rinko, 3: Nene).",
    type: "integer",
    range: [1, 3],
    default: 1,
  });

  // System & Boot routes
  R.Route("status.set", status_set);
  R.Route("shopinfo.register", shopinfo_register);
  R.Route("config.get", config_get);
  R.Route("tf_setting.config", tf_setting_config);
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
  R.Route("kpm_totalrank.get", rank_get);
  R.Route("kpm_playerlog.pload", playerlog_pload);
  R.Route("kpm_playerlog.psave", playerlog_psave);
  R.Route("kpm_link.LPAC00", link_lpac);
  R.Route("kpm_player.data_load", link_lpac);

  // Team Fortune user data routes
  R.Route("tf_userdata.assign", tf_userdata_assign);
  R.Route("tf_userdata.cload", tf_userdata_cload);
  R.Route("tf_userdata.csave", tf_userdata_save);
  R.Route("tf_userdata.isave", tf_userdata_save);
  R.Route("tf_userdata.iload", tf_userdata_save);

  // Medal cross-event lottery routes
  R.Route("kpu_event.status", event_status);
  R.Route("ix8_event.status", event_status);
  R.Route("k70_event.status", event_status);

  R.Unhandled();

  console.log("Plugin [lpm@asphyxia] registered successfully.");
  console.log(`Asphyxia CORE Version: v${CORE_VERSION_MAJOR}.${CORE_VERSION_MINOR}`);
}
