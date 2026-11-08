# POWATER CORP. (`v1.0.3.1`) — GDevelop 5 Project Documentation (`GEMINI.md`)

> **Team Green Gang**: Sukrit Limpakanon, Aristt Mahakitsiri, Gantinan Satjariyakul  
> **Engine**: GDevelop 5 (`POWATER CROPS..json`) + Real PNG Sprite Assets + PixiJS Procedural River/Conduit Rendering  
> **Version Naming**: `1.x.y.z` (`x` = Major Version, `y` = Small Addition Within Major Version, `z` = Bug Fixes) — Current: **`v1.0.3.1`**

---

## 1. Game Overview & Core Lore (`POWATER IDEA PITCH.pdf`)

- **Genre**: Singleplayer Infrastructure & Environmental Strategy Game (PC, iOS, Android)
- **Protagonist**: **Amigo TheGOATHimself** — An Italian environmental tycoon hired by cities worldwide to manage electricity, clean water, and wastewater treatment while keeping pollution below toxic thresholds and citizen complaints at zero.
- **Connection with UN SDGs**:
  - **SDG 6 (Clean Water and Sanitation)**: Pumping clean river water to households and treating wastewater via riverside outlets/filters.
  - **SDG 7 (Affordable and Clean Energy)**: Transitioning from polluting coal generators to zero-emission **Solar Cell** plants.
  - **SDG 11 (Sustainable Cities and Communities)**: Planning resilient urban utility networks across rivers and surviving extreme weather disasters.

---

## 2. Core Game Mechanics (`POWATER CORP.pdf` — Upgrade from `b1.5` Demo to `v1.0.0.0`)

### 🏆 Win Conditions
- **House Requirement**: Maintain **more than 15 completed houses (`>= 15` houses)** continuously supplied with water and electricity for **5–7 minutes (`300s`)**.
- **Pause Rule**: If any pump/facility breaks down (**Needs Repair**) or an **Extreme Weather Disaster** is active, the **Win Timer pauses** (`PAUSED`).
- **Reset Rule**: If a citizen files a **Complaint**, the **Win Timer resets to `00:00`** immediately.

### 💀 Lose Conditions
1. **Citizen Complaints**: Reaching the level's maximum complaint limit (`3` strikes in Bangkok, Tokyo, and Rome; **`1` strike = Instant Game Over** in Amsterdam).
2. **Pollution Limit**: City pollution reaches or exceeds the level's maximum threshold.
3. **Flood Timeout (Amsterdam)**: Failing to drain a major flood within **2 minutes (`120s`)**.

### 💰 Economy System
- **Instant House Completion Bonus**: Completing a house's utility connections awards **`+$50` immediately**.
- **Weekly Revenue**: At the end of every in-game week (7 days), the city awards **`[Completed Houses] * $40 / week`** (plus base municipal grant).

### 🔧 New `v1.0.0.0` Systems
1. **Repair System**:
   - Every **2 minutes (`120s`)**, active pumps and generators have a **30% chance** to break down (`isBroken = true`), displaying a flashing red ring and the `badge_repair.png` wrench icon.
   - Players can repair broken equipment by clicking directly on the broken building, clicking the **`REPAIR` (`btn_repair.png`)** toolbar button, or pressing `[R]`.
2. **Day/Night Cycle**:
   - **Day: 1 minute (`60s`)** | **Night: 1 minute (`60s`)**.
   - Features smooth ambient night lighting (`nightAlpha`), warm glowing window halos around powered/candle-lit houses, and dynamic `icon_day.png` / `icon_night.png` HUD indicators.
3. **Map Upsize System**:
   - Every **`x + 10` houses** (`10`, `20`, `30`), the city triggers a **Map Upsize** (`upsizeTier` 1–3), expanding playable spawn bounds and scaling footprints until capped at **40 houses maximum (`จนตันที่ 40 หลัง`)**.
4. **Fast Interactive Scene Tutorial (`Tutorial` Scene) & Feature Video Demos (`v1.0.2.0`)**:
   - **Fast 60-Second Scene Tutorial**: Accessible via the dedicated GDevelop `Tutorial` scene or the `🎓 Fast Tutorial (60s)` button in the Level Select modal. Guides players step-by-step through wiring Power, Water, and Sewage (awarding `+$50`) and repairing a broken pump with `[R]` or click-to-repair, complete with animated Manhattan guide paths and an `⏭️ Auto-Step` button.
   - **Clickable `[▶]` Video Icons Above Every Feature Button**: Each feature button on the bottom toolbar (`Power`, `Water`, `Sewage`, `Solar`, `Eco Filter`, `Repair`, `Special Items`, `Upgrades`, `SDGs`, `Guide`) has a clickable `icon_video_help.png` (`[▶]`) sprite badge directly above it (`y = 626`). Clicking any `[▶]` icon opens an interactive 60 FPS looping video preview demonstrating how that feature works, with play/pause controls, scrubber bar, and a **`⚡ Use This Feature Now`** button to immediately activate it.

