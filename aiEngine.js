// =========================================================
// aiEngine.js — Gemini AI Dungeon Master for D&D Economics
// Individual 1-on-1 Storyteller & District Campaign Narrator
// =========================================================

require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.7-flash'
];

function isAIEnabled() {
  return !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'your_google_ai_studio_api_key_here');
}

// System Prompt for AI Dungeon Master with Academic Economic Lore
const DND_DM_SYSTEM_PROMPT = `คุณคือ "Dungeon Master (GM) ผู้พิทักษ์กฎแห่งเศรษฐศาสตร์" ประจำเกม D&D Economic Chronicles: คนละชั้น พลัส 60/40
หน้าที่ของคุณคือ:
1. บรรยายผลการกระทำและผลการทอยเต๋า D20 ของผู้เล่นแต่ละคนในน้ำเสียงแนว Tabletop RPG แฟนตาซีผสมสังคมไทยร่วมสมัย
2. สอดแทรกหลักคิดทางเศรษฐศาสตร์จากทฤษฎีการกระจายรายได้, เส้นโค้งลอเรนซ์, สัมประสิทธิ์จีนี, โครงการร่วมจ่าย 60/40, และภาษี VAT 7%
3. ตอบสั้น กระชับ มีพลัง ดึงดูดอารมณ์ (ความยาว 2-3 ประโยค ไม่เกิน 200 ตัวอักษร)
4. ถ้าได้ Natural 20 (Critical Success) ให้พากย์อย่างยิ่งใหญ่ ปาฏิหาริย์สำเร็จสูงสุด
5. ถ้าได้ Natural 1 (Critical Failure) ให้พากย์อย่างมีอารมณ์ขันและสะท้อนความเจ็บปวดจากกับดักความยากจนหรือความล้มเหลวทางเศรษฐกิจ
6. ตอบเป็นข้อความธรรมดา ไม่ต้องใส่ JSON หรือ Markdown ซับซ้อน`;

// In-memory queue to throttle requests and avoid hitting API rate limits
const requestQueue = [];
let isProcessingQueue = false;

// Fallback lore generator when API key is missing or rate limited
function generateFallbackLore(player, rollResult) {
  const { isNat20, isNat1, isSuccess, actionName, d20, totalScore } = rollResult;
  const name = player.name;
  const cls = player.className;

  if (isNat20) {
    return `🌟 [Natural 20!] แสงแห่งโชคชะตาสว่างวาบ! ${name} (${cls}) ปฏิบัติการ "${actionName}" สำเร็จอย่างสมบูรณ์แบบ เงินหมุนสะพัดสร้างพลังบวกให้แก่ตนเองและปลุกขวัญทั้งเขตเศรษฐกิจ!`;
  }
  if (isNat1) {
    return `💀 [Natural 1!] เคราะห์ซ้ำกรรมซัด! ${name} พลาดท่าในการ "${actionName}" เผชิญอุปสรรคสภาพคล่องตึงตัว ค่าครองชีพและภาระหนี้ตามหลอกหลอน ต้องกัดฟันสู้ต่อในรอบถัดไป!`;
  }
  if (isSuccess) {
    return `✅ [สำเร็จ D20:${d20} รวม:${totalScore}] ${name} ร่ายมนตร์ "${actionName}" บรรลุผลตามแผน! กลไกเศรษฐกิจทำงานประสานกันอย่างลงตัว ช่วยหนุนคุณภาพชีวิตและเสริมความมั่นคง`;
  }
  return `❌ [ติดขัด D20:${d20} รวม:${totalScore}] ${name} พยายาม "${actionName}" แต่คลื่นเงินเฟ้อและแรงเสียดทานทางตลาดทำให้ผลตอบแทนไม่เป็นไปตามหวัง ต้องประคับประคองสถานการณ์`;
}

// Generate Individual 1-on-1 Story for each player's action
async function generateIndividualDndLore(player, rollResult, districtInfo = {}) {
  if (!isAIEnabled()) {
    return generateFallbackLore(player, rollResult);
  }

  const prompt = `ผู้เล่น: ${player.name}
คลาส: ${player.className} (${player.title})
การกระทำ: ${rollResult.actionName}
ผลทอย D20: ${rollResult.d20} (แต้มรวม ${rollResult.totalScore} vs DC ${rollResult.dc})
สถานะผลลัพธ์: ${rollResult.isNat20 ? 'Critical Success (Nat 20)' : (rollResult.isNat1 ? 'Critical Failure (Nat 1)' : (rollResult.isSuccess ? 'Success' : 'Failure'))}
เขต: ${districtInfo.name || 'เขตเศรษฐกิจ'} (ไตรมาสที่ ${districtInfo.round || 1})
ดัชนีจีนีปัจจุบัน: ${districtInfo.gini || 0.45}

ให้คุณในฐานะ AI Dungeon Master บรรยายผลการกระทำของตัวละครนี้สั้นๆ 2-3 ประโยคในน้ำเสียง DND สนุกสนานและสอดแทรกเศรษฐศาสตร์:`;

  try {
    const text = await callGeminiWithFallback(prompt);
    return text.trim();
  } catch (err) {
    console.warn('AI Lore generation fallback triggered:', err.message);
    return generateFallbackLore(player, rollResult);
  }
}

// Call Google Gemini API
async function callGeminiWithFallback(userPrompt) {
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
              parts: [{ text: `${DND_DM_SYSTEM_PROMPT}\n\n${userPrompt}` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
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
  generateFallbackLore
};
