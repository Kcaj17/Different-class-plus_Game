// =========================================================
// aiEngine.js — Gemini AI Dungeon Master for D&D Economics
// Individual 1-on-1 Storyteller & District Campaign Narrator
// =========================================================

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = [
  'gemini-3.7-flash'
];

function isAIEnabled() {
  return !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_google_ai_studio_api_key_here');
}

// System Prompt for AI Economic Assistant
const DND_DM_SYSTEM_PROMPT = `คุณคือระบบวิเคราะห์และบรรยายผลกระทบทางเศรษฐกิจ ในเกมจำลองนโยบายเศรษฐกิจ "คนละชั้น พลัส 60/40"
หน้าที่ของคุณคือ:
1. บรรยายผลการตัดสินใจและการทำงานของผู้เล่นด้วยภาษาไทยที่เป็นธรรมชาติ สุภาพ เป็นกันเอง เข้าใจง่าย เหมือนภาษาที่ใช้พูดคุยหรือข่าวเศรษฐกิจในชีวิตประจำวัน
2. เชื่อมโยงผลลัพธ์กับชีวิตจริง เช่น รายได้ ค่าใช้จ่าย การค้าขาย ยอดขายร้านค้า หรือการใช้สิทธิช่วยจ่าย 60/40
3. ตอบสั้น กระชับ ชัดเจน (ความยาว 2-3 ประโยค ไม่เกิน 180 ตัวอักษร)
4. หากได้คะแนนสูงมาก (20 แต้ม) ให้อธิบายถึงความสำเร็จ ธุรกิจคล่องตัว มีเงินเก็บหรือยอดขายเพิ่มขึ้นชัดเจน
5. หากได้คะแนนต่ำมาก (1 แต้ม) ให้อธิบายถึงอุปสรรค เช่น ต้นทุนเพิ่ม ของแพง หรือรายได้สะดุด
6. ห้ามใช้คำศัพท์แฟนตาซีโบราณ เช่น ร่ายมนตร์, อาณาจักร, ผู้กล้า, ม่านหมอก, คลังหลวง แต่ให้ใช้ภาษาคนทำงานทั่วไป
7. ตอบเป็นข้อความธรรมดา ไม่ต้องใส่ JSON หรือ Markdown`;

// In-memory queue to throttle requests and avoid hitting API rate limits
const requestQueue = [];
let isProcessingQueue = false;

// Fallback lore generator when API key is missing or rate limited
function generateFallbackLore(player, rollResult) {
  const { isNat20, isNat1, isSuccess, actionName, d20, totalScore } = rollResult;
  const name = player.name;
  const cls = player.className;

  if (isNat20) {
    return `🌟 [สำเร็จยอดเยี่ยม! (20 แต้ม)] ${name} (${cls}) ทำตามแผน "${actionName}" ได้ผลดีเกินคาด! ยอดขายและรายได้เพิ่มขึ้นอย่างเห็นได้ชัด การเงินคล่องตัวขึ้นมาก`;
  }
  if (isNat1) {
    return `⚠️ [มีปัญหาติดขัด (1 แต้ม)] ${name} เจอปัญหาในการ "${actionName}" ต้องเผชิญกับต้นทุนที่สูงขึ้นและรายได้สะดุด เงินในกระเป๋าเริ่มตึงตัว ต้องวางแผนให้รอบคอบขึ้นในรอบถัดไป`;
  }
  if (isSuccess) {
    return `✅ [ทำได้สำเร็จ (คะแนน ${totalScore})] ${name} ดำเนินการ "${actionName}" ได้ราบรื่นตามแผน ช่วยเพิ่มรายได้และช่วยให้คุณภาพชีวิตดีขึ้น`;
  }
  return `❌ [ยังไม่เป็นไปตามเป้า (คะแนน ${totalScore})] ${name} พยายาม "${actionName}" แต่เจอภาวะค่าครองชีพและต้นทุนที่ยังสูง ทำให้ผลตอบแทนยังไม่คุ้มค่าเท่าที่ควร`;
}

