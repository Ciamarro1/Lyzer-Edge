export const CONSTITUTIONAL_AXIOMS = {
  MIN_VALIDATION_LAYERS: 4,
  MAX_DECISION_CONCENTRATION: 0.4,
  MIN_EXPLORATION_RATIO: 0.1,
  MIN_REDUNDANCY_LEVEL: 2
};

export const AXIOMATIC_CHECKS = [
  {
    id: "AXIOM_1_ANTI_DEGRADATION_LAYERS",
    name: "Validation Layer Preservation",
    verify: (proposedSystem) => {
      const activeLayers = proposedSystem.layers || [];
      const requiredLayers = ['sml', 'fmc', 'cil', 'eca'];
      
      const hasAllRequired = requiredLayers.every(layer => activeLayers.includes(layer));
      const hasMinCount = activeLayers.length >= CONSTITUTIONAL_AXIOMS.MIN_VALIDATION_LAYERS;
      
      return hasAllRequired && hasMinCount;
    }
  },
  {
    id: "AXIOM_2_ANTI_CENTRALIZATION",
    name: "Decisional Concentration Limit",
    verify: (proposedSystem) => {
      const decisionWeights = proposedSystem.decisionWeights || {};
      const weights = Object.values(decisionWeights);
      if (weights.length === 0) return true;
      const maxWeight = Math.max(...weights);
      return maxWeight <= CONSTITUTIONAL_AXIOMS.MAX_DECISION_CONCENTRATION;
    }
  },
  {
    id: "AXIOM_3_CONSTITUTIONAL_DIVERSITY",
    name: "Exploratory Diversity Protection",
    verify: (proposedSystem) => {
      const explorationRatio = proposedSystem.explorationRatio !== undefined 
        ? proposedSystem.explorationRatio 
        : 1.0;
      return explorationRatio >= CONSTITUTIONAL_AXIOMS.MIN_EXPLORATION_RATIO;
    }
  },
  {
    id: "AXIOM_4_MIN_REDUNDANCY",
    name: "Minimum System Redundancy",
    verify: (proposedSystem) => {
      const redundancyLevel = proposedSystem.redundancyLevel !== undefined
        ? proposedSystem.redundancyLevel
        : 2;
      return redundancyLevel >= CONSTITUTIONAL_AXIOMS.MIN_REDUNDANCY_LEVEL;
    }
  }
];
 