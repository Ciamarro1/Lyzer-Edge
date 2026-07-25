export class RealityAnchor {
  constructor() {
    this.rdiHistory = [];
  }

  evaluateRealityCoherence(realityVector) {
    this.rdiHistory.push(realityVector.rdi);
    if (this.rdiHistory.length > 10) {
      this.rdiHistory.shift();
    }

    let coherenceVelocity = 0;
    if (this.rdiHistory.length >= 2) {
      coherenceVelocity = realityVector.rdi - this.rdiHistory[this.rdiHistory.length - 2];
    }

    let averageRDI = realityVector.rdi;
    if (this.rdiHistory.length > 0) {
      const sum = this.rdiHistory.reduce((a, b) => a + b, 0);
      averageRDI = sum / this.rdiHistory.length;
    }

    const isDrifting = realityVector.rdi > 0.7 || averageRDI > 0.6;
    const isVelocityDangerous = coherenceVelocity > 0.15;
    const isOutOfSampleStable = realityVector.walkForward >= 0.5 && realityVector.stressScore >= 0.6;
    const isCounterfactualDecoupled = realityVector.counterfactualScore < 0.4;
    const isLiveDeclineSevere = realityVector.livePerformanceDelta < -0.10;

    const coherent = !isDrifting && !isVelocityDangerous && isOutOfSampleStable && !isCounterfactualDecoupled && !isLiveDeclineSevere;

    const failureReasons = [];
    if (isDrifting) failureReasons.push("Reality Drift Index limit exceeded (RDI > 0.7 or average RDI > 0.6)");
    if (isVelocityDangerous) failureReasons.push("Dangerous acceleration in Reality Drift (RDI velocity)");
    if (!isOutOfSampleStable) failureReasons.push("Out-of-sample or walk-forward verification failed");
    if (isCounterfactualDecoupled) failureReasons.push("Decoupled from counterfactual expectations");
    if (isLiveDeclineSevere) failureReasons.push("Severe live performance degradation detected");

    return {
      coherent,
      metrics: {
        rdi: realityVector.rdi,
        averageRDI,
        coherenceVelocity,
        walkForward: realityVector.walkForward,
        stressScore: realityVector.stressScore,
        counterfactualScore: realityVector.counterfactualScore,
        livePerformanceDelta: realityVector.livePerformanceDelta
      },
      failureReasons
    };
  }
}
 