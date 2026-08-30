import fs from 'fs';
import path from 'path';

/**
 * Expected Information Gain Engine
 * Ranks proposed research branches scientifically, rather than by profit potential.
 * Goal: Maximize reduction of market uncertainty per unit of resource/DOF.
 */
export class ExpectedInformationGainEngine {
    constructor() {
        this.candidates = [];
    }

    registerCandidate(name, scientificValue, redundancy, cost) {
        let eigScore = 0;
        
        // Naive heuristic mapping
        const valMap = { 'alto': 3, 'muito alto': 4, 'médio': 2, 'baixo': 1 };
        const redMap = { 'baixa': 3, 'média': 2, 'alta': 1 };
        const costMap = { 'baixo': 3, 'médio': 2, 'alto': 1 };
        
        eigScore = (valMap[scientificValue] * redMap[redundancy]) + costMap[cost];

        this.candidates.push({
            name,
            scientificValue,
            redundancy,
            cost,
            eigScore
        });
    }

    rankAndExport(filepath) {
        this.candidates.sort((a, b) => b.eigScore - a.eigScore);
        
        let md = `# EXPECTED INFORMATION GAIN (EIG) RANKING\n\n`;
        md += `*Goal: Prioritize experiments that reduce uncertainty per degree of freedom.* \n\n`;
        
        md += `| Candidate | Scientific Value | Redundancy | Cost | Priority Score |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- |\n`;
        
        this.candidates.forEach((c, index) => {
            const priority = index < 2 ? '🔴 ALTA' : index < 4 ? '🟠 MÉDIA' : '⚫ BAIXA';
            md += `| ${c.name} | ${c.scientificValue} | ${c.redundancy} | ${c.cost} | ${priority} (${c.eigScore}) |\n`;
        });
        
        fs.writeFileSync(filepath, md);
        console.log(`\n📊 [EIG ENGINE] Ranking complete. Top priority: ${this.candidates[0].name}`);
    }
}
