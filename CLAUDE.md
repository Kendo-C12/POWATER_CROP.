# POWATER CORP. (`v1.0.6.5`) — GDevelop 5 Project Documentation (`CLAUDE.md`)

> **Team Green Gang**: Sukrit Limpakanon, Aristt Mahakitsiri, Gantinan Satjariyakul  
> **Engine**: GDevelop 5 (`POWATER CROPS..json`) + Real PNG Sprite Assets + PixiJS Procedural River/Conduit Rendering  
> **Version Naming**: `1.x.y.z` (`x` = Major Version, `y` = Small Addition Within Major Version, `z` = Bug Fixes) — Current: **`v1.0.6.5`**

---

## 1. Game Overview, Core Concept & Lore

- **Genre**: Singleplayer Urban Resource & Environmental Strategy Simulation Game (PC, iOS, Android)
- **Core Concept & World Background (The Urban Sustainability Crisis)**:
  - เมืองขนาดใหญ่ทั่วโลกเติบโตอย่างรวดเร็ว ประชากรเพิ่มขึ้น โครงสร้างพื้นฐานเสื่อมสภาพ สภาพภูมิอากาศเปลี่ยนแปลง และความต้องการพลังงานสูงขึ้นอย่างต่อเนื่อง
  - **Story (`story/story.txt`)**: ผู้เล่นสวมบทบาทเป็น **Amigo TheGOATHimself** (`assets/amigo.png`) นักธุรกิจผู้มองเห็นคุณค่าของธรรมชาติเหนือผลกำไร ก่อตั้งองค์กรธุรกิจเพื่อสิ่งแวดล้อมระดับโลก และได้รับเชิญจากรัฐบาลทั่วโลกให้วางระบบน้ำและพลังงานของแต่ละเมือง ท่ามกลางกลุ่มทุนที่ไม่ต้องการให้โลกเปลี่ยนแปลง
  - **City Cutscenes**: ก่อนเริ่มทุกเมืองจะมีฉากสั้น (Amigo + กล่องบทพูด, `ui.showCityCutscene`) — Bangkok เล่นบทนำจาก `story/story.txt` ก่อน แล้วตามด้วยบทพูดของเมือง (`config/<city>.json` → `cutscene`) จากนั้นจึงเปิด Briefing (คลิก/Space/Enter = ถัดไป, Esc/ข้าม = ข้ามทั้งหมด)
  - **Core Philosophy**: *"ทุกการตัดสินใจมีต้นทุน ทุกโครงการมีผลกระทบต่อสิ่งแวดล้อม และทุกความผิดพลาดส่งผลต่อคุณภาพชีวิตของประชาชน เป้าหมายสูงสุดไม่ใช่การสร้างเมืองที่ใหญ่ที่สุด แต่คือการสร้างเมืองที่สามารถเติบโตได้อย่างยั่งยืน"*
