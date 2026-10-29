// POWATER CORP. - Configuration, Levels, Upgrades & SDG Data
// Follows the design specifications from Team Green Gang and Pre18-10

(function (global) {
  'use strict';

  const CONFIG = {
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    GRID_SIZE: 32,

    // Core Game Mechanics
    MAX_COMPLAINTS: 3, // 3 complaints = Game Over
    STRIKE_TIMER_SECONDS: 27, // 27 seconds unsupplied = complaint
    GRACE_PERIOD_SECONDS: 120, // 2-minute preparation grace period
    POLLUTION_START_DELAY_SECONDS: 180, // Pollution starts after 3 minutes (180s)
    POLLUTION_WARN_THRESHOLD: 0.8, // 80% of max triggers warning

    // Revenue & Costs
    REVENUE_PER_HAPPY_HOUSE_SEC: 2.0, // Fully supplied house generates $2/s
    MIN_HOUSE_DISTANCE: 110, // Minimum distance between houses

    POLLUTION_RATES: {
      ELECTRIC_GENERATOR: 0.3, // Coal generator = +0.3/s
      AIR_FILTER_REDUCTION: 0.2, // Air filter = -0.2/s
      WASTEWATER_DISCHARGE_PER_HOUSE: 0.05, // Discharged wastewater = +0.05/s per house
      WASTEWATER_OUTLET_BASE: 0.05, // Base outlet pollution
      UNTREATED_SEWAGE_PER_HOUSE: 0.15, // Overflowing untreated sewage = +0.15/s per house
      NATURAL_DILUTION: 0.01 // River natural cleaning rate
    },

    BUILDINGS: {
      GENERATOR_COAL: {
        id: 'gen_coal',
        objectName: 'generator',
        name: 'Electricity Generator',
        thaiName: 'โรงไฟฟ้ามาตรฐาน (ตัวปั่นไฟ)',
        type: 'generator',
        cost: 30,
        capacity: Infinity,
        pollutionRate: 0.3,
        clean: false,
        color: '#ffb703',
        icon: '⚡',
        width: 60,
        height: 60,
        desc: 'จ่ายกระแสไฟฟ้าได้ไม่จำกัด ปล่อยมลภาวะ 0.3 หน่วย/วินาที'
      },
      GENERATOR_SOLAR: {
        id: 'gen_solar',
        objectName: 'solar',
        name: 'Solar Power Plant',
        thaiName: 'โรงไฟฟ้าพลังงานแสงอาทิตย์',
        type: 'generator',
        cost: 60,
        capacity: Infinity,
        pollutionRate: 0.0,
        clean: true,
        color: '#ffd166',
        icon: '☀️',
        width: 60,
        height: 60,
        desc: 'พลังงานสะอาด 0% มลภาวะ ไม่เพิ่มมลพิษจากการใช้ไฟ (SDG 7)'
      },
      WATER_PUMP: {
        id: 'water_pump',
        objectName: 'water_pump',
        name: 'Water Pump',
        thaiName: 'สถานีสูบน้ำ',
        type: 'water_pump',
        cost: 30,
        capacity: 15,
        pollutionRate: 0.0,
        mustBeNearWater: true,
        color: '#00b4d8',
        icon: '💧',
        width: 55,
        height: 55,
        desc: 'สูบน้ำสะอาดได้ 15 หลังคาเรือน (ต้องวางริมแม่น้ำ)'
      },
      WASTE_FILTER: {
        id: 'waste_filter',
        objectName: 'waste_filter',
        name: 'Wastewater Outlet Facility',
        thaiName: 'จุดปล่อยน้ำเสีย (ริมแม่น้ำ)',
        type: 'waste_filter',
        cost: 40,
        capacity: 10,
        pollutionRate: 0.05,
        mustBeNearWater: true,
        color: '#7209b7',
        icon: '🧪',
        width: 55,
        height: 55,
        desc: 'จุดปล่อยและระบายน้ำเสียริมแม่น้ำ ลากท่อระบายน้ำจากบ้านมาปล่อยที่นี่ (SDG 6)'
      },
      AIR_FILTER: {
        id: 'air_filter',
        objectName: 'air_filter',
        name: 'Air Filter Facility',
        thaiName: 'เครื่องฟอกอากาศ (AirFilter)',
        type: 'air_filter',
        cost: 40,
        capacity: 0,
        pollutionReductionRate: 0.2,
        mustBeNearWater: false,
        color: '#2ec4b6',
        icon: '🍃',
        width: 55,
        height: 55,
        desc: 'เครื่องฟอกอากาศ ช่วยดูดซับมลพิษในเมือง ลดมลภาวะ -0.2 หน่วย/วินาที (SDG 11 & 13)'
      }
    },

    PIPES: {
      POWER: {
        id: 'power',
        name: 'Power Line',
        thaiName: 'สายไฟฟ้า',
        cost: 0, // Free
        color: '#ffb703',
        glowColor: '#ffd166',
        lineWidth: 3,
        offset: -5
      },
      WATER: {
        id: 'water',
        name: 'Clean Water Pipe',
        thaiName: 'ท่อน้ำดี',
        cost: 0, // Free
        color: '#00b4d8',
        glowColor: '#90e0ef',
        lineWidth: 4,
        offset: 0
      },
      SEWAGE: {
        id: 'sewage',
        name: 'Wastewater Pipe',
        thaiName: 'ท่อระบายน้ำ',
        cost: 0, // Free
        color: '#9d4edd',
        glowColor: '#c77dff',
        lineWidth: 4,
        offset: 5
      }
    },

    UPGRADES: {
      ELECTRICITY_CAPACITY: {
        id: 'elec_cap',
        name: 'ELECTRICITY +20%',
        thaiName: 'ประสิทธิภาพไฟฟ้า +20%',
        desc: '+20% Generator transmission efficiency & capacity',
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
        desc: '-5% to all pollution emissions & higher filter rate',
        icon: '☢️',
        baseCost: 100,
        costMult: 1.5,
        maxLevel: 10,
        bonusPerLevel: 0.05
      },
      WATER_PUMP_CAPACITY: {
        id: 'water_cap',
        name: 'WATER PUMP +20%',
        thaiName: 'ปั๊มน้ำแรงดันสูง +20%',
        desc: '+20% Water Pump volume & range',
        icon: '💧',
        baseCost: 10,
        costMult: 1.8,
        maxLevel: 5,
        bonusPerLevel: 0.20
      }
    },

    LEVELS: [
      {
        id: 'bangkok',
        name: 'Bangkok, Thailand',
        thaiName: 'กรุงเทพมหานคร (แมพตัวอย่าง)',
        briefing: 'ยินดีต้อนรับสู่กรุงเทพมหานคร! แม่น้ำเจ้าพระยาแบ่งฝั่งกรุงเทพและฝั่งธนบุรี สามารถเชื่อมต่อสายไฟ ท่อน้ำดี และท่อระบายน้ำข้ามแม่น้ำและพ่วงจากบ้านสู่บ้านได้อย่างอิสระ! เมื่อบ้านใช้น้ำจะเกิดน้ำเสียขึ้นมา ลากท่อระบายน้ำไปบำบัดริมน้ำเพื่อลดมลภาวะ!',
        amigoQuote: 'Ciao! I am Amigo. Connect electricity, clean water, and wastewater pipes freely across the river and from house to house. Keep complaints at zero and maintain low pollution!',
        riverName: 'Chao Phraya River (แม่น้ำเจ้าพระยา)',
        leftSideLabel: 'ฝั่งธนบุรี (Thonburi)',
        rightSideLabel: 'ฝั่งกรุงเทพ (Bangkok)',
        startingBudget: 120,
        maxPollution: 5.0,
        goalDays: 7,
        targetHousesServed: 12,
        spawnInterval: 30000,
        riverPath: [
          { x: 610, y: 0 },
          { x: 640, y: 180 },
          { x: 580, y: 360 },
          { x: 680, y: 540 },
          { x: 650, y: 720 }
        ],
        riverWidth: 80
      },
      {
        id: 'venice',
        name: 'Venice, Italy',
        thaiName: 'เวนิส (อิตาลี - บ้านเกิด Amigo)',
        briefing: 'บ้านเกิดของ Amigo! เวนิสมีคลองน้ำล้อมรอบ กฎหมายสิ่งแวดล้อมเข้มงวดที่สุดในยุโรป มลภาวะห้ามเกิน 4.0 เด็ดขาด! แนะนำให้ใช้พลังงานแสงอาทิตย์ Solar และกรองน้ำเสีย 100%',
        amigoQuote: 'Ah, Venezia! My beloved home. Every drop of canal water must stay pristine. Build solar, filter wastewater, and show them how the GOAT does it!',
        riverName: 'Grand Canal (แกรนด์คาแนล)',
        leftSideLabel: 'San Polo & Dorsoduro',
        rightSideLabel: 'San Marco & Cannaregio',
        startingBudget: 150,
        maxPollution: 4.0,
        goalDays: 8,
        targetHousesServed: 16,
        spawnInterval: 30000,
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
        id: 'tokyo',
        name: 'Tokyo, Japan',
        thaiName: 'โตเกียว (ญี่ปุ่น)',
        briefing: 'มหานครโตเกียว ประชาชนหนาแน่นมาก! คุณต้องวางผังโครงข่ายไฟฟ้าและท่อน้ำดีเชื่อมต่อไปยังบ้านเรือนให้มีประสิทธิภาพสูงสุดเพื่อรองรับประชากร!',
        amigoQuote: 'Tokyo moves at lightning speed! Stay calm, upgrade your transformers and pump lines early, and keep complaints at zero!',
        riverName: 'Sumida River (แม่น้ำสุมิดะ)',
        leftSideLabel: 'Chuo / Taito',
        rightSideLabel: 'Sumida / Koto',
        startingBudget: 180,
        maxPollution: 8.0,
        goalDays: 10,
        targetHousesServed: 20,
        spawnInterval: 28000,
        riverPath: [
          { x: 560, y: 0 },
          { x: 580, y: 240 },
          { x: 540, y: 480 },
          { x: 610, y: 720 }
        ],
        riverWidth: 85
      },
      {
        id: 'endless',
        name: 'Global Metropolis (Endless)',
        thaiName: 'มหานครไร้ขีดจำกัด (โหมดไม่มีที่สิ้นสุด)',
        briefing: 'ทดสอบฝีมือการบริหารจัดการระดับโลก! เล่นต่อเนื่องไปได้เรื่อยๆ โดยไม่มีการจำกัดวัน ประชากรจะทยอยเพิ่มขึ้นอย่างเหมาะสม ท้าทายคะแนนสูงสุดของคุณ!',
        amigoQuote: 'No limits here! Only your skill as an environmental tycoon. Let us see how many weeks you can keep the city thriving!',
        riverName: 'Continental River',
        leftSideLabel: 'West District',
        rightSideLabel: 'East District',
        startingBudget: 200,
        maxPollution: 10.0,
        goalDays: 9999,
        targetHousesServed: 100,
        spawnInterval: 28000,
        riverPath: [
          { x: 640, y: 0 },
          { x: 610, y: 240 },
          { x: 660, y: 480 },
          { x: 620, y: 720 }
        ],
        riverWidth: 80
      }
    ],

    SDGS: [
      {
        number: 6,
        title: 'Clean Water and Sanitation',
        thaiTitle: 'น้ำสะอาดและสุขาภิบาล',
        color: '#26bde2',
        icon: '🚰',
        quote: 'เป็นการทำให้เล็งเห็นปัญหาการระบายน้ำที่เกิดขึ้นทุกวันให้เป็นรูปธรรมและเข้าใจง่าย',
        desc: 'เข้าถึงน้ำดื่มที่สะอาดและระบบสุขาภิบาลที่เหมาะสม ในเกม POWATER CORP. คุณต้องสูบน้ำสะอาดส่งให้ประชาชน และสร้างบ่อบำบัดน้ำเสีย (Wastewater Filter) ไม่ให้น้ำเสียปล่อยลงแม่น้ำจนเกิดมลพิษ'
      },
      {
        number: 7,
        title: 'Affordable and Clean Energy',
        thaiTitle: 'พลังงานสะอาดที่เข้าถึงได้',
        color: '#fcc30b',
        icon: '⚡',
        quote: 'สร้างความตระหนักถึงการใช้ไฟฟ้าอย่างประหยัด และมลภาวะที่เกิดขึ้นจากการใช้ไฟฟ้ามากขึ้นเรื่อยๆ และทำให้ผู้เล่นมองหาช่องทางใหม่ๆ ในการสร้างพลังงานสะอาด',
        desc: 'ส่งเสริมพลังงานหมุนเวียน เช่น โซลาร์เซลล์ (Solar Plant) ที่ผลิตไฟฟ้าได้โดยไม่ปล่อยมลภาวะสู่บรรยากาศ เมื่อเทียบกับโรงไฟฟ้าฟอสซิลทั่วไป'
      },
      {
        number: 11,
        title: 'Sustainable Cities and Communities',
        thaiTitle: 'เมืองและชุมชนที่ยั่งยืน',
        color: '#fd9d24',
        icon: '🏙️',
        quote: 'เสริมทักษะการสร้างบางอย่างให้ยั่งยืน โดยใช้ความสามารถในการคิดด้วยภาพจำลอง',
        desc: 'การวางผังโครงสร้างพื้นฐานคู่ขนาน (ไฟฟ้า + น้ำ + สิ่งแวดล้อม) อย่างชาญฉลาด เพื่อให้เมืองเติบโตได้โดยประชาชนมีความสุขและสิ่งแวดล้อมไม่ถูกทำลาย'
      }
    ]
  };

  global.POWATER = global.POWATER || {};
  global.POWATER.CONFIG = CONFIG;

})(typeof window !== 'undefined' ? window : globalThis);