---

## 3. The 4 Levels of `v1.0.0.0` (`POWATER CORP.pdf`)

| Level | Scene Name | Positive Condition `(+)` | Negative / Extreme Weather `(-)` | Special Item |
| :--- | :--- | :--- | :--- | :--- |
| **1. Bangkok** | `Main` | `(0)` None — First Level & Tutorial | **High Tide (`น้ำขึ้น`)**: Every 15 in-game days, river levels surge and riverside equipment requires frequent repair | Standard Repair (`[R]`) |
| **2. Tokyo** | `Tokyo` | **Clean Energy `-25%` Cost**: Solar Cell (`$45`) & Eco Filter (`$30`) subsidized by government | **Earthquake (`แผ่นดินไหว`)**: `10–15%` chance every 1 min after Protecting Time (`+5%/min` after 3 min without quake; guaranteed at 5 min, then `+5%/min` thereafter). Breaks all water & electric pumps! | Mass Repair (`[R]`) |
| **3. Rome** | `Rome` | **Unlimited Aqueducts**: Unlimited house-to-house water pipe chaining capacity | **Blackout (`ไฟดับ`)**: `12.5%` chance every 15 in-game days | **Candle (`เทียนไข`)**: Bulk Restock (`20€`, `50€`, `100€`, `500€` at `10 EUR/box`). Consumes 1 box/house per blackout |
| **4. Amsterdam** | `Amsterdam` | **Infrastructure `-5%` Cost** & **House Spawning `20%` Slower** | **Zero Complaint Tolerance (`1 Complaint = Instant Game Over`)** + Earthquake + High Tide + **Main Flood every 4 weeks (`28 days`)** (`>2 min` = Game Over) | **Emergency Flood Pump (`เครื่องสูบน้ำ`)**: `500 EUR`, One-Time Use to drain flood immediately |

---

## 4. Real PNG Assets & Hybrid Rendering Architecture

All buildings, houses, rivers, HUD bars, toolbar docks, buttons, and status badges use **real PNG assets** registered as GDevelop Sprite Objects in `POWATER CROPS..json`, combined with smooth PixiJS procedural water ripples, conduit energy flow pulses, and Day/Night lighting:

- **World & Entities (`assets/`)**:
  - `House.png`, `Power.png` (Electricity Generator), `Solar.png` (Solar Cell), `Blue barrel.png` (Water Pump), `Orange barrel.png` (Wastewater Dump/Filter), `AirFilter.png` (River/Eco Filter)
- **Level Rivers (`assets/`)**:
  - `river.png` (Chao Phraya River — Bangkok), `river_tokyo.png` (Sumida River — Tokyo), `river_rome.png` (Tiber River — Rome), `river_amsterdam.png` (Amstel Canal — Amsterdam)
- **Status Badges & Icons (`assets/`)**:
  - `badge_power.png`, `badge_water.png`, `badge_drain.png`, `badge_repair.png` (Broken Equipment Wrench), `badge_candle.png` (Rome Blackout Candle), `icon_day.png`, `icon_night.png`, `logo_powater.png`
- **Toolbar & HUD Sprites (`assets/`)**:
  - `grid_bg.png` (`1280x720`), `hud_bar.png` (`1280x44`), `toolbar_dock.png` (`880x56`)
  - 12 Toolbar Buttons: `btn_power.png`, `btn_water.png`, `btn_drain.png`, `btn_solar.png`, `btn_filter.png`, `btn_repair.png`, `btn_special.png`, `btn_pause.png`, `btn_speed.png`, `btn_upgrade.png`, `btn_sdgs.png`, `btn_guide.png`
  - 10 Feature Video Demo Icons above toolbar buttons: `icon_video_help.png` (`btn_video_help` sprite object, `48x32`)

---

## 5. Project Structure & Build Pipeline

- `POWATER CROPS..json`: Main GDevelop 5 project file containing all 5 scene layouts (`Main`, `Tutorial`, `Tokyo`, `Rome`, `Amsterdam`), sprite objects, visual event groups, and compiled JS engine bridge.
- `config/`: Dedicated configuration folder in the project root:
  - `config/global.json`: Global configuration for all stages, including `featureCosts` (building costs & capacities, wire/pipe connection costs, river crossing extra cost, demolish refund ratio, repair cost per building, Rome candle packs & Amsterdam emergency flood pump costs, and upgrade base costs/multipliers), `globalRules`, `pollutionRates`, and `disasters`.
  - `config/tutorial.json`, `config/bangkok.json`, `config/tokyo.json`, `config/rome.json`, `config/amsterdam.json`: Individual per-stage configuration files controlling `startingBudget`, `houseSpawnIntervalSeconds`, `pollutionMultiplier`, `maxPollution`, `maxComplaints`, `winRequiredHouses`, `winHoldDurationSeconds`, `maxHousesCap`, discounts, disaster flags, and optional `featureCostOverrides`.