- **Connection with UN SDGs**:
  - **SDG 6 (Clean Water and Sanitation)**: การจัดการน้ำสะอาดและระบบสุขาภิบาล เพื่อให้ประชาชนทุกครัวเรือนเข้าถึงน้ำที่มีคุณภาพ โดยสูบน้ำสะอาดริมแม่น้ำและบำบัดน้ำเสียริมตลิ่ง
  - **SDG 7 (Affordable and Clean Energy)**: การส่งเสริมพลังงานสะอาดและการเข้าถึงไฟฟ้าอย่างทั่วถึง และลดมลภาวะด้วย **Eco Filter (เครื่องกรองอากาศ)**
  - **SDG 15 (Life on Land) — 🌱 Easter Egg & Mini-Achievement**: การอนุรักษ์ป่าไม้และระบบนิเวศบนบก ลดผลกระทบจากการขยายตัวของเมือง และรักษาสมดุลระหว่างการพัฒนาเมืองกับธรรมชาติ ออกแบบเป็น **Easter Egg / บันทึกผืนป่าของ Amigo (Amigo's Forest Chronicle)** และ Mini-Achievement เมื่อผู้เล่นควบคุมมลภาวะให้บริสุทธิ์หรือติดตั้ง Eco Filter โดยไม่ต้องเพิ่มฟีเจอร์เครื่องมือใหม่

---

## 2. Core Game Mechanics (`POWATER CORP.pdf` — Upgrade from `b1.5` Demo to `v1.0.0.0`)

### 🏆 Win Conditions
- **House Requirement**: Maintain **more than 15 completed houses (`>= 15` houses)** continuously supplied with water and electricity for **5–7 minutes (`300s`)**.
- **Pause Rule**: If any pump/facility breaks down (**Needs Repair**) or an **Extreme Weather Disaster** is active, the **Win Timer pauses** (`PAUSED`).
- **Reset Rule**: If a citizen files a **Complaint**, the **Win Timer resets to `00:00`** immediately.

- **Level ETA (`⏳ จบใน ~m:ss`)**: the HUD win pill shows the estimated real time left to win (`engine.estimateTimeToWin`: remaining house spawns + remaining hold time, divided by game speed), assuming the player keeps up.
- **Game speed**: the `SPEED` button cycles **1X → 2X → 4X → 1X**.

### 💀 Lose Conditions
1. **Citizen Complaints**: Reaching the level's maximum complaint limit (`3` strikes in Bangkok, Tokyo, and Rome; **`1` strike = Instant Game Over** in Amsterdam).
2. **Pollution Limit**: City pollution reaches or exceeds the level's maximum threshold.

### 💰 Economy System
- **Instant House Completion Bonus**: Completing a house's utility connections awards **`+$50` immediately**.
- **Weekly Revenue**: At the end of every in-game week (7 days), the city awards **`[Completed Houses] * $40 / week`** (plus base municipal grant).

### 🔌 Wiring Rules (`v1.0.6.1`)
- **Max wire length**: every wire/pipe spans at most **`315px` center-to-center** (`globalRules.maxWireLengthPixels`). Dragging shows the reach circle filled translucent **green** while the wire end is in range and **red** once it is too long (the preview wire turns red too).
- **Series slowdown**: the first `2` links from a source run at full flow; each extra link loses **25%** (`chainFreeHops`, `chainFlowLossPerHop`), and a 6th link carries nothing. A supplied house with lost flow keeps filling its unhappy bar (blinking utility badge) and eventually complains — *lose condition #2*. Rome's unlimited aqueducts exempt water.
- **Delete**: right-click a wire, or the `🗑️ DELETE [X]` tool (also `Delete` key). Buildings (generators, pumps, filters) **cannot be demolished**.
- **All-connected speedup**: while every house has power, water and sewage, the house spawn timer runs **4× faster** (`globalRules.allConnectedSpawnSpeedup`, not in the tutorial), so players who keep up reach the 15-house win phase sooner.
- **Spread-out spawning**: the spawner collects up to 10 legal spots and picks the one farthest from every existing house/building, so houses spread over both banks instead of clustering.
- **Reachable spawning**: houses (including the 3 starting houses) only spawn where all three utilities can be wired in, directly or through a house chain (`engine.canSupplySpot`). Scene layouts no longer place houses; buildings were compacted in Tokyo/Rome/Amsterdam so a first house fits.

### 🔧 New `v1.0.0.0` Systems
1. **Repair System**:
   - Every **2 minutes (`120s`)**, active pumps and generators have a **30% chance** to break down (`isBroken = true`), displaying a flashing red ring and the `badge_repair.png` wrench icon.
   - Players repair **one building at a time**: click the broken building directly, or select the **`REPAIR` (`btn_repair.png`)** tool / press `[R]` and click it. There is no repair-all.
2. **Day/Night Cycle**:
   - **Day: 1 minute (`60s`)** | **Night: 1 minute (`60s`)**.
   - Features smooth ambient night lighting (`nightAlpha`), warm glowing window halos around powered houses, and dynamic `icon_day.png` / `icon_night.png` HUD indicators.
3. **Map Upsize System**:
   - Every **`x + 10` houses** (`10`, `20`, `30`), the city triggers a **Map Upsize** (`upsizeTier` 1–3), expanding playable spawn bounds and scaling footprints until capped at **40 houses maximum (`จนตันที่ 40 หลัง`)**.
4. **Fast Interactive Scene Tutorial (`Tutorial` Scene) & Feature Video Demos (`v1.0.2.0`)**:
   - **Fast 60-Second Scene Tutorial**: Accessible via the dedicated GDevelop `Tutorial` scene or the `🎓 Fast Tutorial (60s)` button in the Level Select modal. 9 steps: wire Power, Water, Sewage (`+$50`) → chain a new house from the first (wire reach circle, `Tab` switches wire type) → delete the one wire under the red bouncing arrow (it is restored for free) → chain a 3rd house and see series slowdown → repair a broken pump → **Lose #1: pollution** (meter jumps to 80%, place an Eco Filter) → **Lose #2: complaints/strikes** (read & confirm) → plays the two lose-scenario videos (`lose_pollution`, `lose_complaint`). Animated Manhattan guide paths, HUD highlight on the pollution/strike pills, and an `⏭️ Auto-Step` button.
   - **Clickable `[▶]` Video Icons Above Every Feature Button**: Each feature button on the bottom toolbar (`Power`, `Water`, `Sewage`, `Eco Filter`, `Repair`, `Test Lab`, `Upgrades`, `Guide`) has a clickable `icon_video_help.png` (`[▶]`) sprite badge directly above it (`y = 626`). Clicking any `[▶]` icon opens an interactive 60 FPS looping video preview demonstrating how that feature works, with play/pause controls, scrubber bar, and a **`⚡ Use This Feature Now`** button to immediately activate it.

---

## 3. The 4 Levels & City Challenges (`POWATER CORP.`)

| Level | Scene Name | Positive Condition `(+)` | Negative / Extreme Weather `(-)` | City Challenge (`บริบทความท้าทาย`) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Bangkok** | `Main` | `(0)` None — First Level & Tutorial | **High Tide (`น้ำขึ้น`)**: Every 15 in-game days, river levels surge and riverside equipment requires frequent repair | **ปัญหาน้ำท่วมและระดับน้ำที่เปลี่ยนแปลง** |
| **2. Tokyo** | `Tokyo` | **Clean Energy `-25%` Cost**: Eco Filter (`$30`) subsidized by government | **Earthquake (`แผ่นดินไหว`)**: `10–15%` chance every 1 min after Protecting Time (`+5%/min` after 3 min without quake; guaranteed at 5 min, then `+5%/min` thereafter). Breaks all water & electric pumps! | **เตรียมรับมือแผ่นดินไหวและความเสียหายของโครงสร้างพื้นฐาน** |
| **3. Rome** | `Rome` | **Unlimited Aqueducts**: Unlimited house-to-house water pipe chaining capacity | **Blackout (`ไฟดับ`)**: `12.5%` chance every 15 in-game days — all houses lose power (Win Timer pauses) | **บริหารระบบสาธารณูปโภคที่มีข้อจำกัดความต่อเนื่องของพลังงาน** |
| **4. Amsterdam** | `Amsterdam` | **Infrastructure `-5%` Cost** & **House Spawning `20%` Slower** | **Zero Complaint Tolerance (`1 Complaint = Instant Game Over`)** + Earthquake + High Tide + **Main Flood every 4 weeks (`28 days`)** (recedes after `120s`, Win Timer pauses) | **รักษาสมดุลของระบบเมืองที่พัฒนาจนเกือบเต็มศักยภาพ พร้อมรับมือภัยพิบัติ** |

---

## 4. Real PNG Assets & Hybrid Rendering Architecture

All buildings, houses, rivers, HUD bars, toolbar docks, buttons, and status badges use **real PNG assets** registered as GDevelop Sprite Objects in `POWATER CROPS..json`, combined with smooth PixiJS procedural water ripples, conduit energy flow pulses, and Day/Night lighting:

- **World & Entities (`assets/`)**:
  - `House.png`, `Power.png` (Electricity Generator), `Blue barrel.png` (Water Pump), `Orange barrel.png` (Wastewater Dump/Filter), `AirFilter.png` (River/Eco Filter)
- **City Maps (`assets/`, 1522x1076, scene object `map_bg` scaled to 1280x905 and cropped by `y`: Bangkok/Tokyo `-92`, Rome `-120`, Amsterdam `-185`)**:
  - `Bangkok.jpg` (Chao Phraya incl. the Bang Krachao omega loop, generated by `scripts/generate_story_assets.py`), `Tokyo.jpg` (Tokyo Bay), `Rome.jpg` (Tiber), `Amsterdam.jpg` (IJ / harbour)
  - **Water comes from the image**: `map.js` samples `map_bg` onto an 8px grid (water = blue − red > 50) for `isPointInRiver`, `isNearRiver`, `checkLineIntersectsRiver`, ripples, pollution tint and the High Tide shoreline glow (falls back to the old spline river if the image can't be read). Scene building positions were solved against these masks so pumps/filters sit on the shore.
  - Old `river*.png` / `grid_bg.png` are no longer placed in scenes.
- **Status Badges & Icons (`assets/`)**:
  - `badge_power.png`, `badge_water.png`, `badge_drain.png`, `badge_repair.png` (Broken Equipment Wrench), `icon_day.png`, `icon_night.png`, `logo_powater.png`
- **Toolbar & HUD Sprites (`assets/`)**:
  - `grid_bg.png` (`1280x720`), `hud_bar.png` (`1280x44`), `toolbar_dock.png` (`820x56`, centered, no dividers)
  - 11 Toolbar Buttons (64px wide, 10px gaps, x = `238 + 74*i`; `DELETE` is vector-only, no PNG): `btn_power.png`, `btn_water.png`, `btn_drain.png`, DELETE, `btn_filter.png`, `btn_repair.png`, `btn_special.png` (Disaster Test Lab), `btn_pause.png`, `btn_speed.png`, `btn_upgrade.png`, `btn_guide.png`
  - 8 Feature Video Demo Icons above toolbar buttons: `icon_video_help.png` (`btn_video_help` sprite object, `48x32`)

---

## 5. Project Structure & Build Pipeline

- `POWATER CROPS..json`: Main GDevelop 5 project file containing all 5 scene layouts (`Main`, `Tutorial`, `Tokyo`, `Rome`, `Amsterdam`), sprite objects, visual event groups, and compiled JS engine bridge.
- `config/`: Dedicated configuration folder in the project root:
  - `config/global.json`: Global configuration for all stages, including `featureCosts` (building costs & capacities, wire/pipe connection costs, river crossing extra cost, repair cost per building, `disasterTesting.testCost` (Disaster Test Lab, `$50`/test), and upgrade base costs/multipliers), `globalRules`, `pollutionRates`, and `disasters`.
  - `config/tutorial.json`, `config/bangkok.json`, `config/tokyo.json`, `config/rome.json`, `config/amsterdam.json`: Individual per-stage configuration files controlling `startingBudget`, `houseSpawnIntervalSeconds`, `pollutionMultiplier`, `maxPollution`, `maxComplaints`, `winRequiredHouses`, `winHoldDurationSeconds`, `maxHousesCap`, discounts, disaster flags, and optional `featureCostOverrides`.
- `scripts/config.js`: Game constants, `POWATER.applyStageConfig()` loader, `v1.0.0.0` level definitions, disaster rules, upgrades, and `v1.1–v1.4` feature roadmap.
- `scripts/map.js`: River spline geometry, shoreline proximity checks, animated water current droplets, High Tide surge, and Amsterdam Flood rising water overlay.
- `scripts/entities.js`: `HouseEntity` (needs, completion bonus tracking), `BuildingEntity` (breakdown/repair states & wrench badge), and `ConnectionEntity` (animated flow conduits).
- `scripts/engine.js`: BFS utility propagation, economy (`+$50` completion & `+$40/week`), 5-minute Win Timer (with Pause & Reset rules), Repair timer, Day/Night cycle, Map Upsize (up to 40 houses), and Extreme Weather disasters.
- `scripts/ui.js`: Top HUD telemetry, 12-button PNG toolbar interaction, Level Selection & Briefing modal, paid Disaster Test Lab modal (`TEST [I]`), Upgrades modal, and SDGs/Roadmap modal.
- `scripts/main.js`: GDevelop `runtimeScene` lifecycle controller, PixiJS dual-layer renderer, click-to-repair, drag-to-wire, keyboard shortcuts, Day/Night overlay, and Earthquake camera shake.
- `scripts/generate_assets.py`: Pure-Python RGBA PNG generator for creating and updating game sprites.
- `scripts/generate_story_assets.py`: Pillow generator for `assets/Bangkok.jpg` (same art style as the other city maps) and the `assets/amigo.png` character.
- `story/story.txt`: Game story; paragraphs are inlined as `storyIntro` by `sync_project.py` / `patch_preview.py`.
- `scripts/sync_project.py`: Bundles all modular scripts in `scripts/` and synchronizes objects, resources, and all 4 scene layouts into `POWATER CROPS..json`.

---

## 6. Future Roadmap (`POWATER CORP.pdf`)

- **`v1.1` — Seasonal Update (ฤดูกาล)**: Dynamic 4-season weather affecting solar output, river levels, and citizen water/power demand.
- **`v1.2` — Save The World Update**: New global cities and a Forestry System (`ระบบป่าไม้`) for natural carbon absorption.
- **`v1.3` — Monopoly Update**: Gacha assistant characters (`ตัวละครผู้ช่วย`) and In-App Purchase currency integration.
- **`v1.4` — MMD (Man Made Disaster) Update**: Human-induced disasters including urban fires (`ไฟไหม้`) and global warming (`โลกร้อน`).

---

## 7. Changelog

- **`v1.0.6.5` (2026-11-10)**:
  - Houses spawn spread out (best of 10 legal candidates by distance to the nearest node); mean nearest-neighbour distance in Bangkok rose from ~116px to ~153px.
  - Capacity analysis (houses that fit, tier-3 bounds, reachable land only; random spawner fill / best packing): spacing `133px` — Bangkok ~23, Tokyo ~6, Rome ~25–31, Amsterdam ~15–19; spacing `100px` — Bangkok ~37–49, Tokyo ~10–14, Rome ~39–59, Amsterdam ~27–34. Tokyo's reachable land is small because the bay is wider than a wire.
- **`v1.0.6.4` (2026-11-10)**:
  - Wire reach back to `315px` with no slow long-wire zone (reverts the `790px` / long-wire slowdown from `v1.0.6.1`).
  - Reach circle is filled translucent green while in range and turns red when the drag is too long.
- **`v1.0.6.3` (2026-11-10)**:
  - HUD win pill shows `🏆 houses/required ⏳ จบใน ~m:ss` (estimated real time until the level can be won).
  - `SPEED` button cycles 1X → 2X → 4X → 1X.
- **`v1.0.6.2` (2026-11-10)**:
  - Shorter levels: when every house is fully wired, the next house spawns 4× sooner (`⏩` message), in all 4 cities.
- **`v1.0.6.1` (2026-11-10)**:
  - Wire reach 2.5× (`315px` → `790px`); wires longer than `315px` transport power/water/sewage slower (extra series hops), so tutorial houses are always wireable.
  - Tutorial step 5: delete just one wire, pointed at by a red bouncing arrow from the moment the step starts; the wire is restored automatically.
  - Fixed floating texts drawing on top of each other (new texts stack below nearby ones; duplicates are skipped).
- **`v1.0.6.0` (2026-11-10)**:
  - New hand-drawn city maps `Tokyo.jpg`, `Rome.jpg`, `Amsterdam.jpg` (moved in from Downloads) + new `Bangkok.jpg` in the same style following the real Chao Phraya; they replace the river strips and grid background.
  - Water/shore gameplay now reads the map image (pump & filter placement, house spawning, river crossings, visual effects); scene buildings repositioned onto each map's shoreline.
  - City cutscene before each city with the main character Amigo TheGOATHimself (`assets/amigo.png`); Bangkok opens with the story from `story/story.txt`.
  - Lore follows `story/story.txt`: the player is Amigo (Mayor references rewritten in briefings, victory, SDG screens).
- **`v1.0.5.1` (2026-11-10)**:
  - Buildings can no longer be demolished (delete tool / right-click only removes wires); removed `demolishRefundRatio`.
  - Wire reach widened 2.25× (`140px` → `315px`).
- **`v1.0.5.0` (2026-11-10)**:
  - Wiring rules: `140px` max wire length with reach circle + red preview; series-chain flow loss that leads to complaints; `🗑️ DELETE [X]` tool.
  - Houses (incl. starting houses) spawn only where all three utilities are wireable; scene layouts no longer contain houses; Tokyo/Rome/Amsterdam buildings compacted (`minHouseDistancePixels` 135 → 100).
  - Tutorial expanded to 9 steps (delete, series slowdown) and ends by playing two lose-scenario videos (pollution, complaints).
  - `test_preview.js` covers wire length, spawn reachability, chain flow and the 9-step tutorial.
- **`v1.0.4.3` (2026-11-10)**:
  - **Fixed: simulation froze while the cursor was over the HUD/toolbar** (`main.js` returned before `game.update()` whenever `ui.update()` reported a UI hover). Time, pollution, spawning and complaints now keep running; only an open modal pauses the game. This is why pollution looked like it never increased.
  - Pollution HUD now shows a `☢️ เริ่มใน m:ss` countdown during the 3-minute pollution start delay instead of a silent `0.0`.
  - **`Tab` cycles wire type** Power → Water → Sewage (also works mid-drag).
  - Tutorial expanded to 7 steps: house-to-house chaining with a new house, plus the two lose conditions (pollution & complaint strikes).
  - Toolbar buttons now have 10px gaps (dock `746x56`).
- **`v1.0.4.2` (2026-11-10)**:
  - Removed the **SDGs** toolbar button (and its `[▶]` video icon).
  - Toolbar re-laid out as one evenly spaced, centered row (10 buttons, 4px gaps); `toolbar_dock.png` regenerated at `692x56` without the old section dividers.
- **`v1.0.4.1` (2026-11-10)**:
  - Renamed project docs `GEMINI.md` → `CLAUDE.md`.
  - **Removed all items**: Rome Candles (bulk restock + candle badge) and Amsterdam Emergency Flood Pump. Rome blackout now cuts power to every house; Amsterdam flood recedes after `120s` (pauses Win Timer, no longer Game Over).
  - **Removed Repair-All**: `REPAIR` button / `[R]` now only selects the per-building repair tool; broken buildings are fixed one click at a time.
  - **Removed Solar Cell** (toolbar button, `[4]` hotkey, video demo, scene sprites). Eco Filter (`AirFilter`) kept and moved to hotkey `[4]`. Tokyo's starting decorative solar sprite replaced with a working generator.
  - `ITEMS` toolbar button → **`TEST [I] LAB` (Disaster Test Lab)**: every disaster test (tide / quake / blackout / flood) costs `$50` via `game.testDisaster()` (`config/global.json` → `featureCosts.disasterTesting.testCost`); refused when the budget is short.
- **`v1.0.3.2` (2026-11-09)**:
  - Integrated Core Concept & World Background ("The Urban Sustainability Crisis"):
    - Updated Player Role to **Mayor of the City (นายกเทศมนตรี / ผู้บริหารสูงสุดของเมือง)** with **Amigo TheGOATHimself** as Chief Environmental & Infrastructure Consultant.
    - Updated Core Philosophy: *"เป้าหมายสูงสุดไม่ใช่การสร้างเมืองที่ใหญ่ที่สุด แต่คือการสร้างเมืองที่สามารถเติบโตได้อย่างยั่งยืน"*.
    - Updated UN SDGs: **SDG 6** (Clean Water & Sanitation) and **SDG 7** (Affordable & Clean Energy) as core utility goals.
    - Added **SDG 15 (Life on Land)** as an **Easter Egg / Mini-Achievement & Short Story Snippet ("Mayor's Forest Chronicle")** unlocked via keeping pollution pure or placing Eco Filter without adding redundant new tools.
    - Updated city challenges for all 4 cities in `config/` files, Level Briefing modal, and Victory modal.
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
