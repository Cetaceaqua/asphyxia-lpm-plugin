# Love Plus MEDAL Happy Daily Life (KPM)

**Plugin Version**: 1.0.0  
**Target Game**: *LovePlus MEDAL Happy Daily Life* (`KPM:J:A:A:2012030600`)  
**Asphyxia CORE Version**: [1.60b](https://github.com/asphyxia-core/core/releases/tag/v1.60b)  

## Features

- **Full e-AMUSEMENT Online Support**: Handles machine boot, keepalive heartbeat, and shop registration.
- **Player Profiles & Save Data**:
  - Main character profiles (`kpm_player.pload` / `psave`)
  - Date memories & album (`kpm_player.dload` / `dsave`)
  - Jackpot win records (`kpm_player.jload` / `jsave`)
  - Activity timestamps & playtime tracking (`lastp`, `lastb`, `ptime`)
- **LovePlus ARCADE (LPAC) Cross-Linkage**:
  - Seamlessly imports girlfriend relations, nicknames, and customization from `lpac@asphyxia`.
- **Cabinet Ranking & Logging**:
  - Medal machine rankings (`kpm_rank.get`, `kpm_totalrank.get`) and audit logs.

## Credits

- Developed by **Cetaceaqua** ([cetaceaqua.com](https://cetaceaqua.com))

## Changelog

### 1.0.0
- Initial release with complete client state-machine lifecycle support.