const { THEMATIC_ROUND_ACTIONS, ROUNDS_DATA } = require('./src/constants/gameData');

// Generate Individual 1-on-1 Story for each player's action
async function generateIndividualDndLore(player, rollResult, districtInfo = {}) {
  if (!isAIEnabled()) {
    return generateFallbackLore(player, rollResult);
  }

  const prompt = `ผู้เล่น: ${player.name}
บทบาท: ${player.className} (${player.title})
แผนงานที่เลือก: ${rollResult.actionName}
ผลคะแนนทอยเต๋า: ${rollResult.d20} (คะแนนรวม ${rollResult.totalScore} vs เกณฑ์เป้าหมาย ${rollResult.dc})
สถานะผลลัพธ์: ${rollResult.isNat20 ? 'สำเร็จยอดเยี่ยม (20 แต้มเต็ม)' : (rollResult.isNat1 ? 'เกิดปัญหาติดขัด (1 แต้ม)' : (rollResult.isSuccess ? 'ทำได้สำเร็จ' : 'ยังไม่ผ่านเกณฑ์'))}
กลุ่ม: ${districtInfo.name || 'กลุ่มเศรษฐกิจ'} (รอบที่ ${districtInfo.round || 1})
ดัชนีความเหลื่อมล้ำ (Gini): ${districtInfo.gini || 0.45}

ให้คุณบรรยายผลกระทบทางเศรษฐกิจสั้นๆ 2-3 ประโยค ด้วยภาษาพูดในชีวิตประจำวันทั่วไปที่เข้าใจง่าย ไม่ใช้คำแฟนตาซี:`;

  try {
    const text = await callGeminiWithFallback(prompt);
    return text.trim();
  } catch (err) {
    console.warn('AI Lore generation fallback triggered:', err.message);
    return generateFallbackLore(player, rollResult);
  }
}