- `scripts/config.js`: Game constants, `POWATER.applyStageConfig()` loader, `v1.0.0.0` level definitions, disaster rules, special item packs, upgrades, and `v1.1–v1.4` feature roadmap.
- `scripts/map.js`: River spline geometry, shoreline proximity checks, animated water current droplets, High Tide surge, and Amsterdam Flood rising water overlay.
- `scripts/entities.js`: `HouseEntity` (needs, completion bonus tracking, Rome candle badge), `BuildingEntity` (breakdown/repair states & wrench badge), and `ConnectionEntity` (animated flow conduits).
- `scripts/engine.js`: BFS utility propagation, economy (`+$50` completion & `+$40/week`), 5-minute Win Timer (with Pause & Reset rules), Repair timer, Day/Night cycle, Map Upsize (up to 40 houses), and Extreme Weather disasters.
- `scripts/ui.js`: Top HUD telemetry, 12-button PNG toolbar interaction, Level Selection & Briefing modal, Special Items & Disaster Control modal (`ITEMS`), Upgrades modal, and SDGs/Roadmap modal.
- `scripts/main.js`: GDevelop `runtimeScene` lifecycle controller, PixiJS dual-layer renderer, click-to-repair, drag-to-wire, keyboard shortcuts, Day/Night overlay, and Earthquake camera shake.
- `scripts/generate_assets.py`: Pure-Python RGBA PNG generator for creating and updating game sprites.
- `scripts/sync_project.py`: Bundles all modular scripts in `scripts/` and synchronizes objects, resources, and all 4 scene layouts into `POWATER CROPS..json`.

---

## 6. Future Roadmap (`POWATER CORP.pdf`)

- **`v1.1` — Seasonal Update (ฤดูกาล)**: Dynamic 4-season weather affecting solar output, river levels, and citizen water/power demand.
- **`v1.2` — Save The World Update**: New global cities and a Forestry System (`ระบบป่าไม้`) for natural carbon absorption.
- **`v1.3` — Monopoly Update**: Gacha assistant characters (`ตัวละครผู้ช่วย`) and In-App Purchase currency integration.
- **`v1.4` — MMD (Man Made Disaster) Update**: Human-induced disasters including urban fires (`ไฟไหม้`) and global warming (`โลกร้อน`).

---

## 7. Changelog

- **`v1.0.3.1` (2026-11-09)**:
  - Reorganized stage and global configuration into a dedicated [`config/`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/config) folder at the root of the project:
    - [`config/global.json`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/config/global.json): Configures all global feature costs (`featureCosts.buildings`, `featureCosts.connections`, `featureCosts.repair`, `featureCosts.specialItems`, `featureCosts.upgrades`), `globalRules`, `pollutionRates`, and `disasters`.
    - [`config/tutorial.json`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/config/tutorial.json), [`config/bangkok.json`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/config/bangkok.json), [`config/tokyo.json`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/config/tokyo.json), [`config/rome.json`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/config/rome.json), [`config/amsterdam.json`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/config/amsterdam.json): Dedicated JSON configuration file for each stage.
  - Wired all feature costs (`getBuildingCost`, `getConnectionCost`, `getRepairCost`, `buyCandlePack`, `useEmergencyFloodPump`, `buyUpgrade`, and `DEMOLISH_REFUND_RATIO`) across [`scripts/config.js`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/scripts/config.js), [`scripts/engine.js`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/scripts/engine.js), and [`scripts/ui.js`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/scripts/ui.js).
