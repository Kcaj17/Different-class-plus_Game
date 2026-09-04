// =========================================================
// gameData.js — D&D Economic Chronicles: Data Models & Campaign
// Based on "การกระจายรายได้และนโยบายการคลังของไทย" (PDF)
// =========================================================

// 4 Character Classes / 10 Asymmetric Socio-Economic Roles per District
// Assigned randomly at birth ("Veil of Ignorance" - John Rawls)
const ROLE_TEMPLATES = [
  // 1 Capitalist (เจ้าของธุรกิจขนาดใหญ่ / นายทุน)
  {
    id: 'capitalist_1',
    roleType: 'capitalist',
    className: 'เจ้าของธุรกิจขนาดใหญ่ (นายทุน)',
    title: 'เสี่ยสมบัติ เจ้าของห้างค้าปลีก',
    subTitle: 'ผู้บริหารธุรกิจและห่วงโซ่อุปทาน',
    description: 'ถือครองเงินทุนและที่ดินจำนวนมาก ได้รับกำไรจากการจัดส่งสินค้าให้ร้านค้ารายย่อย มีระบบภาษี e-Tax เต็มรูปแบบและมีอำนาจต่อรองทางการเงินสูง',
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
    classPerk: 'เจ้าของห่วงโซ่อุปทาน: ได้รับกำไรจากการสั่งซื้อสินค้าของร้านค้ารายย่อย'
  },

  // 3 SME Merchants (ร้านค้าชุมชน / ผู้ประกอบการ SME)
  {
    id: 'sme_1',
    roleType: 'sme_vendor',
    className: 'ร้านค้าชุมชน / ผู้ประกอบการ SME',
    title: 'เจ๊พร ร้านของชำ',
    subTitle: 'ร้านค้าของชำในชุมชน (แอปถุงเงิน)',
    description: 'ขายสินค้าของกินของใช้จำเป็น ได้ประโยชน์จากเงินหมุนเวียนในโครงการรัฐ และเก็บสะสมประวัติรับเงินดิจิทัลเพื่อขอกู้เงินดอกเบี้ยต่ำในระบบ',
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
    classPerk: 'ร้านค้าเข้าร่วมโครงการ: รับสแกนเงิน 60/40 เพิ่มยอดขายและสร้างประวัติการเงิน'
  },
  {
    id: 'sme_2',
    roleType: 'sme_vendor',
    className: 'ร้านค้าชุมชน / ผู้ประกอบการ SME',
    title: 'ป้าสำราญ ร้านข้าวแกง',
    subTitle: 'ร้านอาหารตามสั่งชุมชน (แอปถุงเงิน)',
    description: 'ขายอาหารปรุงสุกราคาประหยัด ได้รับประโยชน์โดยตรงจากโครงการช่วยจ่าย 60/40 แต่มีความเสี่ยงจากต้นทุนแก๊สและวัตถุดิบที่ปรับขึ้น',
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
    classPerk: 'ร้านอาหารยอดนิยม: ลูกค้าใช้สิทธิ 60/40 อุดหนุนต่อเนื่อง ช่วยเพิ่มยอดขาย'
  },
  {
    id: 'sme_3',
    roleType: 'sme_vendor',
    className: 'ร้านค้าชุมชน / ผู้ประกอบการ SME',
    title: 'ช่างบุญมี อู่ซ่อมรถ',
    subTitle: 'อู่บริการซ่อมรถและอะไหล่ (แอปถุงเงิน)',
    description: 'ให้บริการซ่อมรถจักรยานยนต์และเครื่องมือทำกิน มีรายได้เพิ่มขึ้นเมื่อชาวบ้านและคนทำงานมีเงินหมุนเวียนใช้จ่าย',
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
    classPerk: 'ช่างประจำชุมชน: มีรายได้สม่ำเสมอจากการซ่อมบำรุงและดูแลเครื่องมือทำกิน'
  },

  // 3 General Citizens (พนักงาน / แรงงานทั่วไป)
  {
    id: 'citizen_1',
    roleType: 'general_citizen',
    className: 'พนักงาน / แรงงานทั่วไป',
    title: 'สมชาย พนักงานออฟฟิศ',
    subTitle: 'พนักงานบริษัทเอกชน',
    description: 'มีเงินเดือนประจำและใช้สมาร์ตโฟน มีสิทธิร่วมโครงการคนละชั้น 60/40 และสามารถเลือกเข้าคอร์สอบรมเพื่อขอปรับขึ้นเงินเดือนได้',
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
    classPerk: 'ใช้สิทธิช่วยจ่าย 60/40: จ่ายค่าสินค้าเพียง 40% โดยรัฐช่วยออกให้ 60%'
  },
  {
    id: 'citizen_2',
    roleType: 'general_citizen',
    className: 'พนักงาน / แรงงานทั่วไป',
    title: 'สุดา พนักงานโรงงาน',
    subTitle: 'พนักงานฝ่ายผลิตในโรงงาน',
    description: 'ทำงานประจำในโรงงาน รายได้ปานกลาง ได้รับผลกระทบจากค่าครองชีพที่สูงขึ้น จึงอาศัยสิทธิช่วยจ่าย 60/40 เพื่อลดภาระค่าใช้จ่าย',
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
    classPerk: 'แรงงานขยันขันแข็ง: ทำงานล่วงเวลาเพื่อหารายได้เสริมรับมือค่าครองชีพ'
  },
  {
    id: 'citizen_3',
    roleType: 'general_citizen',
    className: 'พนักงาน / แรงงานทั่วไป',
    title: 'กานต์ ไรเดอร์ส่งของ',
    subTitle: 'ไรเดอร์ส่งอาหารและพัสดุ',
    description: 'ทำงานอิสระ รายได้ขึ้นอยู่กับจำนวนรอบที่วิ่ง ได้รับประโยชน์เมื่อมีเงินหมุนเวียนในระบบและคนสั่งซื้อสินค้ามากขึ้น',
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
    classPerk: 'ไรเดอร์ส่งของ: รับงานส่งอาหารและของใช้ รายได้เพิ่มขึ้นตามการบริโภค'
  },

  // 3 Vulnerable Grassroots (กลุ่มเปราะบาง / ผู้มีรายได้น้อย)
  {
    id: 'vulnerable_1',
    roleType: 'vulnerable_group',
    className: 'กลุ่มเปราะบาง / ผู้มีรายได้น้อย',
    title: 'ยายแม้น ผู้สูงอายุ',
    subTitle: 'ผู้สูงวัยในชุมชน / ไม่มีสมาร์ตโฟน',
    description: 'ไม่มีสมาร์ตโฟนและใช้แอปไม่เป็น รัฐบาลจึงโอนเงินสวัสดิการช่วยเหลือเข้าบัญชีธนาคารโดยตรงเดือนละ 1,000 บาท',
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
    classPerk: 'สวัสดิการโอนตรง: ได้รับเงินช่วยเหลือเข้าบัญชีโดยตรง ไม่จำเป็นต้องมีสมาร์ตโฟน'
  },
  {
    id: 'vulnerable_2',
    roleType: 'vulnerable_group',
    className: 'กลุ่มเปราะบาง / ผู้มีรายได้น้อย',
    title: 'น้าชิด ผู้ถือบัตรสวัสดิการ',
    subTitle: 'ผู้มีรายได้น้อย / รับจ้างทั่วไป',
    description: 'ถือบัตรสวัสดิการแห่งรัฐ ใช้รูดซื้อข้าวสารอาหารแห้งที่ร้านธงฟ้าและร้านชุมชน ได้รับเงินช่วยเหลือเพิ่มเดือนละ 700 บาท (รวมเป็น 1,000 บาท)',
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
    classPerk: 'บัตรสวัสดิการแห่งรัฐ: ใช้วงเงินซื้อของกินของใช้จำเป็นที่ร้านธงฟ้าได้ทุกเดือน'
  },
  {
    id: 'vulnerable_3',
    roleType: 'vulnerable_group',
    className: 'กลุ่มเปราะบาง / ผู้มีรายได้น้อย',
    title: 'ลุงอินทร์ เกษตรกรรายย่อย',
    subTitle: 'เกษตรกรรายย่อย / ทำไร่ทำนา',
    description: 'รายได้ขึ้นอยู่กับฤดูกาลและราคาพืชผล ได้รับผลกระทบจากราคาปุ๋ยและน้ำมันที่แพงขึ้น อาศัยเงินช่วยเหลือจากรัฐเพื่อพยุงครอบครัว',
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
    classPerk: 'เงินช่วยเหลือเกษตรกร: ได้รับเงินชดเชยเยียวยาเมื่อราคาผลผลิตตกต่ำหรือเจอภัยแล้ง'
  }
];

