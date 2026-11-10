# POWATER CORP. (`v1.0.8.8`) — GDevelop 5 Project Documentation (`CLAUDE.md`)

> **Team Green Gang**: Sukrit Limpakanon, Aristt Mahakitsiri, Gantinan Satjariyakul  
> **Engine**: GDevelop 5 (`POWATER CROPS..json`) + Real PNG Sprite Assets + PixiJS Procedural River/Conduit Rendering  
> **Version Naming**: `1.x.y.z` (`x` = Major Version, `y` = Small Addition Within Major Version, `z` = Bug Fixes) — Current: **`v1.0.8.8`**

---

## 1. Game Overview, Core Concept & Lore

- **Genre**: Singleplayer Urban Resource & Environmental Strategy Simulation Game (PC, iOS, Android)
- **Core Concept & World Background (The Urban Sustainability Crisis)**:
  - เมืองขนาดใหญ่ทั่วโลกเติบโตอย่างรวดเร็ว ประชากรเพิ่มขึ้น โครงสร้างพื้นฐานเสื่อมสภาพ สภาพภูมิอากาศเปลี่ยนแปลง และความต้องการพลังงานสูงขึ้นอย่างต่อเนื่อง
  - **Story (`story/story.txt`)**: ผู้เล่นสวมบทบาทเป็น **Amigo TheGOATHimself** (`assets/amigo.png`) นักธุรกิจผู้มองเห็นคุณค่าของธรรมชาติเหนือผลกำไร ก่อตั้งองค์กรธุรกิจเพื่อสิ่งแวดล้อมระดับโลก และได้รับเชิญจากรัฐบาลทั่วโลกให้วางระบบน้ำและพลังงานของแต่ละเมือง ท่ามกลางกลุ่มทุนที่ไม่ต้องการให้โลกเปลี่ยนแปลง
  - **City Cutscenes**: ก่อนเริ่มทุกเมืองจะมีฉากสั้น (Amigo + กล่องบทพูด, `ui.showCityCutscene`) — Bangkok เล่นบทนำจาก `story/story.txt` ก่อน (เฉพาะย่อหน้าใน `config/global.json` → `gameLore.storyIntroParagraphs`, ตอนนี้ `[1, 3, 5, 9]` = 7 หน้า + บทพูดเมือง 3 หน้า = 10 บท) แล้วตามด้วยบทพูดของเมือง (`config/<city>.json` → `cutscene`) จากนั้นจึงเปิด Briefing (คลิก/Space/Enter = ถัดไป, Esc/ข้าม = ข้ามทั้งหมด)
  - **Core Philosophy**: *"ทุกการตัดสินใจมีต้นทุน ทุกโครงการมีผลกระทบต่อสิ่งแวดล้อม และทุกความผิดพลาดส่งผลต่อคุณภาพชีวิตของประชาชน เป้าหมายสูงสุดไม่ใช่การสร้างเมืองที่ใหญ่ที่สุด แต่คือการสร้างเมืองที่สามารถเติบโตได้อย่างยั่งยืน"*
