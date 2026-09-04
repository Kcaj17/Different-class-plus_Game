// Economics Engine: Lorenz Curve & Gini Calculation
function calculateLorenzAndGini(players) {
  if (!players || players.length === 0) {
    return {
      gini: 0,
      lorenzPoints: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      totalWealth: 0,
      shares: []
    };
  }

  // Sort players by total wealth (cash + business assets)
  const sorted = [...players].map(p => ({
    id: p.id,
    name: p.name || p.title,
    roleType: p.roleType,
    wealth: Math.max(0, p.cash + (p.businessValue || 0))
  })).sort((a, b) => a.wealth - b.wealth);

  const n = sorted.length;
  const totalWealth = sorted.reduce((sum, p) => sum + p.wealth, 0);

  if (totalWealth === 0) {
    return {
      gini: 0,
      lorenzPoints: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
      totalWealth: 0,
      shares: []
    };
  }

  // Cumulative calculation
  let cumWealth = 0;
  const lorenzPoints = [{ x: 0, y: 0 }];
  const shares = [];

  for (let i = 0; i < n; i++) {
    cumWealth += sorted[i].wealth;
    const popPct = ((i + 1) / n) * 100;
    const wealthPct = (cumWealth / totalWealth) * 100;
    lorenzPoints.push({
      x: Number(popPct.toFixed(1)),
      y: Number(wealthPct.toFixed(1))
    });
    shares.push({
      id: sorted[i].id,
      name: sorted[i].name,
      roleType: sorted[i].roleType,
      wealth: sorted[i].wealth,
      sharePercent: Number(((sorted[i].wealth / totalWealth) * 100).toFixed(1))
    });
  }

  // Gini Calculation using standard discrete formula
  // G = (2 * Sum(i * y_i) - (n + 1) * Sum(y_i)) / (n * Sum(y_i))
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (i + 1) * sorted[i].wealth;
  }

  const gini = (2 * weightedSum - (n + 1) * totalWealth) / (n * totalWealth);
  const normalizedGini = Math.max(0, Math.min(1, Number(gini.toFixed(3))));

  return {
    gini: normalizedGini,
    lorenzPoints,
    totalWealth,
    shares
  };
}

// Calculate Final Philosophy Benchmark Awards & Winners
function evaluateFinalResults(room) {
  const players = room.players;
  const eco = calculateLorenzAndGini(players);

  // 1. Utilitarianism (Max Total Utility / Society Happiness)
  const totalQoL = players.reduce((sum, p) => sum + p.qol, 0);
  const avgQoL = Number((totalQoL / players.length).toFixed(1));

  // 2. Rawlsianism (Utility of the Worst-Off Person in Lower/Vulnerable Strata)
  const vulnerableAndLabor = players.filter(p => p.roleType === 'vulnerable_group' || p.roleType === 'general_citizen');
  const sortedByQoL = [...vulnerableAndLabor].sort((a, b) => a.qol - b.qol);
  const worstOff = sortedByQoL[0] || players[0];

  // 3. Equality of Opportunity Score
  const vulnerableGroup = players.filter(p => p.roleType === 'vulnerable_group');
  const avgVulnerableQoL = Number((vulnerableGroup.reduce((s, p) => s + p.qol, 0) / vulnerableGroup.length).toFixed(1));

  // Role Winners
  const capitalist = players.find(p => p.roleType === 'capitalist');
  const topSme = [...players.filter(p => p.roleType === 'sme_vendor')].sort((a, b) => (b.cash + b.businessValue) - (a.cash + a.businessValue))[0];
  const topCitizen = [...players.filter(p => p.roleType === 'general_citizen')].sort((a, b) => b.qol - a.qol)[0];
  const topVulnerable = [...vulnerableGroup].sort((a, b) => b.qol - a.qol)[0];

  return {
    isCountrySaved: !room.macroStats.crisisAlert,
    finalGini: eco.gini,
    finalDebtToGdp: Number(room.macroStats.debtToGdp.toFixed(1)),
    totalGdp: room.macroStats.gdp,
    lorenzPoints: eco.lorenzPoints,
    shares: eco.shares,
    philosophyAwards: {
      utilitarian: {
        title: 'แนวคิดประโยชน์นิยม (Utilitarianism)',
        score: `${avgQoL}/100`,
        summary: `ความสุขและอรรถประโยชน์รวมของสังคมเฉลี่ย ${avgQoL} คะแนน ยิ่งสูงแสดงว่าผลผลิตและสวัสดิการเฉลี่ยเข้าถึงคนส่วนใหญ่`
      },
      rawlsian: {
        title: 'แนวคิดความยุติธรรมของ Rawls (Rawlsianism)',
        score: `${worstOff.qol}/100 (${worstOff.name})`,
        summary: `คุณภาพชีวิตของบุคคลที่เสียเปรียบที่สุดในสังคม (${worstOff.name}) อยู่ที่ ${worstOff.qol} คะแนน สะท้อนว่าโครงข่ายความปลอดภัยทางสังคม (Social Safety Net) ทำงานได้ดีเพียงใด`
      },
      opportunity: {
        title: 'แนวคิดความเสมอภาคทางโอกาส (Equality of Opportunity)',
        score: `${avgVulnerableQoL}/100`,
        summary: `กลุ่มเปราะบางได้รับการยกระดับคุณภาพชีวิตเฉลี่ย ${avgVulnerableQoL} คะแนน จากนโยบายสวัสดิการตรงและการเข้าถึงระบบดิจิทัล`
      }
    },
    roleWinners: {
      capitalist: capitalist ? { name: capitalist.name, score: (capitalist.cash + capitalist.businessValue).toLocaleString() + ' บาท' } : null,
      sme: topSme ? { name: topSme.name, score: (topSme.cash + topSme.businessValue).toLocaleString() + ' บาท' } : null,
      citizen: topCitizen ? { name: topCitizen.name, score: `สุขภาวะ ${topCitizen.qol} คะแนน` } : null,
      vulnerable: topVulnerable ? { name: topVulnerable.name, score: `สุขภาวะ ${topVulnerable.qol} คะแนน` } : null
    }
  };
}

module.exports = {
  calculateLorenzAndGini,
  evaluateFinalResults
};