// 6 Campaign Rounds mapped directly to Academic PDF
const ROUNDS_DATA = [
  {
    round: 1,
    chapterName: 'รอบที่ 1: เริ่มต้นในระบบเศรษฐกิจตลาดเสรี',
    subTitle: 'การกระจายผลตอบแทนตามปัจจัยการผลิต (เงินทุน, แรงงาน, และการประกอบการ)',
    lore: 'ทุกคนเริ่มต้นทำงานและประกอบอาชีพในระบบเศรษฐกิจตลาดเสรี ผลตอบแทนถูกจัดสรรตามเงินทุน ที่ดิน ค่าจ้างแรงงาน และกำไรจากการค้าขาย แต่เนื่องจากเงินทุนสามารถสร้างผลตอบแทนได้เร็วกว่าค่าแรง ทำให้ความเหลื่อมล้ำทางรายได้เริ่มค่อยๆ ก่อตัวขึ้น',
    energyCostIndex: 1.0,
    governmentStimulus: 0,
    publicDebtChange: 0,
    defaultDc: 11,
    newsAlert: '📌 ตลาดเติบโตตามกลไกเสรี: เจ้าของธุรกิจขนาดใหญ่สร้างผลกำไรได้เร็วกว่าอัตราค่าจ้างแรงงานทั่วไป',
    recommendedAction: 'เลือกแผนการทำงาน: แรงงานทำงานหารายได้, ร้านค้าเตรียมสต็อกสินค้า, นายทุนลงทุนขยายกิจการ'
  },
  {
    round: 2,
    chapterName: 'รอบที่ 2: วิกฤตราคาพลังงาน & เงินเฟ้อพุ่งสูง',
    subTitle: 'ผลกระทบจากราคาน้ำมันแพง (+35%) กระทบค่าครองชีพและต้นทุนสินค้า',
    lore: 'ราคาน้ำมัน ค่าขนส่ง และราคาอาหารในตลาดโลกปรับตัวสูงขึ้น 35% ส่งผลกระทบโดยตรงต่อค่าครองชีพของประชาชนและกลุ่มเปราะบางอย่างมาก ขณะที่ร้านค้ารายย่อยต้องแบกรับต้นทุนวัตถุดิบที่แพงขึ้น สภาพคล่องทางการเงินเริ่มตึงตัว',
    energyCostIndex: 1.35, // +35% cost of living & supplies
    governmentStimulus: 0,
    publicDebtChange: 0,
    defaultDc: 12,
    newsAlert: '⚠️ ราคาน้ำมันและอาหารพุ่ง +35%! ประชาชนต้องประหยัดค่าใช้จ่าย ร้านค้ารับภาระต้นทุนเพิ่มขึ้น',
    recommendedAction: 'บริหารสภาพคล่องและเงินสดสำรอง เพื่อรับมือกับต้นทุนสินค้าและค่าครองชีพที่สูงขึ้น'
  },
  {
    round: 3,
    chapterName: 'รอบที่ 3: นโยบายคนละชั้น พลัส (60/40) และสวัสดิการแห่งรัฐ',
    subTitle: 'รัฐบาลกู้เงิน 1.75 แสนล้านบาท อัดฉีดกำลังซื้อและช่วยจ่ายค่าครองชีพ',
    lore: 'รัฐบาลประกาศใช้นโยบายกระตุ้นเศรษฐกิจ "คนละชั้น พลัส (60/40)" โดยรัฐช่วยจ่าย 60% และประชาชนจ่ายเอง 40% ผ่านแอปพลิเคชัน พร้อมทั้งโอนเงินช่วยเหลือให้แก่ผู้ถือบัตรสวัสดิการแห่งรัฐ 1,000 บาท/เดือน ช่วยเพิ่มกำลังซื้อให้ประชาชนและสร้างรายได้ให้ร้านค้าในชุมชน',
    energyCostIndex: 1.15,
    governmentStimulus: 175700,
    publicDebtChange: 3.5, // +3.5% Debt-to-GDP
    defaultDc: 10,
    newsAlert: '🎉 รัฐเริ่มโครงการ 60/40! ประชาชนได้ลดค่าใช้จ่าย 60% เงินหมุนเวียนเข้าสู่ร้านค้าชุมชน',
    recommendedAction: 'ประชาชนใช้สิทธิ 60/40 เพื่อประหยัดเงิน ร้านค้าเปิดรับลูกค้าเพื่อเพิ่มยอดขาย'
  },
  {
    round: 4,
    chapterName: 'รอบที่ 4: ภาษีมูลค่าเพิ่ม (VAT 7%) และการเข้าถึงสินเชื่อในระบบ',
    subTitle: 'ภาษีช่วยดึงเงินคืนคลัง และใช้ประวัติรับเงินดิจิทัลยื่นกู้ดอกเบี้ยต่ำ',
    lore: 'การจับจ่ายใช้สอยที่เพิ่มขึ้นทำให้รัฐจัดเก็บภาษีมูลค่าเพิ่ม (VAT 7%) นำเงินกลับเข้าคลังเพื่อลดภาระหนี้สาธารณะ ขณะเดียวกัน ร้านค้าที่มีประวัติการรับชำระเงินดิจิทัลอย่างโปร่งใส สามารถนำข้อมูลรายได้ไปใช้ยื่นขอกู้เงินดอกเบี้ยต่ำในระบบได้ง่ายขึ้น',
    energyCostIndex: 1.05,
    governmentStimulus: 0,
    publicDebtChange: -1.2, // Tax recovery reduces debt pressure
    defaultDc: 12,
    newsAlert: '📊 รัฐเก็บภาษี VAT 7% นำเงินคืนคลัง ร้านค้าที่มีประวัติการเงินชัดเจนได้รับการอนุมัติสินเชื่อดอกเบี้ยต่ำ',
    recommendedAction: 'ร้านค้ายื่นกู้สินเชื่อดอกเบี้ยต่ำเพื่อขยายร้าน ประชาชนจ่ายภาษีตามระดับรายได้'
  },
  {
    round: 5,
    chapterName: 'รอบที่ 5: ธนาคารไร้สาขา (Virtual Bank) & การพัฒนาทักษะอาชีพ',
    subTitle: 'การสร้างโอกาสที่เท่าเทียม ผ่านสินเชื่อดิจิทัล 3% และการเพิ่มทักษะแรงงาน',
    lore: 'รัฐบาลส่งเสริมการจัดตั้งธนาคารไร้สาขา (Virtual Bank) เพื่อให้ประชาชนทั่วไปและกลุ่มเปราะบางเข้าถึงสินเชื่อดอกเบี้ยต่ำ 3% โดยไม่ต้องมีหลักทรัพย์ค้ำประกัน พร้อมทั้งสนับสนุนคอร์สอบรมพัฒนาทักษะวิชาชีพ เพื่อช่วยให้แรงงานมีโอกาสปรับขึ้นเงินเดือนในระยะยาว',
    energyCostIndex: 1.0,
    governmentStimulus: 40000,
    publicDebtChange: 0.5,
    defaultDc: 11,
    newsAlert: '🚀 เปิดตัว Virtual Bank ดอกเบี้ย 3% และโครงการอบรมทักษะแรงงาน ช่วยเพิ่มรายได้ถาวร +25%!',
    recommendedAction: 'แรงงานลงทุนอบรมเพิ่มทักษะเพื่อเพิ่มเงินเดือน ร้านค้ายื่นกู้ต่อยอดธุรกิจ'
  },
  {
    round: 6,
    chapterName: 'รอบที่ 6: สรุปผลลัพธ์ทางเศรษฐกิจ & วินัยการคลัง',
    subTitle: 'ประเมินภาพรวมความเหลื่อมล้ำ (Gini), เส้นโค้งลอเรนซ์, และเพดานหนี้สาธารณะ',
    lore: 'เข้าสู่รอบสุดท้ายของการจำลองนโยบายเศรษฐกิจ ระบบจะประมวลผลเส้นโค้งลอเรนซ์และดัชนีจีนีเพื่อวัดความเหลื่อมล้ำของแต่ละกลุ่ม ตรวจสอบว่าหนี้สาธารณะเกินเพดาน 70% หรือไม่ และประเมินผลลัพธ์ตามแนวคิดความเป็นธรรมทางเศรษฐกิจ',
    energyCostIndex: 1.0,
    governmentStimulus: 0,
    publicDebtChange: 0,
    defaultDc: 10,
    newsAlert: '🏆 จบเกม! ระบบกำลังประมวลผลเส้นโค้งลอเรนซ์ ค่าดัชนีจีนี และสรุปผลสำเร็จของแต่ละกลุ่ม',
    recommendedAction: 'ดูผลลัพธ์ภาพรวมทางเศรษฐกิจ และดูอันดับคะแนนของผู้เล่นในแต่ละบทบาท'
  }
];

