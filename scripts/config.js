// POWATER CORP. v1.0.0.0 - Configuration, Levels, Disasters, Disaster Test Lab, Upgrades & SDG Data
// Implements full specifications from "POWATER IDEA PITCH.pdf" & "POWATER CORP.pdf" (b1.5 -> v1.0 Upgrade)

(function (global) {
  'use strict';

  const CONFIG = {
    VERSION: '1.0.0.0',
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    GRID_SIZE: 32,

    // Core Game Mechanics (POWATER CORP.pdf)
    MAX_COMPLAINTS: 3, // Default: 3 complaints = Game Over (Amsterdam overrides to 1)
    STRIKE_TIMER_SECONDS: 27, // 27 seconds unsupplied = complaint
    GRACE_PERIOD_SECONDS: 120, // 2-minute Protecting Time / Grace Period
    POLLUTION_START_HOUSES: 5, // pollution starts once the city has this many houses
    POLLUTION_WIN_MARGIN_SECONDS: 20, // maxPollution is sized so a minimal city loses with this much win hold left
    POLLUTION_WARN_THRESHOLD: 0.8,

    // Win Condition (POWATER CORP.pdf: บ้าน > 15 หลังมีน้ำและไฟใช้ตลอดเวลาเป็นเวลา 5-7 นาที)
    WIN_REQUIRED_HOUSES: 15, // > 15 houses (15+ complete houses)
    WIN_HOLD_DURATION_SECONDS: 80, // 1:20; counts only once pollution has started, pauses on Repair/Disaster, resets on Complaint

    // Economy (POWATER CORP.pdf: ทำให้บ้าน complete - 50 ทันที, [จำนวน บ้านที่ complete]*40/ต่อสัปดาห์)
    HOUSE_COMPLETE_BONUS: 50, // Instant +50 when a house becomes complete for the first time
    WEEKLY_REVENUE_PER_COMPLETE_HOUSE: 40, // +40 per completed house every week (7 days)
    REVENUE_PER_HAPPY_HOUSE_SEC: 0.8, // Small continuous operational trickle
    MIN_HOUSE_DISTANCE: 100,
    MAX_WIRE_LENGTH: 315, // wire/pipe reach (center to center) = 2.5 x house height (56px) x 2.25
    ALL_CONNECTED_SPAWN_SPEEDUP: 4, // house spawn timer runs this much faster while every house is fully wired
    CHAIN_FREE_HOPS: 2, // links from a source that run at full flow
    CHAIN_FLOW_LOSS_PER_HOP: 0.25, // flow lost per extra link in series (0 flow = not supplied)

    // New Systems (POWATER CORP.pdf)
    REPAIR_CHECK_INTERVAL_SECONDS: 120, // Every 2 minutes (120s)
    REPAIR_BREAKDOWN_CHANCE: 0.30, // 30% chance for pump/equipment to break down
    DAY_DURATION_SECONDS: 60, // Day 1 minute (60s)
    NIGHT_DURATION_SECONDS: 60, // Night 1 minute (60s)
    UPSIZE_BASE_HOUSES: 10, // Upsize every x+10 houses (10, 20, 30, 40)
    UPSIZE_STEP_HOUSES: 10,
    MAX_HOUSES_CAP: 40, // Capped at 40 houses max

    // Disaster Simulation Testing Cost (POWATER CORP. v1.0.4.0)
    DISASTER_TEST_COST: 50, // Cost to simulate an extreme weather disaster

    // Future Feature Plan Roadmap (POWATER CORP.pdf)
    ROADMAP: [
      { version: 'v1.0.0.0', title: 'Global Launch Update', desc: '4 เมืองหลัก (Bangkok, Tokyo, Rome, Amsterdam), ระบบซ่อมบำรุง (Repair), กลางวัน/กลางคืน, ขยายแมพ (Upsize 40 หลัง) และภัยพิบัติสุดขั้ว' },
      { version: 'v1.1.0.0', title: 'Seasonal Update (ฤดูกาล)', desc: 'ระบบฤดูกาลทั้ง 4 ที่ส่งผลต่อปริมาณน้ำฝน พลังงานแสงอาทิตย์ และความต้องการใช้ไฟฟ้าตามฤดูกาล' },
      { version: 'v1.2.0.0', title: 'Save The World Update', desc: 'เพิ่มเมืองใหม่ และระบบปลูกป่าไม้ (Forestry System) เพื่อดูดซับคาร์บอนตามธรรมชาติ' },
      { version: 'v1.3.0.0', title: 'Monopoly Update', desc: 'เพิ่มระบบ Gacha [ตัวละครผู้ช่วย/วิศวกรเฉพาะทาง] และ In-App Purchase เพิ่มความหมายของ In-Game Currency' },
      { version: 'v1.4.0.0', title: 'MMD (Man Made Disaster) Update', desc: 'รับมือภัยพิบัติจากมนุษย์ เช่น ไฟไหม้เมือง (Urban Fire), ภาวะโลกร้อน (Global Warming) และวิกฤตมลพิษอุตสาหกรรม' }
    ],

    POLLUTION_RATES: {
      ELECTRIC_GENERATOR: 0.3,
      AIR_FILTER_REDUCTION: 0.2,
      WASTEWATER_DISCHARGE_PER_HOUSE: 0.05,
      WASTEWATER_OUTLET_BASE: 0.05,
      UNTREATED_SEWAGE_PER_HOUSE: 0.15,
      NATURAL_DILUTION: 0.01
    },

    BUILDINGS: {
      GENERATOR_COAL: {
        id: 'gen_coal',
        objectName: 'generator',
        name: 'Electricity Generator',
        thaiName: 'โรงปั่นไฟมาตรฐาน',
        type: 'generator',
        cost: 30,
        capacity: Infinity,
        pollutionRate: 0.3,
        clean: false,
        canBreakDown: true,
        color: '#ffb703',
        icon: '⚡',
        width: 56,
        height: 56,
        desc: 'จ่ายกระแสไฟฟ้าได้ไม่จำกัด ปล่อยมลภาวะ 0.3 หน่วย/วินาที'
      },
      WATER_PUMP: {
        id: 'water_pump',
        objectName: 'water_pump',
        name: 'Water Pump',
        thaiName: 'เครื่องปั๊มน้ำสะอาด',
        type: 'water_pump',
        cost: 30,
        capacity: 15,
        pollutionRate: 0.0,
        mustBeNearWater: true,
        canBreakDown: true,
        color: '#00b4d8',
        icon: '💧',
        width: 56,
        height: 56,
        desc: 'สูบน้ำสะอาดได้ 15 หลังคาเรือน (มีโอกาส 30% ที่จะเสียทุกๆ 2 นาที ต้องกดซ่อม)'
      },
      WASTE_FILTER: {
        id: 'waste_filter',
        objectName: 'waste_filter',
        name: 'Wastewater Dump & Filter',
        thaiName: 'จุดปล่อยและกรองน้ำเสียริมแม่น้ำ',
        type: 'waste_filter',
        cost: 40,
        capacity: 12,
        pollutionRate: 0.05,
        mustBeNearWater: true,
        canBreakDown: true,
        color: '#7209b7',
        icon: '🧪',
        width: 56,
        height: 56,
        desc: 'จุดระบายน้ำเสียริมแม่น้ำ ลากท่อน้ำเสียจากบ้านมาปล่อยที่นี่ (SDG 6)'
      },
      AIR_FILTER: {
        id: 'air_filter',
        objectName: 'air_filter',
        name: 'River & Eco Filter',
        thaiName: 'เครื่องกรองมลภาวะ (Filter)',
        type: 'air_filter',
        cost: 40,
        capacity: 0,
        pollutionReductionRate: 0.2,
        clean: true,
        mustBeNearWater: false,
        canBreakDown: false,
        color: '#2ec4b6',
        icon: '🍃',
        width: 56,
        height: 56,
        desc: 'ช่วยดูดซับและบำบัดมลภาวะในเมืองและแม่น้ำ ลดมลภาวะ -0.2 หน่วย/วินาที'
      }
    },

    PIPES: {
      POWER: {
        id: 'power',
        name: 'Power Line',
        thaiName: 'สายไฟฟ้า',
        cost: 0,
        color: '#ffb703',
        glowColor: '#ffd166',
        lineWidth: 3,
        offset: -6
      },
      WATER: {
        id: 'water',
        name: 'Clean Water Pipe',
        thaiName: 'ท่อน้ำดี',
        cost: 0,
        color: '#00b4d8',
        glowColor: '#90e0ef',
        lineWidth: 3,
        offset: 0
      },
      SEWAGE: {
        id: 'sewage',
        name: 'Wastewater Pipe',
        thaiName: 'ท่อระบายน้ำเสีย',
        cost: 0,
        color: '#9d4edd',
        glowColor: '#c77dff',
        lineWidth: 3,
        offset: 6
      }
    },

    UPGRADES: {
      ELECTRICITY_CAPACITY: {
        id: 'elec_cap',
        name: 'ELECTRICITY +20% FASTER',
        thaiName: 'ประสิทธิภาพไฟฟ้า +20%',
        desc: '+20% Generator transmission efficiency & reliability',
        icon: '⚡',
        baseCost: 10,
        costMult: 1.8,
        maxLevel: 5,
        bonusPerLevel: 0.20
      },
      POLLUTION_REDUCTION: {
        id: 'poll_red',
        name: 'POLLUTION -5%',
        thaiName: 'ลดมลภาวะ -5%',
        desc: '-5% to all pollution emissions (Max Lv. 10)',
        icon: '☢️',
        baseCost: 100,
        costMult: 1.5,
        maxLevel: 10,
        bonusPerLevel: 0.05
      },
      WATER_PUMP_CAPACITY: {
        id: 'water_cap',
        name: 'WATER PUMP +20% FASTER',
        thaiName: 'ปั๊มน้ำแรงดันสูง +20%',
        desc: '+20% Water Pump volume & capacity (Max Lv. 5)',
        icon: '💧',
        baseCost: 10,
        costMult: 1.8,
        maxLevel: 5,
        bonusPerLevel: 0.20
      },
      WASTE_FILTER_CAPACITY: {
        id: 'waste_cap',
        name: 'WASTEWATER FILTER +25%',
        thaiName: 'ถังบำบัดน้ำเสีย +25%',
        desc: '+25% Wastewater Filter treatment capacity (Max Lv. 5)',
        icon: '🧪',
        baseCost: 25,
        costMult: 1.6,
        maxLevel: 5,
        bonusPerLevel: 0.25
      }
    },
    REPAIR_COST_PER_BUILDING: 0,
    RIVER_CROSSING_EXTRA_COST: 0,

    // Fast Interactive Scene Tutorial Configuration
    TUTORIAL_LEVEL: {
      id: 'tutorial',
      sceneName: 'Tutorial',
      name: '0. Fast Scene Tutorial',
      thaiName: 'โหมดฝึกสอนด่วน (Fast Interactive Tutorial - 30 วินาที)',
      briefing: 'เรียนรู้ระบบทั้งหมดของ POWATER CORP. v1.0.0.0 ใน 4 ขั้นตอนสั้นๆ เพียง 30 วินาที พร้อมปุ่มวิดีโอสาธิต [▶] เหนือปุ่มเครื่องมือทุกปุ่ม!',
      riverName: 'Chao Phraya Practice Canal',
      startingBudget: 300,
      maxPollution: 10.0,
      maxComplaints: 99,
      goalDays: 5,
      targetHousesServed: 1,
      spawnInterval: 999999,
      riverPath: [
        { x: 610, y: 0 },
        { x: 650, y: 180 },
        { x: 570, y: 360 },
        { x: 690, y: 540 },
        { x: 650, y: 720 }
      ],
      riverWidth: 100
    },

    // Feature Video Demonstrations triggered by clicking the [▶] icon above each toolbar button
    FEATURE_VIDEOS: {
      lose_pollution: {
        id: 'lose_pollution',
        title: '🎬 ตัวอย่างการแพ้ 1/2: มลภาวะเกินขีดจำกัด',
        subtitle: 'โรงปั่นไฟและน้ำเสียปล่อยมลภาวะทุกวินาที ถ้าหลอด ☢️ เต็ม = Game Over ทันที',
        steps: [
          '1. เมื่อมีบ้านครบ 5 หลัง มลภาวะเริ่มนับ: โรงปั่นไฟ +0.3/วิ, น้ำเสียที่ไม่มีท่อระบาย +0.15/วิ/หลัง',
          '2. ถ้าปล่อยไว้ หลอด ☢️ ด้านบนจะเต็มจนถึงขีดจำกัดของด่าน',
          '3. ป้องกัน: วางเครื่องกรองอากาศ [4] (-0.2/วิ) ต่อท่อน้ำเสียทุกบ้าน และอัปเกรดลดมลภาวะ'
        ],
        useAction: { type: 'video', value: 'lose_complaint', label: '▶ วิดีโอถัดไป: แพ้เพราะถูกร้องเรียน' }
      },
      lose_complaint: {
        id: 'lose_complaint',
        title: '🎬 ตัวอย่างการแพ้ 2/2: ประชาชนร้องเรียนครบ 3 ครั้ง',
        subtitle: 'บ้านที่ขาดไฟ/น้ำ/ท่อน้ำเสีย หรืออยู่ปลายสายพ่วงยาวๆ จะเติมไม่ทันและร้องเรียน',
        steps: [
          '1. ต่อพ่วงบ้านต่อกันยิ่งยาว ไฟและน้ำยิ่งไหลช้า (ตั้งแต่ทอดที่ 3 ลดลงทีละ 25%)',
          '2. บ้านปลายสายเติมไม่ทัน แถบความไม่พอใจเต็ม = ร้องเรียน 1 Strike และ Win Timer รีเซ็ต',
          '3. ครบ 3 Strike (Amsterdam 1) = Game Over! แก้: สร้างโรงไฟฟ้า/ปั๊ม/ถังบำบัดใกล้บ้านเพื่อตัดสายพ่วงให้สั้นลง'
        ],
        useAction: { type: 'action', value: 'startBangkok', label: '🚀 เข้าใจแล้ว เริ่มด่าน Bangkok' }
      },
      power: {
        id: 'power',
        title: '🎬 วิดีโอสาธิต: การเชื่อมสายไฟฟ้า (Manhattan 45° Power Line)',
        subtitle: 'ลากสายไฟจากโรงปั่นไฟไปยังบ้าน หรือพ่วงจากบ้านสู่บ้าน (ฟรี $0)',
        steps: [
          '1. คลิกปุ่ม POWER [1] หรือคลิกที่โรงปั่นไฟโดยตรง',
          '2. ลากสายไฟ (เลี้ยวโค้ง 45° สองจังหวะแบบ Manhattan) ไปยังบ้านเรือน',
          '3. สามารถลากสายพ่วงจากบ้านหลังที่ 1 ไปยังบ้านหลังอื่นๆ ได้ไม่จำกัด!'
        ],
        useAction: { type: 'tool', value: 'power', label: '⚡ เลือกเครื่องมือสายไฟ (USE POWER)' }
      },
      water: {
        id: 'water',
        title: '🎬 วิดีโอสาธิต: การสูบน้ำสะอาด & โบนัส +$50 ทันที',
        subtitle: 'สูบน้ำจากแม่น้ำส่งให้บ้านเรือน เมื่อบ้านครบสมบูรณ์รับทันที +$50 และ +$40/สัปดาห์',
        steps: [
          '1. คลิกปุ่ม WATER [2] หรือคลิกที่เครื่องปั๊มน้ำริมแม่น้ำ',
          '2. ลากท่อน้ำดีสีฟ้าไปยังบ้านเรือนเพื่อส่งน้ำสะอาด (SDG 6)',
          '3. เมื่อบ้านได้รับครบทั้งไฟ น้ำ และท่อน้ำเสีย จะได้รับเงิน +$50 ทันที!'
        ],
        useAction: { type: 'tool', value: 'water', label: '💧 เลือกเครื่องมือท่อน้ำดี (USE WATER)' }
      },
      sewage: {
        id: 'sewage',
        title: '🎬 วิดีโอสาธิต: การระบายน้ำเสีย (Wastewater Drainage)',
        subtitle: 'ป้องกันน้ำเสียเอ่อล้นและลดมลภาวะโดยลากท่อม่วงไปยังจุดปล่อยน้ำเสียริมน้ำ',
        steps: [
          '1. บ้านที่ได้รับน้ำสะอาดจะผลิตน้ำเสียขึ้นมา (ขึ้นไอคอนหยดน้ำสีม่วง)',
          '2. คลิกปุ่ม DRAIN [3] แล้วลากท่อสีม่วงจากบ้านไปยังถังบำบัดน้ำเสียริมแม่น้ำ',
          '3. ช่วยป้องกันไม่ให้ประชาชนร้องเรียนและรับโบนัสบ้าน Complete +$50!'
        ],
        useAction: { type: 'tool', value: 'sewage', label: '🧪 เลือกเครื่องมือท่อระบายน้ำ (USE DRAIN)' }
      },
      air_filter: {
        id: 'air_filter',
        title: '🎬 วิดีโอสาธิต: เครื่องกรองมลภาวะ (Eco & River Filter)',
        subtitle: 'เทคโนโลยีสะอาด: ลดมลภาวะในเมืองและแม่น้ำอัตโนมัติ -0.2 หน่วย/วินาที',
        steps: [
          '1. เมื่อมีบ้านครบ 5 หลัง ระบบมลภาวะจะเริ่มทำงานจากโรงปั่นไฟและน้ำเสีย',
          '2. คลิกปุ่ม FILTER [4] แล้วคลิกวางเครื่องกรองมลภาวะบนพื้นที่ว่าง ($40)',
          '3. เครื่องกรองจะทำงานอัตโนมัติทันทีโดยไม่ต้องต่อสาย ช่วยลดมลพิษ -0.2/วินาที!'
        ],
        useAction: { type: 'tool', value: 'build_air_filter', label: '🍃 เลือกสร้างเครื่องกรองมลภาวะ (USE FILTER)' }
      },
      repair: {
        id: 'repair',
        title: '🎬 วิดีโอสาธิต: เครื่องมือซ่อมบำรุง (Repair Tool & Disasters)',
        subtitle: 'ระบบซ่อมแซมรายจุด: คลิกที่อุปกรณ์ที่เสียโดยตรง หรือกดปุ่ม REPAIR [R] เพื่อใช้เครื่องมือซ่อม',
        steps: [
          '1. เมื่อเครื่องปั๊มหรือโรงปั่นไฟขัดข้อง จะขึ้นวงแหวนสีแดงและไอคอนประแจ (Win Timer จะหยุดชั่วคราว)',
          '2. คลิกที่ตัวอาคารที่ชำรุดโดยตรง หรือกดปุ่ม REPAIR [R] เพื่อเข้าโหมดซ่อมแล้วคลิกซ่อมรายจุด',
          '3. เมื่อซ่อมแซมเสร็จสิ้น ระบบน้ำและไฟจะกลับมาจ่ายตามปกติและเวลาชนะจะเดินต่อ!'
        ],
        useAction: { type: 'tool', value: 'repair', label: '🔧 เลือกเครื่องมือซ่อมแซม (USE REPAIR TOOL)' }
      },
      special: {
        id: 'special',
        title: '🎬 วิดีโอสาธิต: ศูนย์จำลองและทดสอบภัยพิบัติ (Disaster Simulation Lab)',
        subtitle: 'ใช้งบประมาณเทศบาล ($50 / ครั้ง) จำลองสภาพอากาศสุดขั้วเพื่อทดสอบระบบเมือง',
        steps: [
          '1. คลิกปุ่ม TEST [I] ด้านล่างเพื่อเปิดศูนย์จำลองและทดสอบภัยพิบัติ',
          '2. เลือกระบบทดสอบน้ำขึ้น แผ่นดินไหว ไฟดับ หรือน้ำท่วม โดยมีค่าทดสอบครั้งละ $50',
          '3. สังเกตจุดที่โครงข่ายน้ำและไฟอาจชำรุด เพื่อวางแผนรับมือภัยพิบัติจริงได้อย่างแม่นยำ!'
        ],
        useAction: { type: 'action', value: 'openSpecialItems', label: '⚠️ เปิดศูนย์ทดสอบภัยพิบัติ (OPEN DISASTER LAB)' }
      },
      upgrades: {
        id: 'upgrades',
        title: '🎬 วิดีโอสาธิต: ศูนย์อัปเกรดนวัตกรรม (Upgrade Center)',
        subtitle: 'อัปเกรดกำลังส่งไฟฟ้า +20%, ลดมลภาวะ -5%, และเพิ่มความจุปั๊มน้ำ +20%',
        steps: [
          '1. สะสมเงินจากโบนัสบ้าน Complete (+$50) และรายได้รายสัปดาห์ (บ้านละ $40)',
          '2. คลิกปุ่ม UPGRADE [U] เพื่อเปิดหน้าต่างอัปเกรดเทคโนโลยีเมือง',
          '3. อัปเกรดปั๊มน้ำเพื่อรองรับบ้านได้มากขึ้นเมื่อแมพขยาย (Upsize สูงสุด 40 หลัง)!'
        ],
        useAction: { type: 'action', value: 'openUpgrades', label: '🔧 เปิดหน้าต่างอัปเกรด (OPEN UPGRADES)' }
      },
      sdgs: {
        id: 'sdgs',
        title: '🎬 วิดีโอสาธิต: เป้าหมาย SDGs, Easter Egg ป่าไม้ & แผนงาน Roadmap',
        subtitle: 'เป้าหมายความยั่งยืน: SDG 6 น้ำสะอาด, SDG 7 พลังงานสะอาด และ SDG 15 Easter Egg ป่าไม้',
        steps: [
          '1. การบริหารเมืองของคุณ Amigo ตอบสนองเป้าหมาย SDG 6 (น้ำสะอาด) และ SDG 7 (พลังงานสะอาด 0% มลพิษ)',
          '2. ค้นพบความลับ Easter Egg: SDG 15 (Life on Land) บันทึกผืนป่าของ Amigo เมื่อรักษาระบบนิเวศและสิ่งแวดล้อม',
          '3. ตรวจสอบระดับการขยายเมือง (Upsize สูงสุด 40 หลัง) และ Roadmap การพัฒนาเมืองอย่างยั่งยืนได้ที่นี่!'
        ],
        useAction: { type: 'action', value: 'openSdgs', label: '🎯 ดูข้อมูล SDGs & Roadmap' }
      },
      guide: {
        id: 'guide',
        title: '🎬 วิดีโอสาธิต: เงื่อนไขการชนะ 1:20 นาที (Win Timer) & โหมดฝึกสอน',
        subtitle: 'ดูแลบ้าน > 15 หลังให้มีน้ำและไฟครบ 1:20 นาที (Pause เมื่อต้องซ่อม, Reset เมื่อถูกร้องเรียน)',
        steps: [
          '1. เมื่อมีบ้านที่ได้รับน้ำและไฟมากกว่า 15 หลัง เวลาสะสมชัยชนะ (🏆 WIN: 01:20) จะเริ่มเดิน (หลังมลภาวะเริ่มนับแล้ว)',
          '2. หากอุปกรณ์เสียหรือเกิดภัยพิบัติ เวลาจะหยุดรอ (PAUSED) แต่หากถูกร้องเรียน เวลาจะรีเซ็ตเป็น 00:00!',
          '3. คุณสามารถกดเริ่ม "โหมดฝึกสอนด่วน (Fast Scene Tutorial)" ได้จากหน้าต่างนี้ทุกเมื่อ!'
        ],
        useAction: { type: 'action', value: 'startFastTutorial', label: '🎓 เริ่มโหมดฝึกสอนด่วน (START FAST TUTORIAL)' }
      }
    },

    // v1.0 - 4 Levels (Bangkok, Tokyo, Rome, Amsterdam) per POWATER CORP.pdf
    LEVELS: [
      {
        id: 'bangkok',
        sceneName: 'Main',
        name: '1. Bangkok, Thailand',
        thaiName: 'ด่าน 1: กรุงเทพมหานคร (Tutorial & High Tide)',
        cityChallenge: 'กรุงเทพมหานครเผชิญกับปัญหาน้ำท่วมและระดับน้ำที่เปลี่ยนแปลง',
        briefing: 'ภารกิจของคุณ Amigo: บริหารจัดการระบบน้ำและพลังงานของกรุงเทพมหานคร เชื่อมต่อเครือข่าย Node ให้ประชาชนเข้าถึงสาธารณูปโภคอย่างทั่วถึง\nความท้าทายธรรมชาติ: ทุกๆ 15 วันในเกมจะเกิดน้ำขึ้น (High Tide) ส่งผลให้อุปกรณ์ริมแม่น้ำเจ้าพระยาชำรุดและต้องการการซ่อมแซมบ่อยขึ้น!\nเป้าหมายชนะ: ดูแลบ้าน > 15 หลังให้มีน้ำและไฟใช้ต่อเนื่อง 1:20 นาที!',
        conditionPlus: 'ไม่มีเงื่อนไขลบ (ด่านเริ่มต้นและฝึกสอน Tutorial)',
        conditionMinus: 'Extreme Weather: น้ำขึ้นทุกๆ 15 วัน ทำให้อุปกรณ์ริมแม่น้ำเสียและต้องกดซ่อมบ่อยขึ้น',
        amigoQuote: 'ผมจะเชื่อมไฟ น้ำ และท่อน้ำเสียให้ครบทุกบ้าน บ้านที่สมบูรณ์ให้โบนัสทันที +$50 และรายได้รายสัปดาห์ +$40 แต่ต้องระวังน้ำขึ้นทุก 15 วัน!',
        riverName: 'Chao Phraya River (แม่น้ำเจ้าพระยา)',
        leftSideLabel: 'ฝั่งธนบุรี (Thonburi)',
        rightSideLabel: 'ฝั่งกรุงเทพ (Bangkok)',
        startingBudget: 150,
        maxPollution: 6.0,
        maxComplaints: 3,
        goalDays: 15,
        targetHousesServed: 15,
        spawnInterval: 18000,
        cleanEnergyDiscount: 0.0,
        buildCostDiscount: 0.0,
        unlimitedWaterChain: false,
        hasHighTide: true,
        hasEarthquake: false,
        hasBlackout: false,
        hasFlood: false,
        riverPath: [
          { x: 610, y: 0 },
          { x: 650, y: 180 },
          { x: 570, y: 360 },
          { x: 690, y: 540 },
          { x: 650, y: 720 }
        ],
        riverWidth: 100
      },
      {
        id: 'tokyo',
        sceneName: 'Tokyo',
        name: '2. Tokyo, Japan',
        thaiName: 'ด่าน 2: โตเกียว (Clean Energy & Earthquake)',
        cityChallenge: 'โตเกียวต้องเตรียมรับมือกับแผ่นดินไหวและความเสียหายของโครงสร้างพื้นฐาน',
        briefing: 'ภารกิจของคุณ Amigo: รัฐบาลสนับสนุนงบประมาณพัฒนาเมืองยั่งยืน ลดราคาฟิลเตอร์บำบัดมลภาวะ Clean Energy (Eco Filter) ลง 25% (เหลือ $30)!\nความท้าทายธรรมชาติ: แผ่นดินไหว (Earthquake) โอกาส 10-15% ทุกๆ 1 นาทีหลังหมดเวลาเตรียมพร้อม (และบังคับเกิดที่นาทีที่ 5) ส่งผลให้อุปกรณ์ปั๊มน้ำและเครื่องปั่นไฟทุกเครื่องเสียหายพร้อมกัน!',
        conditionPlus: '(+) รัฐบาลสนับสนุน Clean Energy: Eco Filter ลดราคา 25% (เหลือ $30)',
        conditionMinus: '(-) แผ่นดินไหว (Earthquake): อุปกรณ์น้ำและไฟทุกเครื่องพังพร้อมกัน ต้องส่งทีมซ่อมรายจุดทันที!',
        amigoQuote: 'รัฐบาลโตเกียวอุดหนุน Eco Filter 25% ถ้าเกิดแผ่นดินไหว ผมต้องคลิกอาคารที่เสีย หรือใช้ REPAIR [R] ซ่อมทีละจุดให้เร็วที่สุด!',
        riverName: 'Sumida River (แม่น้ำสุมิดะ)',
        leftSideLabel: 'Chuo / Taito',
        rightSideLabel: 'Sumida / Koto',
        startingBudget: 180,
        maxPollution: 7.0,
        maxComplaints: 3,
        goalDays: 20,
        targetHousesServed: 15,
        spawnInterval: 16000,
        cleanEnergyDiscount: 0.25,
        buildCostDiscount: 0.0,
        unlimitedWaterChain: false,
        hasHighTide: false,
        hasEarthquake: true,
        hasBlackout: false,
        hasFlood: false,
        riverPath: [
          { x: 560, y: 0 },
          { x: 580, y: 240 },
          { x: 540, y: 480 },
          { x: 610, y: 720 }
        ],
        riverWidth: 85
      },
      {
        id: 'rome',
        sceneName: 'Rome',
        name: '3. Rome, Italy',
        thaiName: 'ด่าน 3: โรม อิตาลี (Unlimited Aqueducts & Blackout)',
        cityChallenge: 'โรมต้องบริหารระบบสาธารณูปโภคที่มีข้อจำกัดด้านความต่อเนื่องของพลังงาน',
        briefing: 'ภารกิจของคุณ Amigo: บริหารเมืองประวัติศาสตร์ที่มีระบบท่อส่งน้ำโรมันอันยอดเยี่ยม (ต่อท่อน้ำจากบ้านสู่บ้านได้ไม่จำกัด!)\nความท้าทายพลังงาน: โรมเผชิญกับข้อจำกัดความต่อเนื่องของพลังงาน มีโอกาสเกิดไฟดับครั้งใหญ่ (Blackout 12.5% ทุก 15 วัน) ส่งผลให้ไฟฟ้าขัดข้องชั่วคราวและ Win Timer หยุดเดิน!',
        conditionPlus: '(+) ระบบท่อส่งน้ำโรมันชั้นเยี่ยม ต่อท่อน้ำจากบ้านต่อบ้านได้ไม่จำกัดความจุ',
        conditionMinus: '(-) โอกาสไฟดับชั่วคราวทุก 15 วัน (12.5%) ส่งผลให้ไฟฟ้าดับและ Win Timer หยุดเดินชั่วคราว',
        amigoQuote: 'Benvenuti a Roma! ท่อส่งน้ำโรมันโบราณยังทรงพลัง แต่ไฟฟ้ามักขัดข้อง ผมต้องวางโครงข่ายให้พร้อมรับไฟดับชั่วคราว',
        riverName: 'Tiber River (แม่น้ำไทเบอร์)',
        leftSideLabel: 'Trastevere & Vatican',
        rightSideLabel: 'Centro Storico & Colosseo',
        startingBudget: 200,
        maxPollution: 5.5,
        maxComplaints: 3,
        goalDays: 25,
        targetHousesServed: 15,
        spawnInterval: 17000,
        cleanEnergyDiscount: 0.0,
        buildCostDiscount: 0.0,
        unlimitedWaterChain: true,
        hasHighTide: false,
        hasEarthquake: false,
        hasBlackout: true,
        hasFlood: false,
        riverPath: [
          { x: 730, y: 0 },
          { x: 530, y: 220 },
          { x: 750, y: 440 },
          { x: 500, y: 600 },
          { x: 580, y: 720 }
        ],
        riverWidth: 75
      },
      {
        id: 'amsterdam',
        sceneName: 'Amsterdam',
        name: '4. Amsterdam, Netherlands',
        thaiName: 'ด่าน 4: อัมสเตอร์ดัม (ด่านยากที่สุดของเกม - Extreme Flood)',
        cityChallenge: 'อัมสเตอร์ดัมต้องรักษาสมดุลของระบบเมืองที่พัฒนาไปจนเกือบเต็มศักยภาพ พร้อมรับมือกับภัยพิบัติทางธรรมชาติ',
        briefing: 'ภารกิจของคุณ Amigo: บททดสอบสูงสุดของการบริหารเมืองยั่งยืน! เมืองอิ่มตัวและพัฒนาจนเกือบเต็มศักยภาพ (บ้านเกิดช้าลง 20%, ลดค่าก่อสร้าง 5%)\nความท้าทายเข้มงวด: ประชาชนรับไม่ได้กับความผิดพลาด (ถูกร้องเรียนแม้แต่ครั้งเดียว = Game Over ทันที!) แถมต้องเผชิญทั้งแผ่นดินไหว น้ำขึ้น และน้ำท่วมใหญ่ Amstel Canal ทุก 28 วัน!',
        conditionPlus: '(+) ลดค่าก่อสร้าง 5% และบ้านเกิดช้าลง 20%',
        conditionMinus: '(-) ห้ามถูกร้องเรียนเด็ดขาด (1 ร้องเรียน = Game Over) + น้ำท่วมใหญ่ทุก 28 วัน!',
        amigoQuote: 'บททดสอบสุดท้ายของผม! Zero Complaint Tolerance ห้ามมีการร้องเรียนแม้แต่ครั้งเดียว และเมืองต้องยืดหยุ่นต่อภัยพิบัติทุกรูปแบบ',
        riverName: 'Amstel Canal (คลองอัมสเทล)',
        leftSideLabel: 'Jordaan & West Canal',
        rightSideLabel: 'Centrum & Oosterdok',
        startingBudget: 240,
        maxPollution: 6.0,
        maxComplaints: 1, // Instant Game Over on 1st complaint!
        goalDays: 28,
        targetHousesServed: 15,
        spawnInterval: 21600, // 20% slower house spawning
        cleanEnergyDiscount: 0.05,
        buildCostDiscount: 0.05,
        unlimitedWaterChain: false,
        hasHighTide: true,
        hasEarthquake: true,
        hasBlackout: false,
        hasFlood: true,
        riverPath: [
          { x: 640, y: 0 },
          { x: 580, y: 240 },
          { x: 670, y: 480 },
          { x: 610, y: 720 }
        ],
        riverWidth: 90
      }
    ],

    SDGS: [
      {
        number: 6,
        title: 'Clean Water and Sanitation',
        thaiTitle: 'น้ำสะอาดและสุขาภิบาล',
        color: '#26bde2',
        icon: '🚰',
        quote: 'การจัดการน้ำสะอาดและระบบสุขาภิบาล เพื่อให้ประชาชนทุกครัวเรือนเข้าถึงน้ำที่มีคุณภาพ',
        desc: 'สูบน้ำสะอาดริมแม่น้ำส่งให้ประชาชน และสร้างจุดบำบัดน้ำเสียริมน้ำเพื่อป้องกันมลพิษ'
      },
      {
        number: 7,
        title: 'Affordable and Clean Energy',
        thaiTitle: 'พลังงานสะอาดที่เข้าถึงได้',
        color: '#fcc30b',
        icon: '⚡',
        quote: 'การส่งเสริมพลังงานสะอาดและการเข้าถึงไฟฟ้าอย่างทั่วถึง เพื่อให้ประชาชนทุกคนมีพลังงานไฟฟ้าใช้อย่างยั่งยืน',
        desc: 'ส่งเสริมการจัดการระบบโครงข่ายไฟฟ้าที่มีเสถียรภาพ เพื่อให้ประชาชนทุกครัวเรือนเข้าถึงพลังงานได้อย่างทั่วถึง'
      },
      {
        number: 15,
        title: 'Life on Land',
        thaiTitle: 'ระบบนิเวศบนบก (Easter Egg / Mini-Achievement)',
        color: '#56ab2f',
        icon: '🌱',
        isEasterEgg: true,
        quote: 'การอนุรักษ์ป่าไม้และระบบนิเวศบนบก ลดผลกระทบจากการขยายตัวของเมือง และรักษาสมดุลระหว่างการพัฒนาเมืองกับธรรมชาติ',
        desc: '✨ Easter Egg & Achievement: รักษาระดับมลภาวะให้ต่ำหรือติดตั้ง Eco Filter เพื่อปลดล็อกเรื่องสั้นบันทึกธรรมชาติ',
        shortStory: '📖 บันทึกผืนป่าของ Amigo (Amigo\'s Forest Chronicle):\n"ในขณะที่เมืองขยายตัว Amigo เตือนตัวเองเสมอว่า ตึกรามสร้างใหม่ได้ แต่ผืนป่าและระบบนิเวศหากสูญสิ้นมิอาจฟื้นคืนได้ง่ายดาย... การที่คุณใส่ใจไม่ปล่อยมลพิษลงผืนดินและแม่น้ำ ทำให้เหล่านกและต้นไม้ดั้งเดิมยังคงเบ่งบานเคียงคู่มหานครอย่างยั่งยืน"'
      }
    ],

    DISASTERS: {
      HIGH_TIDE: { everyNDays: 15, durationSeconds: 25.0, riversideBreakChance: 0.50 },
      EARTHQUAKE: { checkEverySeconds: 60.0, baseChance: 0.125, escalateAfterMinutes: 3, escalateBonusPerMinute: 0.05, guaranteedAtMinute: 5 },
      BLACKOUT: { everyNDays: 15, chance: 0.125, durationSeconds: 25.0 },
      FLOOD: { everyNDays: 28, maxDurationSecondsBeforeGameOver: 120.0 }
    },
    DAY_DURATION_IN_GAME_SECONDS: 15.0,
    WEEKLY_BASE_GRANT: 40,

    // Core Concept & World Background (POWATER CORP.)
    GAME_LORE: {
      role: 'Amigo TheGOATHimself — นักธุรกิจเพื่อสิ่งแวดล้อมระดับโลก (ตัวละครหลักที่ผู้เล่นสวมบทบาท, story/story.txt)',
      background: 'The Urban Sustainability Crisis: เมืองขนาดใหญ่ทั่วโลกเติบโตอย่างรวดเร็ว ประชากรเพิ่มขึ้น โครงสร้างพื้นฐานเสื่อมสภาพ สภาพภูมิอากาศเปลี่ยนแปลง และความต้องการพลังงานสูงขึ้นอย่างต่อเนื่อง',
      concept: 'ผู้เล่นสวมบทบาทเป็น Amigo TheGOATHimself นักธุรกิจผู้มองเห็นคุณค่าของธรรมชาติเหนือผลกำไร ได้รับเชิญจากรัฐบาลทั่วโลกให้วางระบบน้ำและพลังงานให้ประชาชนเข้าถึงสาธารณูปโภคขั้นพื้นฐานได้อย่างทั่วถึง แต่การบริหารเมืองไม่ได้จบลงเพียงแค่การทำให้ทุกบ้านมีน้ำและไฟใช้ เพราะทุกการตัดสินใจมีต้นทุน ทุกโครงการมีผลกระทบต่อสิ่งแวดล้อม และทุกความผิดพลาดส่งผลต่อคุณภาพชีวิตของประชาชน เป้าหมายสูงสุดไม่ใช่การสร้างเมืองที่ใหญ่ที่สุด แต่คือการสร้างเมืองที่สามารถเติบโตได้อย่างยั่งยืน'
    }
  };

  function applyStageEntry(targetLvl, override) {
    if (!targetLvl || !override || typeof override !== 'object') return;
    if (typeof override.startingBudget === 'number') targetLvl.startingBudget = override.startingBudget;
    if (typeof override.houseSpawnIntervalSeconds === 'number') targetLvl.spawnInterval = Math.round(override.houseSpawnIntervalSeconds * 1000);
    if (typeof override.pollutionMultiplier === 'number') targetLvl.pollutionMultiplier = override.pollutionMultiplier;
    if (typeof override.maxPollution === 'number') targetLvl.maxPollution = override.maxPollution;
    if (typeof override.maxComplaints === 'number') targetLvl.maxComplaints = override.maxComplaints;
    if (typeof override.winRequiredHouses === 'number') targetLvl.winRequiredHouses = override.winRequiredHouses;
    if (typeof override.winHoldDurationSeconds === 'number') targetLvl.winHoldDurationSeconds = override.winHoldDurationSeconds;
    if (typeof override.maxHousesCap === 'number') targetLvl.maxHousesCap = override.maxHousesCap;
    if (typeof override.cleanEnergyDiscount === 'number') targetLvl.cleanEnergyDiscount = override.cleanEnergyDiscount;
    if (typeof override.buildCostDiscount === 'number') targetLvl.buildCostDiscount = override.buildCostDiscount;
    if (typeof override.unlimitedWaterChain === 'boolean') targetLvl.unlimitedWaterChain = override.unlimitedWaterChain;
    if (Array.isArray(override.cutscene)) targetLvl.cutscene = override.cutscene;
    if (typeof override.hasHighTide === 'boolean') targetLvl.hasHighTide = override.hasHighTide;
    if (typeof override.hasEarthquake === 'boolean') targetLvl.hasEarthquake = override.hasEarthquake;
    if (typeof override.hasBlackout === 'boolean') targetLvl.hasBlackout = override.hasBlackout;
    if (typeof override.hasFlood === 'boolean') targetLvl.hasFlood = override.hasFlood;
    if (override.featureCostOverrides && typeof override.featureCostOverrides === 'object') {
      targetLvl.featureCostOverrides = Object.assign({}, targetLvl.featureCostOverrides || {}, override.featureCostOverrides);
    }
  }

  // Apply external config/global.json and config/<stage>.json overrides into CONFIG
  function applyStageConfig(stageCfg) {
    if (!stageCfg || typeof stageCfg !== 'object') return;

    // 0. If this is a single-stage JSON file (e.g., config/bangkok.json) with an "id" field
    if (typeof stageCfg.id === 'string' && !stageCfg.globalRules && !stageCfg.featureCosts) {
      if (stageCfg.id === 'tutorial' && CONFIG.TUTORIAL_LEVEL) {
        applyStageEntry(CONFIG.TUTORIAL_LEVEL, stageCfg);
      } else if (Array.isArray(CONFIG.LEVELS)) {
        for (let i = 0; i < CONFIG.LEVELS.length; i++) {
          if (CONFIG.LEVELS[i] && CONFIG.LEVELS[i].id === stageCfg.id) {
            applyStageEntry(CONFIG.LEVELS[i], stageCfg);
          }
        }
      }
      if (global.POWATER && global.POWATER.game && typeof global.POWATER.game.reloadStageConfig === 'function') {
        global.POWATER.game.reloadStageConfig();
      }
      return;
    }

    // 1. Global Rules
    const gr = stageCfg.globalRules;
    if (gr && typeof gr === 'object') {
      if (typeof gr.dayDurationSeconds === 'number') CONFIG.DAY_DURATION_IN_GAME_SECONDS = gr.dayDurationSeconds;
      if (typeof gr.dayCycleDurationSeconds === 'number') CONFIG.DAY_DURATION_SECONDS = gr.dayCycleDurationSeconds;
      if (typeof gr.nightCycleDurationSeconds === 'number') CONFIG.NIGHT_DURATION_SECONDS = gr.nightCycleDurationSeconds;
      if (typeof gr.protectingTimeSeconds === 'number') CONFIG.GRACE_PERIOD_SECONDS = gr.protectingTimeSeconds;
      if (typeof gr.pollutionStartHouses === 'number') CONFIG.POLLUTION_START_HOUSES = gr.pollutionStartHouses;
      if (typeof gr.pollutionWinMarginSeconds === 'number') CONFIG.POLLUTION_WIN_MARGIN_SECONDS = gr.pollutionWinMarginSeconds;
      if (typeof gr.complaintStrikeTimerSeconds === 'number') CONFIG.STRIKE_TIMER_SECONDS = gr.complaintStrikeTimerSeconds;
      if (typeof gr.defaultMaxComplaints === 'number') CONFIG.MAX_COMPLAINTS = gr.defaultMaxComplaints;
      if (typeof gr.winRequiredHouses === 'number') CONFIG.WIN_REQUIRED_HOUSES = gr.winRequiredHouses;
      if (typeof gr.winHoldDurationSeconds === 'number') CONFIG.WIN_HOLD_DURATION_SECONDS = gr.winHoldDurationSeconds;
      if (typeof gr.houseCompleteInstantBonus === 'number') CONFIG.HOUSE_COMPLETE_BONUS = gr.houseCompleteInstantBonus;
      if (typeof gr.weeklyRevenuePerCompleteHouse === 'number') CONFIG.WEEKLY_REVENUE_PER_COMPLETE_HOUSE = gr.weeklyRevenuePerCompleteHouse;
      if (typeof gr.weeklyBaseMunicipalGrant === 'number') CONFIG.WEEKLY_BASE_GRANT = gr.weeklyBaseMunicipalGrant;
      if (typeof gr.continuousRevenuePerHousePerSec === 'number') CONFIG.REVENUE_PER_HAPPY_HOUSE_SEC = gr.continuousRevenuePerHousePerSec;
      if (typeof gr.minHouseDistancePixels === 'number') CONFIG.MIN_HOUSE_DISTANCE = gr.minHouseDistancePixels;
      if (typeof gr.maxWireLengthPixels === 'number') CONFIG.MAX_WIRE_LENGTH = gr.maxWireLengthPixels;
      if (typeof gr.allConnectedSpawnSpeedup === 'number') CONFIG.ALL_CONNECTED_SPAWN_SPEEDUP = gr.allConnectedSpawnSpeedup;
      if (typeof gr.chainFreeHops === 'number') CONFIG.CHAIN_FREE_HOPS = gr.chainFreeHops;
      if (typeof gr.chainFlowLossPerHop === 'number') CONFIG.CHAIN_FLOW_LOSS_PER_HOP = gr.chainFlowLossPerHop;
      if (typeof gr.upsizeEveryNHouses === 'number') {
        CONFIG.UPSIZE_BASE_HOUSES = gr.upsizeEveryNHouses;
        CONFIG.UPSIZE_STEP_HOUSES = gr.upsizeEveryNHouses;
      }
      if (typeof gr.maxHousesCap === 'number') CONFIG.MAX_HOUSES_CAP = gr.maxHousesCap;
      if (typeof gr.repairCheckIntervalSeconds === 'number') CONFIG.REPAIR_CHECK_INTERVAL_SECONDS = gr.repairCheckIntervalSeconds;
      if (typeof gr.repairBreakdownChance === 'number') CONFIG.REPAIR_BREAKDOWN_CHANCE = gr.repairBreakdownChance;
    }

    // Story intro paragraphs (story/story.txt, inlined by the build scripts)
    if (Array.isArray(stageCfg.storyIntro)) CONFIG.STORY_INTRO = stageCfg.storyIntro;

    // 2. Pollution Rates
    const pr = stageCfg.pollutionRates;
    if (pr && typeof pr === 'object') {
      if (typeof pr.coalGeneratorPerSec === 'number') {
        CONFIG.POLLUTION_RATES.ELECTRIC_GENERATOR = pr.coalGeneratorPerSec;
        if (CONFIG.BUILDINGS && CONFIG.BUILDINGS.GENERATOR_COAL) {
          CONFIG.BUILDINGS.GENERATOR_COAL.pollutionRate = pr.coalGeneratorPerSec;
        }
      }
      if (typeof pr.wastewaterOutletBasePerSec === 'number') CONFIG.POLLUTION_RATES.WASTEWATER_OUTLET_BASE = pr.wastewaterOutletBasePerSec;
      if (typeof pr.wastewaterPerDrainedHousePerSec === 'number') CONFIG.POLLUTION_RATES.WASTEWATER_DISCHARGE_PER_HOUSE = pr.wastewaterPerDrainedHousePerSec;
      if (typeof pr.untreatedSewagePerHousePerSec === 'number') CONFIG.POLLUTION_RATES.UNTREATED_SEWAGE_PER_HOUSE = pr.untreatedSewagePerHousePerSec;
      if (typeof pr.airFilterReductionPerSec === 'number') {
        CONFIG.POLLUTION_RATES.AIR_FILTER_REDUCTION = pr.airFilterReductionPerSec;
        if (CONFIG.BUILDINGS && CONFIG.BUILDINGS.AIR_FILTER) {
          CONFIG.BUILDINGS.AIR_FILTER.pollutionReductionRate = pr.airFilterReductionPerSec;
        }
      }
      if (typeof pr.naturalDilutionPerSec === 'number') CONFIG.POLLUTION_RATES.NATURAL_DILUTION = pr.naturalDilutionPerSec;
      if (typeof pr.warningThresholdRatio === 'number') CONFIG.POLLUTION_WARN_THRESHOLD = pr.warningThresholdRatio;
    }

    // 3. Feature Costs (Buildings, Connections, Repair, Special Items, Upgrades)
    const fc = stageCfg.featureCosts || {};
    const bld = fc.buildings || stageCfg.buildings;
    if (bld && typeof bld === 'object' && CONFIG.BUILDINGS) {
      const mapBld = [
        ['generatorCoal', 'GENERATOR_COAL'],
        ['waterPump', 'WATER_PUMP'],
        ['wasteFilter', 'WASTE_FILTER'],
        ['airFilter', 'AIR_FILTER']
      ];
      for (let i = 0; i < mapBld.length; i++) {
        const src = bld[mapBld[i][0]];
        const dst = CONFIG.BUILDINGS[mapBld[i][1]];
        if (src && dst) {
          if (typeof src.cost === 'number') dst.cost = src.cost;
          if (typeof src.capacityHouses === 'number') dst.capacity = src.capacityHouses;
          if (typeof src.pollutionRatePerSec === 'number') dst.pollutionRate = src.pollutionRatePerSec;
          if (typeof src.pollutionReductionPerSec === 'number') dst.pollutionReductionRate = src.pollutionReductionPerSec;
          if (typeof src.canBreakDown === 'boolean') dst.canBreakDown = src.canBreakDown;
        }
      }
    }

    const connCfg = fc.connections;
    if (connCfg && typeof connCfg === 'object' && CONFIG.PIPES) {
      if (typeof connCfg.powerLineCost === 'number' && CONFIG.PIPES.POWER) CONFIG.PIPES.POWER.cost = connCfg.powerLineCost;
      if (typeof connCfg.waterPipeCost === 'number' && CONFIG.PIPES.WATER) CONFIG.PIPES.WATER.cost = connCfg.waterPipeCost;
      if (typeof connCfg.sewagePipeCost === 'number' && CONFIG.PIPES.SEWAGE) CONFIG.PIPES.SEWAGE.cost = connCfg.sewagePipeCost;
      if (typeof connCfg.riverCrossingExtraCost === 'number') CONFIG.RIVER_CROSSING_EXTRA_COST = connCfg.riverCrossingExtraCost;
    }

    const repCfg = fc.repair;
    if (repCfg && typeof repCfg === 'object') {
      if (typeof repCfg.repairCostPerBuilding === 'number') {
        CONFIG.REPAIR_COST_PER_BUILDING = repCfg.repairCostPerBuilding;
      }
    }

    const dtCfg = fc.disasterTesting;
    if (dtCfg && typeof dtCfg.testCost === 'number') {
      CONFIG.DISASTER_TEST_COST = dtCfg.testCost;
    }

    const upgCfg = fc.upgrades;
    if (upgCfg && typeof upgCfg === 'object' && CONFIG.UPGRADES) {
      const mapUpg = [
        ['elec_cap', 'ELECTRICITY_CAPACITY'],
        ['poll_red', 'POLLUTION_REDUCTION'],
        ['water_cap', 'WATER_PUMP_CAPACITY'],
        ['waste_cap', 'WASTE_FILTER_CAPACITY']
      ];
      for (let i = 0; i < mapUpg.length; i++) {
        const src = upgCfg[mapUpg[i][0]];
        const dst = CONFIG.UPGRADES[mapUpg[i][1]];
        if (src && dst) {
          if (typeof src.baseCost === 'number') dst.baseCost = src.baseCost;
          if (typeof src.costMult === 'number') dst.costMult = src.costMult;
          if (typeof src.maxLevel === 'number') dst.maxLevel = src.maxLevel;
          if (typeof src.bonusPerLevel === 'number') dst.bonusPerLevel = src.bonusPerLevel;
        }
      }
    }

    // 4. Disasters
    const dis = stageCfg.disasters;
    if (dis && typeof dis === 'object') {
      if (dis.highTide) Object.assign(CONFIG.DISASTERS.HIGH_TIDE, dis.highTide);
      if (dis.earthquake) Object.assign(CONFIG.DISASTERS.EARTHQUAKE, dis.earthquake);
      if (dis.blackout) Object.assign(CONFIG.DISASTERS.BLACKOUT, dis.blackout);
      if (dis.flood) Object.assign(CONFIG.DISASTERS.FLOOD, dis.flood);
    }

    // 5. Per-Stage Configurations
    const stg = stageCfg.stages;
    if (stg && typeof stg === 'object') {
      if (stg.tutorial && CONFIG.TUTORIAL_LEVEL) {
        applyStageEntry(CONFIG.TUTORIAL_LEVEL, stg.tutorial);
      }
      if (Array.isArray(CONFIG.LEVELS)) {
        for (let i = 0; i < CONFIG.LEVELS.length; i++) {
          const lvl = CONFIG.LEVELS[i];
          if (lvl && lvl.id && stg[lvl.id]) {
            applyStageEntry(lvl, stg[lvl.id]);
          }
        }
      }
    }

    if (global.POWATER && global.POWATER.game && typeof global.POWATER.game.reloadStageConfig === 'function') {
      global.POWATER.game.reloadStageConfig();
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.CONFIG = CONFIG;
  global.POWATER.applyStageConfig = applyStageConfig;

  if (global.POWATER_STAGE_CONFIG) {
    applyStageConfig(global.POWATER_STAGE_CONFIG);
  }

  // Live fetch of config/global.json and per-stage config/*.json files at runtime
  if (typeof fetch === 'function' && !global._powaterStageConfigFetched) {
    global._powaterStageConfigFetched = true;
    const ts = Date.now();
    const configFiles = [
      'config/global.json',
      'config/tutorial.json',
      'config/bangkok.json',
      'config/tokyo.json',
      'config/rome.json',
      'config/amsterdam.json'
    ];
    for (let i = 0; i < configFiles.length; i++) {
      fetch(configFiles[i] + '?t=' + ts)
        .then(res => (res && res.ok) ? res.json() : null)
        .then(data => {
          if (data) applyStageConfig(data);
        })
        .catch(() => {});
    }
  }

})(typeof window !== 'undefined' ? window : globalThis);
