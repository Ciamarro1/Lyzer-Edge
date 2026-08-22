export function analyzeStructure(swings) {
  if (!swings || swings.length < 3) {
    return { sequence: [], events: [] };
  }
  
  // Sort by index
  const sortedSw = [...swings].sort((a, b) => a.index - b.index);
  
  const sequence = [];
  let lastHigh = null;
  let lastLow = null;
  
  for (const s of sortedSw) {
    let label;
    if (s.kind === "high") {
      if (lastHigh === null) {
        label = "H";
      } else if (s.price > lastHigh) {
        label = "HH";
      } else {
        label = "LH";
      }
      lastHigh = s.price;
    } else {
      if (lastLow === null) {
        label = "L";
      } else if (s.price > lastLow) {
        label = "HL";
      } else {
        label = "LL";
      }
      lastLow = s.price;
    }
    
    sequence.push({
      label,
      index: s.index,
      price: Number(s.price.toFixed(4))
    });
  }
  
  const events = [];
  if (sequence.length >= 4) {
    const last4 = sequence.slice(-4).map(x => x.label);
    const lastLabel = last4[3];
    const prevLabels = last4.slice(0, 3);
    const secondToLast = last4[2];
    
    // bullish BOS: ...HL → HH (trend continuation)
    if (lastLabel === "HH" && prevLabels.includes("HL")) {
      events.push({
        type: "bullish_bos",
        at_index: sequence[sequence.length - 1].index,
        at_price: sequence[sequence.length - 1].price
      });
    }
    // bearish BOS
    else if (lastLabel === "LL" && prevLabels.includes("LH")) {
      events.push({
        type: "bearish_bos",
        at_index: sequence[sequence.length - 1].index,
        at_price: sequence[sequence.length - 1].price
      });
    }
    
    // bullish CHoCH: previously down structure (LH/LL), now HH
    if (lastLabel === "HH" && (secondToLast === "LH" || secondToLast === "LL")) {
      events.push({
        type: "bullish_choch",
        at_index: sequence[sequence.length - 1].index,
        at_price: sequence[sequence.length - 1].price
      });
    }
    // bearish CHoCH
    else if (lastLabel === "LL" && (secondToLast === "HL" || secondToLast === "HH")) {
      events.push({
        type: "bearish_choch",
        at_index: sequence[sequence.length - 1].index,
        at_price: sequence[sequence.length - 1].price
      });
    }
  }
  
  return { sequence, events };
}