// 72 Thematic Actions mapped across 6 Campaign Rounds (4 Roles x 3 Actions x 6 Rounds)
const THEMATIC_ROUND_ACTIONS = {
  1: {
    capitalist: [
      { id: 'r1_cap_expansion', icon: '🏗️', name: 'ขยายสาขาห้างค้าปลีก & สาขาใหม่', desc: 'ลงทุน 40,000 บาท ขยายสาขา เพิ่มรายได้ประจำถาวร +12,000 บ./รอบ (DC 12: ตรวจสอบ CAP)', dc: 12, statKey: 'CAP', actionCategory: 'expansion' },
      { id: 'r1_cap_supply', icon: '🧾', name: 'ดึงร้านค้าเข้าห่วงโซ่ซัพพลายเออร์', desc: 'ลงทุนระบบซัพพลายเออร์และโลจิสติกส์ รับส่วนแบ่งกำไรระยะยาว (DC 10: ตรวจสอบ DIG)', dc: 10, statKey: 'DIG', actionCategory: 'supply_chain' },
      { id: 'r1_cap_invest', icon: '💼', name: 'ถือครองพันธบัตรและสินทรัพย์สภาพคล่อง', desc: 'รับดอกเบี้ยปลอดภัย 5% เสริมเกราะป้องกันทางการเงิน (DC 8: ตรวจสอบ INF)', dc: 8, statKey: 'INF', actionCategory: 'investment' }
    ],
    sme_vendor: [
      { id: 'r1_sme_sales', icon: '🏪', name: 'จัดหน้าร้านดึงดูดลูกค้าชุมชน', desc: 'ปรับปรุงการบริการและสต็อกสินค้า ยอดขายเพิ่มขึ้นทันที (DC 10: ตรวจสอบ LAB)', dc: 10, statKey: 'LAB', actionCategory: 'sales' },
      { id: 'r1_sme_credit', icon: '🏦', name: 'ขอเปิดวงเงินเบิกเกินบัญชีขยายร้าน', desc: 'ยื่นกู้สถาบันการเงินเพื่อเสริมสภาพคล่องร้านค้า (DC 12: ตรวจสอบ INF)', dc: 12, statKey: 'INF', actionCategory: 'credit' },
      { id: 'r1_sme_restock', icon: '📦', name: 'สั่งซื้อสินค้าอุปโภคบริโภคราคาส่ง', desc: 'บริหารสต็อก ป้องกันความเสี่ยงราคาปรับตัว (DC 9: ตรวจสอบ CAP)', dc: 9, statKey: 'CAP', actionCategory: 'restock' }
    ],
    general_citizen: [
      { id: 'r1_cit_work', icon: '💼', name: 'ทำงานล่วงเวลาสะสมเงินออม', desc: 'ขยันทำงานเสริมสร้างรายได้และเงินสดสำรอง (DC 10: ตรวจสอบ LAB)', dc: 10, statKey: 'LAB', actionCategory: 'work' },
      { id: 'r1_cit_copay_sme', icon: '🛒', name: 'ซื้อของใช้ประจำวันจากร้านค้าชุมชน', desc: 'กระจายรายได้สู่เพื่อนบ้าน ได้สินค้าจำเป็นราคาเป็นธรรม (DC 8: ตรวจสอบ INF)', dc: 8, statKey: 'INF', actionCategory: 'copay_sme' },
      { id: 'r1_cit_copay_mall', icon: '🏢', name: 'ช้อปปิ้งห้างค้าปลีกขนาดใหญ่', desc: 'ซื้อสินค้าครบครันสะดวกสบาย เงินหมุนเวียนสู่ธุรกิจขนาดใหญ่ (DC 7: ตรวจสอบ CAP)', dc: 7, statKey: 'CAP', actionCategory: 'copay_mall' }
    ],
    vulnerable_group: [
      { id: 'r1_vul_welfare', icon: '💳', name: 'รูดบัตรสวัสดิการแห่งรัฐซื้อของกินจำเป็น', desc: 'รับสิทธิ์สวัสดิการข้าวสารอาหารแห้ง 1,000 บาทฟรี (DC 6: ตรวจสอบ INF)', dc: 6, statKey: 'INF', actionCategory: 'welfare_direct' },
      { id: 'r1_vul_essentials', icon: '🍚', name: 'ซื้อของยังชีพที่ร้านธงฟ้าชุมชน', desc: 'เลือกซื้อสินค้าควบคุมราคาเพื่อลดภาระค่าใช้จ่ายในครอบครัว (DC 8: ตรวจสอบ LAB)', dc: 8, statKey: 'LAB', actionCategory: 'welfare_shop' },
      { id: 'r1_vul_digital', icon: '📱', name: 'ขอความช่วยเหลือชุมชนยืนยันตัวตน', desc: 'ให้อาสาสมัครช่วยลงทะเบียนรับสิทธิ์เงินอุดหนุนของรัฐ (DC 9: ตรวจสอบ DIG)', dc: 9, statKey: 'DIG', actionCategory: 'digital_help' }
    ]
  },
  2: {
    capitalist: [
      { id: 'r2_cap_freeze', icon: '🏷️', name: 'ตรึงราคาสินค้าเพื่อแย่งส่วนแบ่งตลาด', desc: 'ใช้เงินทุนสำรองตรึงราคาสินค้า ดึงดูดลูกค้าจากทั่วสารทิศ (DC 12: ตรวจสอบ CAP)', dc: 12, statKey: 'CAP', actionCategory: 'expansion' },
      { id: 'r2_cap_green_logistics', icon: '🚚', name: 'ปรับปรุงโลจิสติกส์ลดต้นทุนน้ำมัน', desc: 'ลงทุนระบบกระจายสินค้าประหยัดพลังงาน ลดค่าใช้จ่ายระยะยาว (DC 11: ตรวจสอบ DIG)', dc: 11, statKey: 'DIG', actionCategory: 'supply_chain' },
      { id: 'r2_cap_gold_hedge', icon: '🪙', name: 'ถือครองทองคำและสินทรัพย์กันเงินเฟ้อ', desc: 'กระจายความเสี่ยงพอร์ตการเงิน ป้องกันมูลค่าเงินสดหดตัว (DC 9: ตรวจสอบ INF)', dc: 9, statKey: 'INF', actionCategory: 'investment' }
    ],
    sme_vendor: [
      { id: 'r2_sme_portion', icon: '🍲', name: 'ปรับขนาดเมนูและคุมราคาอาหาร', desc: 'ลดต้นทุนวัตถุดิบและตรึงราคาอาหาร เพื่อรักษาฐานลูกค้าประจำ (DC 10: ตรวจสอบ LAB)', dc: 10, statKey: 'LAB', actionCategory: 'sales' },
      { id: 'r2_sme_bulk_wholesale', icon: '📦', name: 'รวมกลุ่มร้านค้าสั่งซื้อวัตถุดิบราคาส่ง', desc: 'ลงขันกับร้านข้างเคียงสั่งซื้อน้ำมันและข้าวสารราคาส่ง (DC 9: ตรวจสอบ INF)', dc: 9, statKey: 'INF', actionCategory: 'restock' },
      { id: 'r2_sme_debt_reschedule', icon: '📑', name: 'ขอปรับโครงสร้างหนี้ชั่วคราวสู้เงินเฟ้อ', desc: 'เจรจาขอยืดระยะเวลาชำระหนี้เพื่อรักษาสภาพคล่องร้าน (DC 11: ตรวจสอบ DIG)', dc: 11, statKey: 'DIG', actionCategory: 'credit' }
    ],
    general_citizen: [
      { id: 'r2_cit_budget_cook', icon: '🍳', name: 'ทำอาหารทานเองและประหยัดค่าเดินทาง', desc: 'ลดค่าใช้จ่ายฟุ่มเฟือย ช่วยประหยัดเงินในกระเป๋าทันที (DC 9: ตรวจสอบ LAB)', dc: 9, statKey: 'LAB', actionCategory: 'work' },
      { id: 'r2_cit_cheap_eats', icon: '🍜', name: 'อุดหนุนร้านอาหารชุมชนราคาประหยัด', desc: 'กินอาหารร้านป้าเพ็ญราคาย่อมเยา ช่วยพยุงร้านค้าในท้องถิ่น (DC 8: ตรวจสอบ INF)', dc: 8, statKey: 'INF', actionCategory: 'copay_sme' },
      { id: 'r2_cit_side_gig', icon: '🛵', name: 'หารายได้เสริมขับรถรับส่งช่วงวันหยุด', desc: 'ใช้เวลาว่างรับจ็อบพิเศษ ชดเชยค่าครองชีพที่พุ่งสูง (DC 11: ตรวจสอบ LAB)', dc: 11, statKey: 'LAB', actionCategory: 'skill_up' }
    ],
    vulnerable_group: [
      { id: 'r2_vul_utility_subsidy', icon: '💡', name: 'ขอรับการลดหย่อนค่าน้ำ-ค่าไฟฉุกเฉิน', desc: 'ยื่นเรื่องขอรับเงินชดเชยค่าสาธารณูปโภคจากภาครัฐ (DC 8: ตรวจสอบ LAB)', dc: 8, statKey: 'LAB', actionCategory: 'digital_help' },
      { id: 'r2_vul_ration_card', icon: '🍚', name: 'ใช้สิทธิบัตรสวัสดิการตรึงราคาสินค้า', desc: 'รูดซื้อข้าวสารน้ำมันพืชในราคาควบคุมพิเศษที่ร้านธงฟ้า (DC 7: ตรวจสอบ INF)', dc: 7, statKey: 'INF', actionCategory: 'welfare_shop' },
      { id: 'r2_vul_emergency_bag', icon: '📦', name: 'ขอรับถุงยังชีพและอาหารแห้งฉุกเฉิน', desc: 'รับข้าวสารอาหารแห้งจากมูลนิธิและกองทุนหมู่บ้าน (DC 6: ตรวจสอบ LAB)', dc: 6, statKey: 'LAB', actionCategory: 'welfare_direct' }
    ]
  },
  3: {
    capitalist: [
      { id: 'r3_cap_copay_campaign', icon: '🛍️', name: 'จัดโปรโมชันใหญ่รับกระแสเงิน 60/40', desc: 'ขยายกำลังผลิตและสต็อกสินค้า รับเม็ดเงินหมุนเวียน 1.75 แสนล้าน (DC 11: ตรวจสอบ CAP)', dc: 11, statKey: 'CAP', actionCategory: 'expansion' },
      { id: 'r3_cap_pos_system', icon: '💻', name: 'ลงทุนระบบ POS และแอปพลิเคชันสาขา', desc: 'เพิ่มความเร็วการรับชำระเงินดิจิทัล ดึงดูดลูกค้าและลดหย่อนภาษี (DC 10: ตรวจสอบ DIG)', dc: 10, statKey: 'DIG', actionCategory: 'supply_chain' },
      { id: 'r3_cap_retail_bonds', icon: '📈', name: 'ลงทุนหุ้นและพันธบัตรกลุ่มอุปโภคบริโภค', desc: 'เก็งกำไรรับผลบวกจากการบริโภคภายในประเทศที่ฟื้นตัว (DC 9: ตรวจสอบ INF)', dc: 9, statKey: 'INF', actionCategory: 'investment' }
    ],
    sme_vendor: [
      { id: 'r3_sme_copay_surge', icon: '📱', name: 'เปิดรับสแกนแอปถุงเงิน 60/40 เต็มสูบ', desc: 'ลูกค้าแห่ใช้สิทธิ์ช่วยจ่าย ยอดขายพุ่งกระฉูดเป็น 2 เท่าตัว (DC 9: ตรวจสอบ DIG)', dc: 9, statKey: 'DIG', actionCategory: 'sales' },
      { id: 'r3_sme_stock_rush', icon: '🛒', name: 'กู้เงินทุนหมุนเวียนสต็อกสินค้ารับโครงการ', desc: 'เพิ่มสต็อกสินค้าขายดีให้เพียงพอกับความต้องการลูกค้า (DC 10: ตรวจสอบ INF)', dc: 10, statKey: 'INF', actionCategory: 'credit' },
      { id: 'r3_sme_expand_menu', icon: '🍱', name: 'เพิ่มความหลากหลายของสินค้าและเมนู', desc: 'เปิดตัวเมนูใหม่ดึงดูดลูกค้าสิทธิ์ 60/40 ให้กลับมาซื้อซ้ำ (DC 9: ตรวจสอบ CAP)', dc: 9, statKey: 'CAP', actionCategory: 'restock' }
    ],
    general_citizen: [
      { id: 'r3_cit_copay_local', icon: '🛍️', name: 'ใช้สิทธิ 60/40 ซื้อของร้านค้าชุมชน', desc: 'จ่ายเอง 40% รัฐออกให้ 60% ประหยัดเงิน ได้ของมูลค่า 3,000 บ.! (DC 8: ตรวจสอบ DIG)', dc: 8, statKey: 'DIG', actionCategory: 'copay_sme' },
      { id: 'r3_cit_copay_hyper', icon: '🛒', name: 'ใช้สิทธิ 60/40 ซื้อของใช้ห้างใหญ่', desc: 'ซื้อของตุนเข้าบ้านราคาประหยัด เงินส่วนใหญ่ไหลเข้าธุรกิจขนาดใหญ่ (DC 8: ตรวจสอบ CAP)', dc: 8, statKey: 'CAP', actionCategory: 'copay_mall' },
      { id: 'r3_cit_save_diff', icon: '💰', name: 'ออมเงินส่วนต่างที่ประหยัดได้ 60%', desc: 'นำเงินที่ประหยัดได้จากโครงการไปฝากธนาคารสะสมเป็นทุนสำรอง (DC 8: ตรวจสอบ INF)', dc: 8, statKey: 'INF', actionCategory: 'work' }
    ],
    vulnerable_group: [
      { id: 'r3_vul_card_topup', icon: '💳', name: 'รับเงินโอนสวัสดิการแห่งรัฐ 1,000 บาท', desc: 'เงินโอนตรงเข้าบัตรสวัสดิการ ใช้จ่ายซื้อของกินของใช้ได้ทันที (DC 6: ตรวจสอบ INF)', dc: 6, statKey: 'INF', actionCategory: 'welfare_direct' },
      { id: 'r3_vul_shop_full', icon: '🍚', name: 'รูดซื้อข้าวสารอาหารแห้งเต็มวงเงิน', desc: 'ได้ของกินของใช้จำเป็นครบถ้วน ยกระดับคุณภาพชีวิตในครอบครัว (DC 7: ตรวจสอบ LAB)', dc: 7, statKey: 'LAB', actionCategory: 'welfare_shop' },
      { id: 'r3_vul_aide_register', icon: '🤝', name: 'ให้อาสาสมัครช่วยเช็กสิทธิเงินโอนพิเศษ', desc: 'ยืนยันตัวตนผ่านแอปเพื่อรับเงินช่วยเหลือค่าสาธารณูปโภคเพิ่ม (DC 8: ตรวจสอบ DIG)', dc: 8, statKey: 'DIG', actionCategory: 'digital_help' }
    ]
  },
  4: {
    capitalist: [
      { id: 'r4_cap_etax_compliance', icon: '🧾', name: 'เข้าระบบ e-Tax Invoice เพื่อลดหย่อนภาษี', desc: 'ออกใบกำกับภาษีอิเล็กทรอนิกส์ ลดหย่อนภาษีนิติบุคคลอย่างถูกกฎหมาย (DC 10: ตรวจสอบ DIG)', dc: 10, statKey: 'DIG', actionCategory: 'supply_chain' },
      { id: 'r4_cap_machinery_invest', icon: '⚙️', name: 'ลงทุนเครื่องจักรใหม่และระบบออโตเมชัน', desc: 'นำค่าเสื่อมราคาไปหักภาษี เพิ่มประสิทธิภาพการผลิตถาวร (DC 12: ตรวจสอบ CAP)', dc: 12, statKey: 'CAP', actionCategory: 'expansion' },
      { id: 'r4_cap_tax_planning', icon: '📊', name: 'บริหารภาษีเงินได้นิติบุคคลอย่างมีธรรมาภิบาล', desc: 'วางแผนภาษีถูกต้อง รักษาวินัยการเงินและได้รับเครดิตเรตติ้งดีเยี่ยม (DC 9: ตรวจสอบ INF)', dc: 9, statKey: 'INF', actionCategory: 'investment' }
    ],
    sme_vendor: [
      { id: 'r4_sme_digital_credit', icon: '🏦', name: 'ใช้ประวัติแอปถุงเงินยื่นกู้ดอกเบี้ยต่ำ', desc: 'นำข้อมูลยอดขายในระบบไปยื่นขอกู้สินเชื่อดอกเบี้ยต่ำสำเร็จ (DC 10: ตรวจสอบ DIG)', dc: 10, statKey: 'DIG', actionCategory: 'credit' },
      { id: 'r4_sme_tax_invoice', icon: '📄', name: 'ออกใบกำกับภาษีง่ายดายดึงลูกค้าออฟฟิศ', desc: 'อำนวยความสะดวกให้ลูกค้าบริษัทนำไปเบิก เพิ่มยอดขายบิลใหญ่ (DC 9: ตรวจสอบ LAB)', dc: 9, statKey: 'LAB', actionCategory: 'sales' },
      { id: 'r4_sme_input_tax', icon: '🧮', name: 'บริหารภาษีซื้อภาษีขายเคลมเงินคืน', desc: 'จัดเก็บใบเสร็จค่าสินค้าเพื่อขอเครดิตภาษีซื้อคืน ช่วยลดต้นทุน (DC 9: ตรวจสอบ CAP)', dc: 9, statKey: 'CAP', actionCategory: 'restock' }
    ],
    general_citizen: [
      { id: 'r4_cit_tax_refund', icon: '💵', name: 'ยื่นภาษีเงินได้และขอเงินคืนภาษี', desc: 'ใช้สิทธิลดหย่อนค่าลดหย่อนครอบครัวและประกัน ได้เงินภาษีคืน (DC 9: ตรวจสอบ DIG)', dc: 9, statKey: 'DIG', actionCategory: 'work' },
      { id: 'r4_cit_vat_receipt', icon: '🧾', name: 'ซื้อของร้านค้าที่ออกใบกำกับภาษีได้', desc: 'สะสมใบกำกับภาษีเพื่อใช้ลดหย่อนภาษีปลายปี (DC 8: ตรวจสอบ INF)', dc: 8, statKey: 'INF', actionCategory: 'copay_sme' },
      { id: 'r4_cit_tax_deduct_course', icon: '📚', name: 'ลงเรียนคอร์สวิชาชีพนำมาลดหย่อนภาษี', desc: 'พัฒนาทักษะตนเองและได้สิทธิลดหย่อนภาษี 2 เท่า (DC 11: ตรวจสอบ LAB)', dc: 11, statKey: 'LAB', actionCategory: 'skill_up' }
    ],
    vulnerable_group: [
      { id: 'r4_vul_tax_welfare_help', icon: '🤝', name: 'ขอคำปรึกษาศูนย์สวัสดิการชุมชน', desc: 'ให้อาสาสมัครตรวจสอบสิทธิประโยชน์และเงินช่วยเหลือเพิ่มเติม (DC 8: ตรวจสอบ DIG)', dc: 8, statKey: 'DIG', actionCategory: 'digital_help' },
      { id: 'r4_vul_vat_free_market', icon: '🌾', name: 'ซื้อสินค้าเกษตรปลอดภาษีในตลาดนัด', desc: 'ซื้อพืชผักพื้นบ้านราคาถูก ปลอดภาษีมูลค่าเพิ่ม ช่วยประหยัดเงิน (DC 7: ตรวจสอบ LAB)', dc: 7, statKey: 'LAB', actionCategory: 'welfare_shop' },
      { id: 'r4_vul_welfare_continuity', icon: '💳', name: 'ยืนยันสิทธิรับเงินอุดหนุนเพื่อยังชีพต่อเนื่อง', desc: 'รักษาคุณสมบัติรับเงินโอนสวัสดิการต่อเนื่องทุกเดือน (DC 7: ตรวจสอบ INF)', dc: 7, statKey: 'INF', actionCategory: 'welfare_direct' }
    ]
  },
  5: {
    capitalist: [
      { id: 'r5_cap_fintech_partner', icon: '🌐', name: 'ร่วมทุนจัดตั้งธนาคารไร้สาขา Virtual Bank', desc: 'ลงทุนในโครงสร้างพื้นฐานการเงินดิจิทัล รับผลตอบแทนระยะยาว (DC 11: ตรวจสอบ DIG)', dc: 11, statKey: 'DIG', actionCategory: 'investment' },
      { id: 'r5_cap_ai_cloud', icon: '🤖', name: 'พัฒนาระบบคลาวด์และ AI ในห่วงโซ่ธุรกิจ', desc: 'นำ AI มาวิเคราะห์สต็อกและลดต้นทุนดำเนินการลง 20% (DC 12: ตรวจสอบ CAP)', dc: 12, statKey: 'CAP', actionCategory: 'expansion' },
      { id: 'r5_cap_sme_syndicate', icon: '🤝', name: 'สร้างเครือข่ายพันธมิตรร้านค้าชุมชน', desc: 'สนับสนุนร้านค้ารายย่อยเข้าเป็นจุดรับส่งสินค้า เสริมเครือข่ายธุรกิจ (DC 10: ตรวจสอบ INF)', dc: 10, statKey: 'INF', actionCategory: 'supply_chain' }
    ],
    sme_vendor: [
      { id: 'r5_sme_virtual_loan', icon: '📲', name: 'ยื่นกู้ Virtual Bank ดอกเบี้ย 3% ต่อยอดร้าน', desc: 'ใช้ข้อมูลการขายดิจิทัลกู้เงิน 30,000 บาท ดอกเบี้ยต่ำพิเศษ (DC 9: ตรวจสอบ DIG)', dc: 9, statKey: 'DIG', actionCategory: 'credit' },
      { id: 'r5_sme_online_delivery', icon: '🛵', name: 'เปิดขายออนไลน์และเดลิเวอรีในชุมชน', desc: 'ขยายฐานลูกค้าผ่านแอปส่งอาหาร ยอดสั่งซื้อเพิ่มขึ้นอย่างชัดเจน (DC 10: ตรวจสอบ DIG)', dc: 10, statKey: 'DIG', actionCategory: 'sales' },
      { id: 'r5_sme_new_product', icon: '✨', name: 'พัฒนาสูตรและแพ็กเกจจิ้งสินค้าใหม่', desc: 'สร้างมูลค่าเพิ่มให้สินค้าประจำร้านเพื่อขยับราคาและกำไร (DC 9: ตรวจสอบ LAB)', dc: 9, statKey: 'LAB', actionCategory: 'restock' }
    ],
    general_citizen: [
      { id: 'r5_cit_upskill_career', icon: '🎓', name: 'เข้าคอร์สอบรม Upskill ปรับขึ้นเงินเดือน +25%', desc: 'อบรมหลักสูตรวิชาชีพเฉพาะทาง ได้เลื่อนขั้นเงินเดือนถาวร (DC 11: ตรวจสอบ LAB)', dc: 11, statKey: 'LAB', actionCategory: 'skill_up' },
      { id: 'r5_cit_virtual_deposit', icon: '🏦', name: 'เปิดบัญชีดิจิทัลดอกเบี้ยสูงใน Virtual Bank', desc: 'ออมเงินในบัญชีดอกเบี้ยสูงพิเศษ 2.5% เสริมความมั่งคั่ง (DC 8: ตรวจสอบ DIG)', dc: 8, statKey: 'DIG', actionCategory: 'work' },
      { id: 'r5_cit_tech_tools', icon: '💻', name: 'ซื้ออุปกรณ์ดิจิทัลราคาพิเศษเพื่อต่อยอดงาน', desc: 'ลงทุนซื้อแท็บเล็ต/คอมพิวเตอร์เพื่อรับงานฟรีแลนซ์เสริม (DC 8: ตรวจสอบ CAP)', dc: 8, statKey: 'CAP', actionCategory: 'copay_sme' }
    ],
    vulnerable_group: [
      { id: 'r5_vul_micro_credit', icon: '🪙', name: 'ยื่นกู้ไมโครไฟแนนซ์ 3% ปลดหนี้นอกระบบ', desc: 'เข้าถึงสินเชื่อในระบบดอกเบี้ยต่ำ หลุดพ้นวงจรหนี้นอกระบบ (DC 8: ตรวจสอบ DIG)', dc: 8, statKey: 'DIG', actionCategory: 'digital_help' },
      { id: 'r5_vul_vocational_training', icon: '✂️', name: 'ฝึกอบรมอาชีพเสริมของชุมชนสร้างรายได้', desc: 'เรียนรู้ทักษะทำขนม/งานฝีมือเพื่อทำขายสร้างรายได้เข้าบ้าน (DC 8: ตรวจสอบ LAB)', dc: 8, statKey: 'LAB', actionCategory: 'welfare_shop' },
      { id: 'r5_vul_grassroots_fund', icon: '🌱', name: 'รับเงินสนับสนุนกองทุนพัฒนาอาชีพฐานราก', desc: 'ขอรับเงินทุนตั้งต้น 2,000 บาทเพื่อซื้ออุปกรณ์ทำมาหากิน (DC 7: ตรวจสอบ INF)', dc: 7, statKey: 'INF', actionCategory: 'welfare_direct' }
    ]
  },
  6: {
    capitalist: [
      { id: 'r6_cap_csr_community', icon: '🏛️', name: 'จัดตั้งกองทุนพัฒนาชุมชนและสิ่งแวดล้อม', desc: 'จัดสรรผลกำไรตอบแทนสังคม ลดความเหลื่อมล้ำและเสริมชื่อเสียง (DC 10: ตรวจสอบ INF)', dc: 10, statKey: 'INF', actionCategory: 'supply_chain' },
      { id: 'r6_cap_portfolio_balance', icon: '⚖️', name: 'ปรับสมดุลพอร์ตสินทรัพย์ระยะยาว', desc: 'รักษาสภาพคล่องและความมั่นคงทางการเงินเพื่อความยั่งยืน (DC 10: ตรวจสอบ CAP)', dc: 10, statKey: 'CAP', actionCategory: 'investment' },
      { id: 'r6_cap_sustainable_expand', icon: '🏢', name: 'ขยายการลงทุนเพื่อสร้างงานในท้องถิ่น', desc: 'เปิดศูนย์กระจายสินค้าเพิ่ม จ้างงานคนในชุมชนอย่างทั่วถึง (DC 11: ตรวจสอบ CAP)', dc: 11, statKey: 'CAP', actionCategory: 'expansion' }
    ],
    sme_vendor: [
      { id: 'r6_sme_clear_debt', icon: '💳', name: 'ชำระคืนเงินกู้รักษาวินัยการเงินดีเด่น', desc: 'นำกำไรสะสมมาปิดยอดหนี้ รักษาสภาพคล่องและเครดิตยอดเยี่ยม (DC 9: ตรวจสอบ LAB)', dc: 9, statKey: 'LAB', actionCategory: 'credit' },
      { id: 'r6_sme_loyal_customers', icon: '🤝', name: 'จัดกิจกรรมขอบคุณลูกค้าสร้างสายสัมพันธ์ยั่งยืน', desc: 'มอบส่วนลดพิเศษให้ลูกค้าประจำ รักษาฐานลูกค้าระยะยาว (DC 8: ตรวจสอบ INF)', dc: 8, statKey: 'INF', actionCategory: 'sales' },
      { id: 'r6_sme_community_hub', icon: '🏪', name: 'พัฒนาหน้าร้านเป็นศูนย์รวมสินค้าชุมชน', desc: 'รับฝากสินค้าเพื่อนบ้านมาขาย ช่วยสร้างรายได้หมุนเวียนในหมู่บ้าน (DC 9: ตรวจสอบ CAP)', dc: 9, statKey: 'CAP', actionCategory: 'restock' }
    ],
    general_citizen: [
      { id: 'r6_cit_debt_free', icon: '🎉', name: 'ปลดหนี้สินคงค้างและเพิ่มเงินออมฉุกเฉิน', desc: 'ปิดหนี้บัตรเครดิต มีเงินออมสำรองอุ่นใจพร้อมรับอนาคต (DC 8: ตรวจสอบ INF)', dc: 8, statKey: 'INF', actionCategory: 'work' },
      { id: 'r6_cit_future_fund', icon: '📊', name: 'วางแผนกองทุนสำรองเลี้ยงชีพเพื่อความมั่นคง', desc: 'จัดสรรรายได้สะสมเข้ากองทุนระยะยาวเพื่อครอบครัว (DC 9: ตรวจสอบ LAB)', dc: 9, statKey: 'LAB', actionCategory: 'skill_up' },
      { id: 'r6_cit_support_local', icon: '🏘️', name: 'สนับสนุนร้านค้าชุมชนสร้างเศรษฐกิจหมุนเวียน', desc: 'ซื้อสินค้าท้องถิ่น ช่วยกระจายรายได้และลดความเหลื่อมล้ำในสังคม (DC 8: ตรวจสอบ DIG)', dc: 8, statKey: 'DIG', actionCategory: 'copay_sme' }
    ],
    vulnerable_group: [
      { id: 'r6_vul_savings_group', icon: '🪙', name: 'รวมกลุ่มออมทรัพย์ชุมชนเพื่อพึ่งพาตนเอง', desc: 'นำเงินออมสัจจะสะสมร่วมกับเพื่อนบ้าน สร้างตาข่ายความปลอดภัย (DC 7: ตรวจสอบ INF)', dc: 7, statKey: 'INF', actionCategory: 'welfare_direct' },
      { id: 'r6_vul_stable_livelihood', icon: '🏡', name: 'รักษาอาชีพเสริมที่มั่นคงมีรายได้สม่ำเสมอ', desc: 'ประกอบอาชีพสุจริต มีรายได้พอกินพอใช้ หลุดพ้นความยากจน (DC 8: ตรวจสอบ LAB)', dc: 8, statKey: 'LAB', actionCategory: 'welfare_shop' },
      { id: 'r6_vul_welfare_security', icon: '🛡️', name: 'ขึ้นทะเบียนรับสิทธิสวัสดิการระยะยาว', desc: 'เข้าถึงสิทธิบัตรทองและเบี้ยยังชีพอย่างครบถ้วนและยั่งยืน (DC 8: ตรวจสอบ DIG)', dc: 8, statKey: 'DIG', actionCategory: 'digital_help' }
    ]
  }
};

// Helper: Calculate D&D Stat Modifier from score (e.g. 10 -> +0, 14 -> +2, 18 -> +4, 6 -> -2)
function getModifier(statValue) {
  return Math.floor((statValue - 10) / 2);
}

module.exports = {
  ROLE_TEMPLATES,
  ROUNDS_DATA,
  THEMATIC_ROUND_ACTIONS,
  getModifier
};