- **`v1.0.3.0` (2026-11-08)**:
  - Added [`stage_config.json`](file:///mnt/c/Users/user/Desktop/Folder/GDEV_POWATER/stage_config.json) for configuring global and per-stage parameters without editing source code: pollution production/reduction rates (`pollutionRates` + per-stage `pollutionMultiplier`), house spawn speed (`houseSpawnIntervalSeconds`), starting money (`startingBudget`), max pollution (`maxPollution`), max complaints (`maxComplaints`), win timer requirements (`winRequiredHouses`, `winHoldDurationSeconds`), economy rewards (`houseCompleteBonus`, `weeklyRevenuePerCompleteHouse`, `weeklyBaseGrant`), building costs/capacities (`buildings`), and disaster intervals/chances (`disasters`).
  - Added `POWATER.applyStageConfig()` and live `fetch('stage_config.json')` hot-reloading in `scripts/config.js` and `scripts/engine.js`, plus automatic inline embedding in `scripts/sync_project.py` and `scripts/patch_preview.py`.
- **`v1.0.2.3` (2026-11-08)**:
  - Fixed the full-screen / window-maximize unintended 3x zoom bug by patching `gdjs.RuntimeScenePixiRenderer.prototype.onGameResolutionResized` in `scripts/main.js` to use `pixiRenderer.screen.width` (`1280` logical width) instead of `pixiRenderer.width` (`3840` physical framebuffer width), and locking the scene root `_pixiContainer.scale` to `(1, 1)`.
- **`v1.0.2.2` (2026-11-08)**:
  - Fixed WebGL `<canvas>` downsampling blur by upgrading GDevelop's `RuntimeGamePixiRenderer` (`_pixiRenderer` + `_threeRenderer`) in `scripts/main.js` (`enableHighDPIRenderer`) from `1280x720` (`resolution = 1`) to **3x–4x Supersampled 4K (`3840x2160` internal framebuffer)** while preserving `1280x720` logical coordinates.
  - Fixed double-text ghosting and Z-order bleed on bottom toolbar buttons by setting `uiContainer` to `zOrder = 50`, hiding the static bitmap `btn_*` / `btn_video_help` sprite duplicates at runtime once their coordinates are synced, and patching all 5 scene scripts (`code0.js`..`code4.js`) in `scripts/patch_preview.py`.
- **`v1.0.2.1` (2026-11-08)**:
  - Fixed blurry text and buttons when zoomed in by upgrading all 12 toolbar button PNGs (`btn_*.png` at `256x192`), video help badges (`icon_video_help.png` at `144x96`), and status icons (`128x128`) in `scripts/generate_assets.py` to **4x High-Definition Anti-Aliased Vector (Signed Distance Field)** sprites.
  - Upgraded all runtime `PIXI.Text` instances in `scripts/ui.js` to **4x Retina supersampling (`resolution = 4`, `roundPixels = true`)** with pooled text caching and live crisp vector toolbar button faces & labels.
- **`v1.0.2.0` (2026-11-08)**:
  - Added a **Small & Fast Interactive Scene Tutorial** (`Tutorial` GDevelop layout + `🎓 Fast Tutorial (60s)` button in the Level Select modal) with a 4-step interactive coach banner, animated Manhattan guide paths, and `⏭️ Auto-Step` demonstration.
  - Added clickable **`icon_video_help.png` (`[▶]`) sprite buttons directly above all 10 feature buttons** on the bottom toolbar (`Power`, `Water`, `Sewage`, `Solar`, `Filter`, `Repair`, `Items`, `Upgrades`, `SDGs`, `Guide`). Clicking any `[▶]` icon opens a looping 60 FPS animated video player showing how to use that feature, along with a one-click button to immediately activate/use the feature.
- **`v1.0.1.0` (2026-11-08)**:
  - Upgraded utility conduits and live drag preview wires in `scripts/entities.js`, `scripts/engine.js`, and `scripts/main.js` to use **Manhattan routing with chamfered corners (two 45-degree turns at the corner)**, parallel mitered offsets for Power/Water/Sewage lines, and path-following flow pulses.
- **`v1.0.0.1` (2026-11-08)**:
  - Fixed GDevelop Diagnostic Report (`Missing scene variables: Pollution_total, Polltution_per_second`) by declaring both scene variables on all 4 layouts (`Main`, `Tokyo`, `Rome`, `Amsterdam`) in `scripts/sync_project.py` and `POWATER CROPS..json`.
- **`v1.0.0.0` (2026-11-08)**:
  - Upgraded game mechanics from `b1.5` demo to full `POWATER CORP.pdf` `v1.0.0.0` specification.
  - Added new real PNG assets (`river_rome.png`, `river_amsterdam.png`, `btn_repair.png`, `btn_special.png`, `badge_repair.png`, `badge_candle.png`, `icon_day.png`, `icon_night.png`, `logo_powater.png`, expanded `toolbar_dock.png`).
  - Implemented `>15` houses for 5–7 minutes Win Condition with Pause on Repair/Disaster and Reset on Complaint.
  - Implemented `+$50` instant house completion reward and `[Completed Houses] * $40 / week` weekly payout.
  - Implemented 30% pump breakdown Repair mechanic every 2 minutes, 1-minute Day/Night cycle, and Map Upsize every `+10` houses up to 40 houses max.
  - Configured the 4 dedicated GDevelop scene layouts (`Main`/Bangkok, `Tokyo`, `Rome`, `Amsterdam`) with High Tide, escalating Earthquake, Blackout + Bulk Candle Restock (`20€–500€`), and Amsterdam Flood + Emergency Flood Pump (`500 EUR`).
  - Created and synced `GEMINI.md` documentation with Git repository.
