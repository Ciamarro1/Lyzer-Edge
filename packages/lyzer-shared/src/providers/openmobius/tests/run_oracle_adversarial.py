#!/usr/bin/env python3
"""Oracle for adversarial fixtures — runs kb_klines on each and dumps ground truth."""
import sys, os, json

SKILL_SCRIPTS = os.path.join(
    os.environ.get("SKILL_DIR", r"C:\Users\WDAGUtilityAccount\.gemini\antigravity\brain\9fd2aaa5-276a-48a6-81f1-e68151c69b9d\scratch\OpenMobius-skill"),
    "scripts"
)
sys.path.insert(0, SKILL_SCRIPTS)

from kb_klines import (
    Candle, find_swings, find_fvgs, find_order_blocks,
    find_sweeps, find_displacements, find_volume_anomalies,
    analyze_structure, calc_atr
)

def run_oracle(fixture_path):
    with open(fixture_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    raw = data.get("candles", [])
    candles = [Candle.from_row(c) for c in raw]
    if not candles:
        return {"error": "no candles", "candle_count": 0}

    swings  = find_swings(candles)
    fvgs    = find_fvgs(candles)
    obs     = find_order_blocks(candles)
    sweeps  = find_sweeps(candles, swings)
    disps   = find_displacements(candles)
    vols    = find_volume_anomalies(candles)
    struct  = analyze_structure(swings)
    atr     = calc_atr(candles)

    return {
        "candle_count": len(candles),
        "atr14": atr,
        "swings": swings,
        "structure": struct,
        "fvgs": fvgs,
        "order_blocks": obs,
        "sweeps": sweeps,
        "displacements": disps,
        "volume_anomalies": vols,
    }

if __name__ == "__main__":
    adv_dir = r"c:\Users\WDAGUtilityAccount\Downloads\Nova pasta\Lyzer-Edge\packages\lyzer-shared\src\providers\openmobius\tests\fixtures\adversarial"
    out_dir = os.path.join(adv_dir, "expected")
    os.makedirs(out_dir, exist_ok=True)

    for fname in sorted(os.listdir(adv_dir)):
        if not fname.endswith(".json"):
            continue
        fpath = os.path.join(adv_dir, fname)
        print(f"Processing {fname}...")
        result = run_oracle(fpath)
        out_name = fname.replace(".json", "_expected.json")
        out_path = os.path.join(out_dir, out_name)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False, default=str)
        print(f"  -> {out_name}: {result['candle_count']} candles, "
              f"sw={len(result.get('swings',[]))}, "
              f"fvg={len(result.get('fvgs',[]))}, "
              f"ob={len(result.get('order_blocks',[]))}, "
              f"sweep={len(result.get('sweeps',[]))}, "
              f"disp={len(result.get('displacements',[]))}")

    print("\nAdversarial oracle ground truth generated.")
