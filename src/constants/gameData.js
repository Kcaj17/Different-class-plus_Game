// =========================================================
// gameData.js — D&D Economic Chronicles: Data Models & Campaign
// Based on "การกระจายรายได้และนโยบายการคลังของไทย" (PDF)
// =========================================================

// 4 Character Classes / 10 Asymmetric Socio-Economic Roles per District
// Assigned randomly at birth ("Veil of Ignorance" - John Rawls)
const ROLE_TEMPLATES = [
  // 1 Capitalist Overlord (นายทุนใหญ่)
  {
    id: 'capitalist_1',
    roleType: 'capitalist',
    className: 'มหาเศรษฐีเจ้าของทุน (Capitalist Overlord)',
    title: 'เสี่ยสมบัติ เจ้าสัวค้าปลีก',
    subTitle: 'ผู้ครอบครองปัจจัยการผลิต & ซัพพลายเชน',
    description: 'ถือครองทุนและที่ดินมหาศาล กำไรจากส่วนต่างซัพพลายเชน มีระบบ e-Tax เต็มรูปแบบและอำนาจต่อรองทางการเงินสูงสุด',
    avatar: '🏢',
    initialCash: 500000,
    baseIncome: 80000,
    fixedExpense: 20000,
    hasDigitalAccess: true,
    hasSmartPhone: true,
    isVulnerable: false,
    taxBracket: 0.20,
    coPayEligible: false,
    welfareCard: false,
    creditScore: 100,
    dndStats: {
      cap: 18, // Capital +4 modifier
      lab: 10, // Labor +0 modifier
      inf: 16, // Influence +3 modifier
      dig: 14  // Digital +2 modifier
    },
    maxHp: 100,
    initialHp: 65,
    classPerk: 'Supply Chain Sovereign: ได้รับผลกำไรจากการสั่งของของร้านค้ารายย่อยทุกครั้ง'
  },

  // 3 SME Merchants (วาณิชย์ชุมชนถุงเงิน)
  {
    id: 'sme_1',
    roleType: 'sme_vendor',
    className: 'วาณิชย์ชุมชนถุงเงิน (Community Merchant)',
    title: 'เจ๊พร ร้านของชำ',
    subTitle: 'โชห่วยศูนย์กลางหมู่บ้าน (แอปถุงเงิน)',
    description: 'จำหน่ายสินค้าอุปโภคบริโภคจำเป็น พึ่งพาเงินสะพัดจากโครงการรัฐ พยายามสะสมรอยเท้าดิจิทัลเพื่อกู้เงินดอกเบี้ยต่ำในระบบ',
    avatar: '🏪',
    initialCash: 50000,
    baseIncome: 25000,
    fixedExpense: 12000,
    hasDigitalAccess: true,
    hasSmartPhone: true,
    isVulnerable: false,
    taxBracket: 0.05,
    coPayEligible: false,
    welfareCard: false,
    creditScore: 60,
    dndStats: {
      cap: 12, // +1 modifier
      lab: 14, // +2 modifier
      inf: 12, // +1 modifier
      dig: 14  // +2 modifier
    },
    maxHp: 100,
    initialHp: 50,
    classPerk: 'Local Haven: รับสิทธิ์สแกนถุงเงิน 60/40 เพิ่มรายได้และ Digital Footprint'
  },
  {
    id: 'sme_2',
    roleType: 'sme_vendor',
    className: 'วาณิชย์ชุมชนถุงเงิน (Community Merchant)',
    title: 'ป้าสำราญ ข้าวแกง',
    subTitle: 'ครัวสตรีทฟู้ดชุมชน (แอปถุงเงิน)',
    description: 'ปรุงอาหารร้อนราคาประหยัด ได้รับอานิสงส์โดยตรงจากเงินร่วมจ่าย 60/40 แต่เสี่ยงต่อต้นทุนพลังงานและวัตถุดิบผันผวน',
    avatar: '🍲',
    initialCash: 45000,
    baseIncome: 22000,
    fixedExpense: 10000,
    hasDigitalAccess: true,
    hasSmartPhone: true,
    isVulnerable: false,
    taxBracket: 0.05,
    coPayEligible: false,
    welfareCard: false,
    creditScore: 55,
    dndStats: {
      cap: 12,
      lab: 14,
      inf: 12,
      dig: 14
    },
    maxHp: 100,
    initialHp: 50,
    classPerk: 'Street Comfort: ลูกค้าชื่นชอบเมื่อใช้สิทธิ์ Co-pay เพิ่มความพึงพอใจและยอดขาย'
  },
  {
    id: 'sme_3',
    roleType: 'sme_vendor',
    className: 'วาณิชย์ชุมชนถุงเงิน (Community Merchant)',
    title: 'ช่างบุญมี บริการซ่อม',
    subTitle: 'อู่บริการ & อะไหล่ท้องถิ่น (แอปถุงเงิน)',
    description: 'ให้บริการซ่อมบำรุงยานพาหนะและเครื่องจักรการเกษตร ได้รับเงินหมุนเวียนจากสภาพคล่องของชาวบ้านที่ฟื้นตัว',
    avatar: '🔧',
    initialCash: 40000,
    baseIncome: 20000,
    fixedExpense: 9000,
    hasDigitalAccess: true,
    hasSmartPhone: true,
    isVulnerable: false,
    taxBracket: 0.05,
    coPayEligible: false,
    welfareCard: false,
    creditScore: 50,
    dndStats: {
      cap: 12,
      lab: 14,
      inf: 12,
      dig: 14
    },
    maxHp: 100,
    initialHp: 50,
    classPerk: 'Community Mechanic: ค่าใช้จ่ายซ่อมแซมหนุนการหมุนเวียนทางเศรษฐกิจ'
  },

  // 3 General Citizens (นักผจญภัยแรงงาน / มนุษย์เงินเดือน)
  {
    id: 'citizen_1',
    roleType: 'general_citizen',
    className: 'นักผจญภัยแรงงาน (Labor Adventurer)',
    title: 'สมชาย พนักงานออฟฟิศ',
    subTitle: 'มนุษย์เงินเดือนในระบบเอกชน',
    description: 'มีเงินเดือนประจำและสมาร์ตโฟนพร้อมใช้สิทธิไทยช่วยไทย 60/40 สามารถเลือกอัปเกรดทักษะอาชีพเพื่อเลื่อนขั้นเงินเดือน',
    avatar: '👔',
    initialCash: 25000,
    baseIncome: 22000,
    fixedExpense: 14000,
    hasDigitalAccess: true,
    hasSmartPhone: true,
    isVulnerable: false,
    taxBracket: 0.05,
    coPayEligible: true,
    welfareCard: false,
    creditScore: 75,
    dndStats: {
      cap: 10, // +0 modifier
      lab: 16, // +3 modifier
      inf: 10, // +0 modifier
      dig: 14  // +2 modifier
    },
    maxHp: 100,
    initialHp: 50,
    classPerk: 'Co-Pay Champion: ใช้สิทธิ์ไทยช่วยไทย 60/40 จ่ายเพียง 40% (รัฐช่วย 60%)'
  },
  {
    id: 'citizen_2',
    roleType: 'general_citizen',
    className: 'นักผจญภัยแรงงาน (Labor Adventurer)',
    title: 'สุดา แรงงานอุตสาหกรรม',
    subTitle: 'แรงงานกะสายพานการผลิต',
    description: 'ทำงานในโรงงานอุตสาหกรรม รายได้ระดับปานกลาง ได้รับผลกระทบจากค่าครองชีพสูง พึ่งพาสิทธิ์ 60/40 เพื่อประหยัดเงิน',
    avatar: '🦺',
    initialCash: 18000,
    baseIncome: 16000,
    fixedExpense: 11000,
    hasDigitalAccess: true,
    hasSmartPhone: true,
    isVulnerable: false,
    taxBracket: 0.0,
    coPayEligible: true,
    welfareCard: false,
    creditScore: 65,
    dndStats: {
      cap: 10,
      lab: 16,
      inf: 10,
      dig: 14
    },
    maxHp: 100,
    initialHp: 50,
    classPerk: 'Resilient Worker: ความขยันทำงานช่วยให้รอดพ้นความผันผวน'
  },
  {
    id: 'citizen_3',
    roleType: 'general_citizen',
    className: 'นักผจญภัยแรงงาน (Labor Adventurer)',
    title: 'กานต์ ไรเดอร์ส่งพัสดุ',
    subTitle: 'แรงงานแพลตฟอร์ม & กิ๊กอีโคโนมี',
    description: 'มีอิสระในการทำงานแต่รายได้ผันผวน ได้รับอานิสงส์อย่างมากเมื่อเงินหมุนเวียนในระบบเพิ่มขึ้นและผู้คนสั่งอาหาร/ของใช้',
    avatar: '🛵',
    initialCash: 15000,
    baseIncome: 15000,
    fixedExpense: 10000,
    hasDigitalAccess: true,
    hasSmartPhone: true,
    isVulnerable: false,
    taxBracket: 0.0,
    coPayEligible: true,
    welfareCard: false,
    creditScore: 50,
    dndStats: {
      cap: 10,
      lab: 16,
      inf: 10,
      dig: 14
    },
    maxHp: 100,
    initialHp: 50,
    classPerk: 'Platform Hustle: ความคล่องตัวสูงเชื่อมต่อการค้าชุมชนกับผู้บริโภค'
  },

  // 3 Vulnerable Grassroots (ผู้พิทักษ์ฐานราก / กลุ่มเปราะบาง)
  {
    id: 'vulnerable_1',
    roleType: 'vulnerable_group',
    className: 'ผู้พิทักษ์ฐานราก (Grassroots Guardian)',
    title: 'ยายแม้น ผู้สูงอายุชุมชน',
    subTitle: 'ผู้สูงวัยติดบ้าน / เผชิญ Digital Divide',
    description: 'ไม่มีสมาร์ตโฟน เข้าไม่ถึงแอปพลิเคชัน รัฐบาลโอนเงินสวัสดิการตรงเข้าบัญชีผ่าน อปท./พม. 1,000 บ./ด.',
    avatar: '👵',
    initialCash: 5000,
    baseIncome: 3500,
    fixedExpense: 3500,
    hasDigitalAccess: false,
    hasSmartPhone: false,
    isVulnerable: true,
    taxBracket: 0.0,
    coPayEligible: false,
    welfareCard: true,
    creditScore: 20,
    dndStats: {
      cap: 6,  // -2 modifier
      lab: 10, // +0 modifier
      inf: 8,  // -1 modifier
      dig: 8   // -1 modifier
    },
    maxHp: 100,
    initialHp: 45,
    classPerk: 'Direct Welfare Shield: ได้รับเงินโอนสวัสดิการแห่งรัฐตรง ไม่ต้องใช้สมาร์ตโฟน'
  },
  {
    id: 'vulnerable_2',
    roleType: 'vulnerable_group',
    className: 'ผู้พิทักษ์ฐานราก (Grassroots Guardian)',
    title: 'น้าชิด ผู้ถือบัตรสวัสดิการ',
    subTitle: 'ผู้มีรายได้น้อย / รับจ้างอิสระ',
    description: 'ถือบัตรสวัสดิการแห่งรัฐ ใช้รูดซื้อสินค้าร้านธงฟ้าและร้านชุมชน ได้เงินเพิ่มเดือนละ 700 บ. (รวมเป็น 1,000 บ.)',
    avatar: '🧑‍🦽',
    initialCash: 4000,
    baseIncome: 4500,
    fixedExpense: 4200,
    hasDigitalAccess: true,
    hasSmartPhone: true,
    isVulnerable: true,
    taxBracket: 0.0,
    coPayEligible: false,
    welfareCard: true,
    creditScore: 30,
    dndStats: {
      cap: 6,
      lab: 10,
      inf: 8,
      dig: 8
    },
    maxHp: 100,
    initialHp: 45,
    classPerk: 'Smart Card Protection: บัตรสวัสดิการแห่งรัฐการันตีเสบียงยังชีพพื้นฐาน'
  },
  {
    id: 'vulnerable_3',
    roleType: 'vulnerable_group',
    className: 'ผู้พิทักษ์ฐานราก (Grassroots Guardian)',
    title: 'ลุงอินทร์ เกษตรกรรายย่อย',
    subTitle: 'กสิกรฐานราก / สู้ภัยแล้งและปุ๋ยแพง',
    description: 'รายได้ขึ้นอยู่กับฤดูกาลและราคาพืชผล ได้รับผลกระทบจากเงินเฟ้อค่าปุ๋ย พึ่งพากองทุนชุมชนเพื่อปลดแอกหนี้นอกระบบ',
    avatar: '🌾',
    initialCash: 4500,
    baseIncome: 4000,
    fixedExpense: 3800,
    hasDigitalAccess: true,
    hasSmartPhone: false,
    isVulnerable: true,
    taxBracket: 0.0,
    coPayEligible: false,
    welfareCard: true,
    creditScore: 25,
    dndStats: {
      cap: 6,
      lab: 10,
      inf: 8,
      dig: 8
    },
    maxHp: 100,
    initialHp: 45,
    classPerk: 'Seed of the Earth: ได้รับการชดเชยเยียวยาภาคเกษตรกรรมเมื่อเกิดวิกฤต'
  }
];

