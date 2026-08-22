#!/usr/bin/env python3
"""
Oracle: runs the original OpenMobius kb_klines.py analysis functions
on fixture candles and dumps the component-by-component ground truth as JSON.
"""
import sys, os, json

# Add the OpenMobius scripts dir to path so we can import kb_klines helpers
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

    raw_candles = data.get("candles", [])
    candles = [Candle.from_row(c) for c in raw_candles]

    if not candles:
        return {"error": "no candles"}

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
    fixtures_dir = r"c:\Users\WDAGUtilityAccount\Downloads\Nova pasta\Lyzer-Edge\packages\lyzer-shared\src\providers\openmobius\tests\fixtures"
    out_dir = os.path.join(fixtures_dir, "expected")
    os.makedirs(out_dir, exist_ok=True)

    fixture_files = [
        "openmobius_trending.json",
        "openmobius_ranging.json",
        "openmobius_edge_cases.json",
    ]

    for fname in fixture_files:
        fpath = os.path.join(fixtures_dir, fname)
        if not os.path.exists(fpath):
            print(f"SKIP: {fname} not found")
            continue

        print(f"Processing {fname}...")
        result = run_oracle(fpath)

        out_name = fname.replace(".json", "_expected.json")
        out_path = os.path.join(out_dir, out_name)
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False, default=str)

        print(f"  -> {out_name}: {result['candle_count']} candles, "
              f"{len(result['swings'])} swings, "
              f"{len(result['fvgs'])} fvgs, "
              f"{len(result['order_blocks'])} obs, "
              f"{len(result['sweeps'])} sweeps")

    print("\nOracle ground truth generated.")
