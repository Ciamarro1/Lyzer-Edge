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
  const seqLen = sequence.length;
  if (seqLen >= 4) {
    const lastItem = sequence[seqLen - 1];
    const lastLabel = lastItem.label;
    const secondToLast = sequence[seqLen - 2].label;
    const l0 = sequence[seqLen - 4].label;
    const l1 = sequence[seqLen - 3].label;
    const l2 = secondToLast;
    const prevHasHL = (l0 === "HL" || l1 === "HL" || l2 === "HL");
    const prevHasLH = (l0 === "LH" || l1 === "LH" || l2 === "LH");
    
    // bullish BOS: ...HL → HH (trend continuation)
    if (lastLabel === "HH" && prevHasHL) {
      events.push({
        type: "bullish_bos",
        at_index: lastItem.index,
        at_price: lastItem.price
      });
    }
    // bearish BOS
    else if (lastLabel === "LL" && prevHasLH) {
      events.push({
        type: "bearish_bos",
        at_index: lastItem.index,
        at_price: lastItem.price
      });
    }
    
    // bullish CHoCH: previously down structure (LH/LL), now HH
    if (lastLabel === "HH" && (secondToLast === "LH" || secondToLast === "LL")) {
      events.push({
        type: "bullish_choch",
        at_index: lastItem.index,
        at_price: lastItem.price
      });
    }
    // bearish CHoCH
    else if (lastLabel === "LL" && (secondToLast === "HL" || secondToLast === "HH")) {
      events.push({
        type: "bearish_choch",
        at_index: lastItem.index,
        at_price: lastItem.price
      });
    }
  }
  
  return { sequence, events };
}