- **Connection with UN SDGs**:
  - **SDG 6 (Clean Water and Sanitation)**: การจัดการน้ำสะอาดและระบบสุขาภิบาล เพื่อให้ประชาชนทุกครัวเรือนเข้าถึงน้ำที่มีคุณภาพ โดยสูบน้ำสะอาดริมแม่น้ำและบำบัดน้ำเสียริมตลิ่ง
  - **SDG 7 (Affordable and Clean Energy)**: การส่งเสริมพลังงานสะอาดและการเข้าถึงไฟฟ้าอย่างทั่วถึง และลดมลภาวะด้วย **Eco Filter (เครื่องกรองอากาศ)**
  - **SDG 15 (Life on Land) — 🌱 Easter Egg & Mini-Achievement**: การอนุรักษ์ป่าไม้และระบบนิเวศบนบก ลดผลกระทบจากการขยายตัวของเมือง และรักษาสมดุลระหว่างการพัฒนาเมืองกับธรรมชาติ ออกแบบเป็น **Easter Egg / บันทึกผืนป่าของ Amigo (Amigo's Forest Chronicle)** และ Mini-Achievement เมื่อผู้เล่นควบคุมมลภาวะให้บริสุทธิ์หรือติดตั้ง Eco Filter โดยไม่ต้องเพิ่มฟีเจอร์เครื่องมือใหม่

---

## 2. Core Game Mechanics (`POWATER CORP.pdf` — Upgrade from `b1.5` Demo to `v1.0.0.0`)

### 🏆 Win Conditions
- **House Requirement**: Maintain **more than 15 completed houses (`>= 15` houses)** supplied with water and electricity — **no minimum time** (`winHoldDurationSeconds: 0`): the level is won the moment 15 houses are supplied and nothing is broken / no disaster is active.
- **Pollution start**: pollution starts once the city has **5 houses** (`globalRules.pollutionStartHouses`; HUD shows `☢️ เริ่มเมื่อบ้าน n/5`), and the win hold timer only counts after pollution has started (`engine.pollutionActive`).
- **Pause Rule**: If any pump/facility breaks down (**Needs Repair**) or an **Extreme Weather Disaster** is active, the **Win Timer pauses** (`PAUSED`).
- **Reset Rule**: If a citizen files a **Complaint**, the **Win Timer resets to `00:00`** immediately.

- **Level ETA (`⏳ จบใน ~m:ss`)**: the HUD win pill shows the estimated real time left to win (`engine.estimateTimeToWin`: remaining house spawns + remaining hold time, divided by game speed), assuming the player keeps up.
- **Game speed**: the `SPEED` button cycles **1X → 2X → 4X → 1X**.

- **Pollution limit is calculated (`engine.computeMaxPollution`)**: at level start, `maxPollution` = the pollution a *minimal* winning city emits from pollution start until only `pollutionWinMarginSeconds` (`20s`) of the win hold are left. Minimal city = the starting coal generator, `ceil(houses / filter capacity)` waste filters, the starting air filters, every house drained, houses growing from 5 to 15 at the all-connected spawn speed. Result: Bangkok `105.5`, Tokyo `101.4`, Rome `103.5`, Amsterdam `90.2` (the `maxPollution` in `config/<city>.json` is now only a floor, used by the tutorial). Any extra generator/filter or untreated sewage pushes the city over earlier; Eco Filters and upgrades buy time.

- **Pollution advice**: the first time pollution reaches **33%** of the limit (`globalRules.pollutionAdviceRatio`), a `☢️ มลพิษสูงแล้ว!` message appears and the Eco Filter demo video auto-plays (it shows the pollution bar climbing past the 33% mark, placing filters via `FILTER [4]`, and the bar falling).
- **After winning**: `CONTINUE` / ✕ on the victory screen keeps the level running (`levelCleared` stops the win from re-firing).

- **City disasters by house count (`engine.scheduleNextDisaster`)**: from the start of the level, each city's disasters strike every **4–5 new houses** (`disasters.everyHouses: [4, 5]`), never the same gap twice in a row (so 4, 5, 4, 5...). Bangkok = High Tide, Tokyo = Earthquake, Rome = Blackout, Amsterdam = random Earthquake / High Tide / Flood. Effects are short (tide & blackout `8s`, flood `10s`). Every earthquake shows a numbered banner (`🌋 แผ่นดินไหวครั้งที่ N!`, 4s), breaks the generators/pumps/filters **and snaps up to 2 random wires**, so later quakes still do damage when buildings are already broken. A flood (10s) makes power, water and sewage flow 15% slower (`FLOOD_FLOW_LOSS`, mild unhappiness, blinking badges); winning is blocked until it recedes. The old day-based tide/blackout/flood and minute-based quake rolls were removed (levels end before they could fire).

### 💀 Lose Conditions
1. **Citizen Complaints**: Reaching the level's maximum complaint limit (`3` strikes in Bangkok, Tokyo, and Rome; **`1` strike = Instant Game Over** in Amsterdam).
2. **Pollution Limit**: City pollution reaches or exceeds the level's maximum threshold.

### 💰 Economy System
- **Instant House Completion Bonus**: Completing a house's utility connections awards **`+$50` immediately**.
- **Weekly Revenue**: At the end of every in-game week (7 days), the city awards **`[Completed Houses] * $40 / week`** (plus base municipal grant).

### 🔌 Wiring Rules (`v1.0.6.1`)
- **Wire length**: up to **`315px`** center-to-center runs at full speed (`globalRules.fastWireLengthPixels`); wires can reach **`790px`** (2.5×, `maxWireLengthPixels`) but every extra `315px` counts as one more series hop (`engine.linkHops`), so long wires carry less. The reach zones always show fixed colours: translucent **green** disc up to `315px` (full speed) and **yellow** ring up to `790px` (slower); dragging past `790px` tints everything **outside** the ring red while green and yellow stay.
- **Hard mode (`engine.hardMode`, toggle `🔥 โหมดยาก` on the briefing/level screen, HUD shows `🔥HARD`)**: removes the 2.5× long wires in every level — every link must fit the `315px` full-speed reach (`engine.maxWireLength()`). Verified winnable in all 4 cities by the bot (2/2 each, human pace + Eco Filters, 0 complaints).
- **Eco Filter cooldown**: `5s` of game time between two Eco Filter placements (`globalRules.airFilterCooldownSeconds`); the `FILTER` button shows `⏳ Ns`.
- **Between levels**: money restarts at each city's `startingBudget`; bought upgrades carry over.
- **Series slowdown**: the first `2` links from a source run at full flow; each extra link loses **25%** (`chainFreeHops`, `chainFlowLossPerHop`), and a 6th link carries nothing. A supplied house with lost flow keeps filling its unhappy bar (blinking utility badge) and eventually complains — *lose condition #2*. Rome's unlimited aqueducts exempt water.
- **Delete**: right-click a wire, or the `🗑️ DELETE [X]` tool (also `Delete` key). Buildings (generators, pumps, filters) **cannot be demolished**.
- **All-connected speedup**: while every house has power, water and sewage, the house spawn timer runs **4× faster** (`globalRules.allConnectedSpawnSpeedup`, not in the tutorial), so players who keep up reach the 15-house win phase sooner.
- **Fixed house layout (`config/<city>.json` → `houseSpawnPoints`)**: the first 15 houses of each city always spawn at designed spots, in order (random spreading spawner after that). Every spot reaches the generator, pump and filter in at most 2 full-speed links (≤ 300px: straight to the building, or through one house that is wired straight in), with no overlapping houses. Layouts were generated by a headless search against each map's water mask (spacing: Bangkok/Rome 115px, Amsterdam 105px, Tokyo 86px with slightly wider map margins because its reachable land is small).
- **Easy-route check (bot playthrough, real game systems)**: wiring each house straight to the buildings (or via one house) and repairing breakdowns wins every city: instant wiring Bangkok 55s / Tokyo 49s / Rome 53s / Amsterdam 66s, no Eco Filter needed. At human pace (4–8s per house) pollution becomes the limit; adding an Eco Filter whenever pollution passes 60% (6–8 filters, money never short) wins all 4 cities in 90–147s.
- **Spread-out spawning**: the spawner collects up to 10 legal spots and picks the one farthest from every existing house/building, so houses spread over both banks instead of clustering.
- **Reachable spawning**: houses (including the 3 starting houses) only spawn where all three utilities can be wired in with **full-speed (≤ `315px`) wires**, directly or through a house chain (`engine.canSupplySpot`); the long slow `790px` reach never counts for spawning. Scene layouts no longer place houses; buildings were compacted in Tokyo/Rome/Amsterdam so a first house fits.

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
| **1. Bangkok** | `Bangkok` | `(0)` None — First Level & Tutorial | **High Tide (`น้ำขึ้น`)**: Every 15 in-game days, river levels surge and riverside equipment requires frequent repair | **ปัญหาน้ำท่วมและระดับน้ำที่เปลี่ยนแปลง** |
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
- **Scenes are laid out like a hand-built level**: every scene also places PNG versions of everything drawn at runtime — the 7 top-bar boxes (`hud_slot_*.png`, city box per scene), logo, day icon, the `DELETE` button (`btn_delete.png`), all 11 toolbar buttons with current labels, and a `house_spot` marker (`house_spot.png`, faded house + dashed ring, instance variable `order`) at every fixed house spawn spot. In game these editor sprites are hidden; the HUD reads button positions from them, and the engine reads the `house_spot` markers as the spawn spots (`engine.readSceneHouseSpots`, overriding `houseSpawnPoints`), so dragging a marker in GDevelop moves that house. Generated by `scripts/generate_story_assets.py ui` and `scripts/generate_assets.py`.
- **Status Badges & Icons (`assets/`)**:
  - `badge_power.png`, `badge_water.png`, `badge_drain.png`, `badge_repair.png` (Broken Equipment Wrench), `icon_day.png`, `icon_night.png`, `logo_powater.png`
- **Toolbar & HUD Sprites (`assets/`)**:
  - `grid_bg.png` (`1280x720`), `hud_bar.png` (`1280x44`), `toolbar_dock.png` (`820x56`, centered, no dividers)
  - 11 Toolbar Buttons (64px wide, 10px gaps, x = `238 + 74*i`; `DELETE` is vector-only, no PNG): `btn_power.png`, `btn_water.png`, `btn_drain.png`, DELETE, `btn_filter.png`, `btn_repair.png`, `btn_special.png` (Disaster Test Lab), `btn_pause.png`, `btn_speed.png`, `btn_upgrade.png`, `btn_guide.png`
  - 8 Feature Video Demo Icons above toolbar buttons: `icon_video_help.png` (`btn_video_help` sprite object, `48x32`)

---

## 5. Project Structure & Build Pipeline

- `POWATER CROPS..json`: Main GDevelop 5 project file containing all 5 scene layouts in order `Tutorial`, `Bangkok`, `Tokyo`, `Rome`, `Amsterdam` (start scene `firstLayout` = `Bangkok`), sprite objects, visual event groups, and compiled JS engine bridge.
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
- `scripts/generate_story_assets.py`: Pillow generator for `assets/Bangkok.jpg` (same art style as the other city maps), the `assets/amigo.png` character, and `assets/logo_powater.png` (team logo, dark variant: blue drop + lightning bolt; `python scripts/generate_story_assets.py logo`).
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

- **`v1.0.8.8` (2026-11-10)**:
  - Earthquake screen shake and snapped wires only on the first quake of a level; later quakes just break the buildings (banner still shown).
- **`v1.0.8.7` (2026-11-10)**:
  - City disasters now every 4–5 new houses (was 1–2).
- **`v1.0.8.6` (2026-11-10)**:
  - Tutorial step 11: bouncing arrow + glow on the coach bar's `✅ เข้าใจแล้ว` button.
- **`v1.0.8.5` (2026-11-10)**:
  - Tutorial now 11 steps: after deleting a wire (step 5) the wire is no longer restored automatically; new step 6 asks the player to reconnect it until houses 1 and 2 are complete again. New bot-example video `rewire`.
- **`v1.0.8.4` (2026-11-10)**:
  - Tutorial now 10 steps: step 6 forces house 3 to be chained from house 2 (building→house-3 wires refused) so its water runs short; new step 7 fixes it by dragging a pipe straight from the pump (the house is fed 2 ways, the shorter path wins). Repair / Eco Filter / complaints moved to 8–10. New bot-example video `chain_fix`. Tutorial ignores hard mode so the long pipe is allowed.
- **`v1.0.8.3` (2026-11-10)**:
  - The bot example is now a video player like the toolbar demos (`ui.showTutorialDemo`): one looping demo per tutorial step (power, water, sewage, chain a house, delete a wire, series slowdown, repair, Eco Filter, complaints) with `◀ ย้อนกลับ` / `ถัดไป ▶` buttons instead of auto-play; the last step's `🎮 เริ่มเล่นเอง` starts the real tutorial. New demo animations `chain`, `delete_wire`, `chain_slow`.
- **`v1.0.8.2` (2026-11-10)**:
  - Houses whose utilities flow too slowly (faded, blinking badges) show a label under them: `🐢 ไฟ/น้ำ/น้ำเสีย ไหลไม่พอ`; tutorial step 6 explains it.
  - Tutorial order: top-bar intro → bot example → the player's tutorial.
- **`v1.0.8.1` (2026-11-10)**:
  - Tutorial points a bouncing red arrow (and glow) at the toolbar button each step uses: POWER/WATER/DRAIN (steps 1-3, and the next missing utility when chaining in 4 & 6), DELETE (5), REPAIR (7), FILTER (8) — `ui.tutorialButtonFor()`.
- **`v1.0.8.0` (2026-11-10)**:
  - Scene `Main` renamed to `Bangkok` and listed 2nd (`Tutorial`, `Bangkok`, `Tokyo`, `Rome`, `Amsterdam`); `firstLayout` keeps Bangkok as the start scene. Updated `sceneName`, scene switching, city box image (`hud_slot_city_bangkok.png`) and the preview patcher (`BangkokCode`).
- **`v1.0.7.9` (2026-11-10)**:
  - Flood is now a mild slowdown (all utilities 15% slower for 10s) instead of breaking riverside equipment.
- **`v1.0.7.8` (2026-11-10)**:
  - Hard-mode toggle text is just `สายไฟสั้นลง`.
  - All on-screen UI exists as PNGs placed in every scene (top-bar boxes, logo, day icon, DELETE button, refreshed toolbar labels) plus `house_spot` markers at each fixed spawn spot; editor-placed markers drive the spawn positions.
- **`v1.0.7.7` (2026-11-10)**:
  - Earthquakes: numbered banner, stronger feedback, and each quake snaps up to 2 wires (repeat quakes used to change nothing when buildings were still broken).
  - Floods now break riverside pumps/filters with an on-screen instruction (repair + wait); previously there was nothing the player could do.
  - HUD intro: removed the second line of the pollution card.
- **`v1.0.7.6` (2026-11-10)**:
  - Tokyo: second building set on the right (east) bank — generator `(1150,470)`, pump `(1090,370)`, filter `(950,520)` — and a new fixed layout with 7 of 15 houses on the right side (spacing 105px).
  - Pollution limit counts every coal plant and every filter site (Tokyo limit 75.4).
  - Hard mode toggle: no 2.5× wires; bot-verified winnable in every city on the first two tries, so no map changes were needed.
- **`v1.0.7.5` (2026-11-10)**:
  - City disasters now strike every 1–2 new houses from the level start (previously day/minute based and never seen in a ~2 min level); durations shortened to 8–10s; briefings/cutscenes updated.
  - Fixed: a stale victory screen closed after a restart marked the new level as already cleared, so it could never be won.
  - Bot playthrough (human pace 4s/house + Eco Filters at 60%, real disasters): 16/16 wins across the 4 cities in 90–117s, 0 complaints.
- **`v1.0.7.4` (2026-11-10)**:
  - Tutorial opens with a top-bar intro (`ui.showHudIntro`): highlights and explains money, houses, goal, pollution and strikes, then `✅ เข้าใจแล้ว เริ่ม Tutorial` starts the steps.
  - Removed the `⏳ จบใน` ETA from the HUD (and `engine.estimateTimeToWin`); the goal pill now reads `🏆 เป้าหมาย n/15 หลัง`.
- **`v1.0.7.3` (2026-11-10)**:
  - Fixed: after winning, `CONTINUE` / ✕ left the game frozen (`isGameWon` stayed true); the level now keeps running.
  - Pollution at 33% of the limit warns once and auto-plays the Eco Filter video; the video was redrawn with a pollution bar that climbs, then drops as filters are placed.
- **`v1.0.7.2` (2026-11-10)**:
  - Reach zones keep fixed colours (green 1x disc, yellow 2.5x ring); only the area outside 2.5x turns red when the drag is too long.
- **`v1.0.7.1` (2026-11-10)**:
  - Spawning only counts full-speed `315px` wires (houses could appear where only a long, slow wire reached, so water never kept up).
  - Tutorial no longer ends early: its 1-house win rule fired after 30s (at step 6) and showed the "play the real level" screen; the win check is now off in tutorial mode.
  - Tutorial houses use fixed spots (`config/tutorial.json` → `houseSpawnPoints`: `(840,280)` next to all buildings, `(1040,290)` only via house 1, `(1130,170)` only via house 2 for the series-slowdown step).
- **`v1.0.7.0` (2026-11-10)**:
  - Removed the minimum win time: supplying the required houses wins the level immediately (still blocked while equipment is broken / a disaster is active). HUD shows `🏆 เป้าหมาย supplied/required หลัง`.
  - Pollution budget horizon: `max(time to reach the required houses − 20s, 60s)` of minimal-city emission (`pollutionMinSurviveSeconds`).
  - Fixed house spawn layouts per city (`houseSpawnPoints`), each with a guaranteed easy wiring solution; verified by a bot playthrough of all 4 cities.
  - Waste filter capacity 12 → 15 (one filter serves the 15 required houses; a 2nd filter formed a separate network the chained houses could not use).
  - Fixed: Retry in Tokyo/Rome/Amsterdam rebuilt Bangkok's building positions (restart deleted the scene objects); each scene's starting buildings are now remembered.
  - New HUD logo `logo_powater.png` (team logo, dark variant).
- **`v1.0.6.9` (2026-11-10)**:
  - Back to the `790px` reach with long-wire slowdown from `v1.0.6.1`, keeping the translucent reach circle (green / orange / red).
  - Eco Filter placement cooldown `5s`.
  - Verified (new test 8e): money resets to each city's starting budget, upgrades carry over between levels.
- **`v1.0.6.8` (2026-11-10)**:
  - Bangkok intro cut from 22 to 10 dialogue pages by dropping whole story paragraphs (none shortened); kept paragraphs 1, 3, 5, 9 via `gameLore.storyIntroParagraphs`. `story/story.txt` is unchanged.
- **`v1.0.6.7` (2026-11-10)**:
  - `maxPollution` is now calculated per city from the pollution rates so a minimal city loses with 20s of the win hold left (after 100–114s of pollution); was a fixed 5.5–7.
- **`v1.0.6.6` (2026-11-10)**:
  - Win hold shortened from 5:00 to **1:20** in all 4 cities.
  - Pollution now starts when the city reaches **5 houses** (was: after 3 minutes); the win hold only counts once pollution is active.
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