// Generate 3 dynamic actions for each of the 4 roles matching round context
async function generateRoundDynamicActions(roundNumber, roundInfo = {}, districtMacro = {}) {
  const roundIdx = Math.max(1, Math.min(6, roundNumber));
  const defaultFallback = THEMATIC_ROUND_ACTIONS[roundIdx] || THEMATIC_ROUND_ACTIONS[1];

  if (!isAIEnabled()) {
    return defaultFallback;
  }

  const roundData = roundInfo.chapterName ? roundInfo : (ROUNDS_DATA[roundIdx - 1] || {});

  const prompt = `คุณคือนักออกแบบนโยบายและกลยุทธ์ทางเศรษฐกิจในเกมจำลอง "คนละชั้น พลัส 60/40"
บริบทของรอบที่ ${roundIdx}:
- หัวข้อ: ${roundData.chapterName || ''} (${roundData.subTitle || ''})
- ข่าวสถานการณ์: ${roundData.newsAlert || ''}
- เนื้อหา: ${roundData.lore || ''}
- ดัชนีเงินเฟ้อ/ต้นทุนพลังงาน: ${roundData.energyCostIndex || 1.0}
- สภาพเศรษฐกิจกลุ่ม: ดัชนี Gini ${districtMacro.gini || 0.45}, หนี้ต่อ GDP ${districtMacro.debtToGdp || 62}%

จงสร้าง 3 แผนการทำงานที่สอดคล้องกับข่าวและสถานการณ์รอบที่ ${roundIdx} สำหรับทั้ง 4 กลุ่มอาชีพ โดยใช้ภาษาไทยชีวิตประจำวันที่เข้าใจง่าย:
1. capitalist (เจ้าของธุรกิจขนาดใหญ่/นายทุน): actionCategory ต้องเป็น "expansion" หรือ "supply_chain" หรือ "investment"
2. sme_vendor (ร้านค้าชุมชน/SME): actionCategory ต้องเป็น "sales" หรือ "credit" หรือ "restock"
3. general_citizen (พนักงาน/แรงงานทั่วไป): actionCategory ต้องเป็น "copay_sme" หรือ "copay_mall" หรือ "skill_up" หรือ "work"
4. vulnerable_group (กลุ่มเปราะบาง/ผู้มีรายได้น้อย): actionCategory ต้องเป็น "welfare_direct" หรือ "welfare_shop" หรือ "digital_help"

ข้อกำหนด:
- แต่ละกลุ่มต้องมี 3 ทางเลือกที่ไม่ซ้ำกัน
- แต่ละทางเลือกต้องระบุ:
  - "id": รหัสเฉพาะ เช่น "dyn_r${roundIdx}_cap_1"
  - "icon": อีโมจิที่เกี่ยวข้อง 1 ตัว เช่น 🏗️, 🏪, 🛒, 💳
  - "name": ชื่อแผนการทำงานสั้นๆ กระชับ (ภาษาไทย)
  - "desc": คำอธิบายสั้นๆ 1-2 ประโยค ว่าทำอะไร และทำไมถึงช่วยในรอบนี้ (ภาษาไทย)
  - "dc": ตัวเลขความยากระหว่าง 8 ถึง 13
  - "statKey": ตัวย่อสถิติที่ตรวจ ต้องเป็นหนึ่งใน "CAP", "LAB", "INF", "DIG"
  - "actionCategory": หมวดหมู่ผลกระทบตามที่กำหนดด้านบน

ตอบเป็น JSON ล้วนๆ ในรูปแบบ:
{
  "capitalist": [ { "id": "...", "icon": "...", "name": "...", "desc": "...", "dc": 11, "statKey": "CAP", "actionCategory": "expansion" }, ... ],
  "sme_vendor": [ ... ],
  "general_citizen": [ ... ],
  "vulnerable_group": [ ... ]
}`;

  try {
    const rawText = await callGeminiWithFallback(prompt, true);
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Validation: Check if all 4 roles exist and have arrays of at least 3 items
    const roles = ['capitalist', 'sme_vendor', 'general_citizen', 'vulnerable_group'];
    for (const role of roles) {
      if (!Array.isArray(parsed[role]) || parsed[role].length < 3) {
        throw new Error(`Incomplete role actions for ${role}`);
      }
      parsed[role] = parsed[role].slice(0, 3).map((act, i) => ({
        id: act.id || `dyn_r${roundIdx}_${role}_${i + 1}`,
        icon: act.icon || '📌',
        name: act.name || 'แผนการทำงาน',
        desc: act.desc || '',
        dc: Number(act.dc) || 10,
        statKey: ['CAP', 'LAB', 'INF', 'DIG'].includes(String(act.statKey).toUpperCase())
          ? String(act.statKey).toUpperCase()
          : 'LAB',
        actionCategory: act.actionCategory || defaultFallback[role][i]?.actionCategory || 'work'
      }));
    }

    return parsed;
  } catch (err) {
    console.warn(`[AI Engine] Dynamic actions fallback for Round ${roundIdx}:`, err.message);
    return defaultFallback;
  }
}

// Call Google Gemini API
async function callGeminiWithFallback(userPrompt, isJson = false) {
  let lastError = null;

  for (const model of GEMINI_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: isJson ? userPrompt : `${DND_DM_SYSTEM_PROMPT}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: isJson ? 0.4 : 0.7,
            maxOutputTokens: isJson ? 1600 : 800,
            ...(isJson ? { responseMimeType: "application/json" } : {}),
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textPart = parts.find(p => p.text && !p.thought);
      const text = textPart ? textPart.text : (parts[0]?.text || null);
      if (text) return text;
    } catch (err) {
      lastError = err;
      // Continue to next model fallback
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

module.exports = {
  isAIEnabled,
  generateIndividualDndLore,
  generateFallbackLore,
  generateRoundDynamicActions
};