// 6 DND Campaign Chapters mapped directly to Academic PDF
const ROUNDS_DATA = [
  {
    round: 1,
    chapterName: 'บทที่ 1: กำเนิดใต้ผ้าคลุมแห่งความไม่รู้ & กลไกตลาดเสรี',
    subTitle: 'Functional Distribution — ตลาดเสรีกระจายผลตอบแทนตามปัจจัยการผลิต',
    lore: 'เหล่าผู้กล้าลืมตาตื่นขึ้นในระบบเศรษฐกิจตลาดเสรี! ผลตอบแทนถูกจัดสรรตามปัจจัยการผลิต: ทุน, ที่ดิน, ค่าจ้างแรงงาน และการประกอบการ แต่ธรรมชาติของทุนสะสมเร็วกว่าค่าจ้างแรงงาน ความเหลื่อมล้ำเริ่มก่อตัวขึ้นอย่างเงียบๆ...',
    energyCostIndex: 1.0,
    governmentStimulus: 0,
    publicDebtChange: 0,
    defaultDc: 11,
    newsAlert: '📌 ตลาดเติบโตตามกลไกเสรี: เจ้าของทุนสะสมความมั่งคั่งได้รวดเร็วกว่าแรงงานถึง 3 เท่า!',
    recommendedAction: 'ทอย D20 ตรวจสอบความพร้อม: ชนชั้นแรงงานทำงาน, ร้านค้าเตรียมสต็อก, เจ้าสัวลงทุนขยายสายการผลิต'
  },
  {
    round: 2,
    chapterName: 'บทที่ 2: อสูรกายวิกฤตพลังงาน & อัตราเงินเฟ้อพุ่งสูง',
    subTitle: 'Energy Shock & Inflation — ราคาน้ำมันโลกพุ่ง +35% เขย่าค่าครองชีพฐานราก',
    lore: 'หมอกควันดำปกคลุมอาณาจักร! อสูรกายวิกฤตพลังงานโลกคำราม ราคาน้ำมัน ค่าขนส่ง และราคาอาหารพุ่งสูงขึ้น 35% กัดกินกำลังซื้อของประชาชนและกลุ่มเปราะบาง ร้านค้าย่อยเผชิญต้นทุนพุ่ง สภาพคล่องเริ่มตึงตัว!',
    energyCostIndex: 1.35, // +35% cost of living & supplies
    governmentStimulus: 0,
    publicDebtChange: 0,
    defaultDc: 12,
    newsAlert: '⚠️ วิกฤตพลังงานโลก! ราคาน้ำมันและอาหารพุ่ง +35% ประชาชนต้องรัดเข็มขัด กลุ่มเปราะบางเสี่ยงติดลบ',
    recommendedAction: 'ทอยเต๋า D20 ต้านทานผลกระทบเงินเฟ้อ บริหารสภาพคล่องและเงินสดสำรอง'
  },
  {
    round: 3,
    chapterName: 'บทที่ 3: พระราชกฤษฎีกา “ไทยช่วยไทย พลัส (60/40)” & ตราประทับสวัสดิการ',
    subTitle: 'Fiscal Co-Pay Injection — คลังกู้เงิน 1.75 แสนล้าน อัดฉีดพลังซื้อฐานราก',
    lore: 'คลังหลวงประกาศพระราชกฤษฎีกาครั้งประวัติศาสตร์! อนุมัติวงเงินกู้ 1.75 แสนล้านบาท เปิดใช้เวทมนตร์ร่วมจ่าย 60/40 ผ่านแอปเป๋าตัง (รัฐช่วย 60% ประชาชนจ่าย 40%) พร้อมส่งมอบเงินสวัสดิการแห่งรัฐ 1,000 บาท/ด. ชุบชีวิตเศรษฐกิจฐานราก!',
    energyCostIndex: 1.15,
    governmentStimulus: 175700,
    publicDebtChange: 3.5, // +3.5% Debt-to-GDP
    defaultDc: 10,
    newsAlert: '🎉 รัฐอัดฉีด 60/40! สแกนเป๋าตังลดทันที 60% เงินสะพัดสู่ร้านถุงเงินชุมชน แต่หนี้สาธารณะขยับขึ้น!',
    recommendedAction: 'ประชาชนรีบร่ายเวทสแกน 60/40 ร้านค้าเปิดถุงเงินกอบโกยยอดขาย เจ้าสัวบริหารซัพพลายเชน'
  },
  {
    round: 4,
    chapterName: 'บทที่ 4: ผู้ตรวจการภาษี & รอยเท้าดิจิทัล (Tax Recapture & VAT 7%)',
    subTitle: 'Tax Recapture & Expansion — ภาษีมูลค่าเพิ่มดึงเงินคืนคลัง และคัดกรองสินเชื่อในระบบ',
    lore: 'ผู้ตรวจการภาษีหลวงออกตรวจตรา! เงินที่สะพัดในห่วงโซ่อุปทานสร้างภาษี VAT 7% ดึงกลับเข้าสู่คลังหลวง ร้านค้าที่มีรายได้สะสมและมีรอยเท้าดิจิทัล (Digital Footprint) จากแอปถุงเงิน สามารถใช้เป็นใบเบิกทางยื่นกู้สินเชื่อดอกเบี้ยต่ำในระบบ!',
    energyCostIndex: 1.05,
    governmentStimulus: 0,
    publicDebtChange: -1.2, // Tax recovery reduces debt pressure
    defaultDc: 12,
    newsAlert: '📊 คลังหลวงรับรู้รายได้ VAT 7% ดึงเงินคืนคลัง ร้านค้าที่มีรอยเท้าดิจิทัลโปร่งใสได้รับอนุมัติสินเชื่อดอกเบี้ยต่ำ!',
    recommendedAction: 'ร้านค้ายื่นกู้สินเชื่อดอกเบี้ยต่ำในระบบ ประชาชนชำระภาษีตามขั้นบันได'
  },
  {
    round: 5,
    chapterName: 'บทที่ 5: กิลด์แห่งโอกาส — ธนาคารไร้สาขา & วิหารพัฒนาทักษะ',
    subTitle: 'Structural Shift & Equality of Opportunity — Virtual Bank และการศึกษาเพื่อความเสมอภาค',
    lore: 'อาณาจักรปรับเปลี่ยนนโยบายสู่ความยั่งยืนระยะยาว! ก่อตั้งธนาคารไร้สาขา (Virtual Bank) เพื่อให้กลุ่มฐานรากเข้าถึงสินเชื่อดอกเบี้ยต่ำ 3% และเปิดประตูวิหารแห่งปัญญาพัฒนาทักษะ (Skill Upgrading) มอบโอกาสขยับฐานะทางสังคม (Social Mobility)!',
    energyCostIndex: 1.0,
    governmentStimulus: 40000,
    publicDebtChange: 0.5,
    defaultDc: 11,
    newsAlert: '🚀 รัฐเปิดตัว Virtual Bank ดอกเบี้ย 3% และคอร์สอัปเกรดทักษะแรงงาน เพิ่มเงินเดือนถาวร +25%!',
    recommendedAction: 'แรงงานลงทุนอัปเกรดทักษะ (Skill Lv. Up) ร้านค้ายื่นกู้ขยายกิจการ กลุ่มเปราะบางรับโอกาสสร้างอาชีพ'
  },
  {
    round: 6,
    chapterName: 'บทที่ 6: มหาการพิพากษาแห่ง 3 ปรัชญาเศรษฐกิจ & วินัยการคลัง',
    subTitle: 'Final Fiscal Reckoning — ชะตากรรมดัชนีจีนี (Gini), เส้นโค้งลอเรนซ์, และเพดานหนี้ 70%',
    lore: 'ม่านหมอกเปิดออกสู่บัลลังก์แห่งการพิพากษา! ศาลเศรษฐศาสตร์สูงสุดประเมินเส้นโค้งลอเรนซ์และสัมประสิทธิ์จีนีของแต่ละเขต: หนี้สาธารณะทะลุเพดาน 70% หรือไม่? สังคมบรรลุแนวคิด Utilitarian, Rawlsian, หรือ Equality of Opportunity?',
    energyCostIndex: 1.0,
    governmentStimulus: 0,
    publicDebtChange: 0,
    defaultDc: 10,
    newsAlert: '🏆 จบเกม! ระบบประมวลผลกราฟลอเรนซ์ ดัชนีจีนี และประกาศเกียรติยศ 3 ปรัชญาเศรษฐกิจ!',
    recommendedAction: 'ติดตามผลลัพธ์มหาภาพรวมระดับประเทศและเกียรติยศผู้ชนะในเขตของท่าน'
  }
];

// Helper: Calculate D&D Stat Modifier from score (e.g. 10 -> +0, 14 -> +2, 18 -> +4, 6 -> -2)
function getModifier(statValue) {
  return Math.floor((statValue - 10) / 2);
}

module.exports = {
  ROLE_TEMPLATES,
  ROUNDS_DATA,
  getModifier
};
