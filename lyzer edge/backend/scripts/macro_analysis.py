import json
import os
import glob
from collections import defaultdict
from datetime import datetime, timezone

symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT']
directory = r'C:\Users\WDAGUtilityAccount\.gemini\antigravity\scratch\Lyzer-Edge\lyzer edge'

results = {}
toxic_anomalies = {}

dow_stats = defaultdict(lambda: [0.0, 0])
month_stats = defaultdict(lambda: [0.0, 0])
hour_stats = defaultdict(lambda: [0.0, 0])

print("=== MACRO ANALYSIS RUNNING ===")
for sym in symbols:
    filepath = os.path.join(directory, f'macro_backtest_{sym}_hud.json')
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
        
    print(f"Processing {sym}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Structural breakdown: lhds > 0.99 and trg < 0.1
    breakdowns = [d for d in data if d.get('lhds', 0) > 0.99 and d.get('trg', 1) < 0.1]
    results[sym] = len(breakdowns)
    
    # Check constitution
    breaches = [d for d in data if d.get('eef') is True and (d.get('lhds', 0) > 0.9 or d.get('trg', 1) < 0.35)]
    if len(breaches) > 0:
        print(f"CONSTITUTION BREACH IN {sym}: {len(breaches)} times")
        
    # Check Alpha Convexity (TRG > 1.5, LHDS < 0.8)
    convex = [d for d in data if d.get('trg', 0) > 1.5 and d.get('lhds', 1) < 0.8]
    if len(convex) > 0:
        print(f"CONVEXITY BLACK SWANS IN {sym}: {len(convex)} times")
        
    if breakdowns:
        toxic_anomalies[sym] = [(d['t_str'], d['lhds'], d['trg']) for d in breakdowns[:10]] # limit to 10
        
    # Accumulate stats for LHDS
    for row in data:
        lhds = row.get("lhds")
        if lhds is None: continue
        dt = datetime.fromtimestamp(row["t"] / 1000.0, tz=timezone.utc)
        dow = dt.strftime('%A')
        month = dt.strftime('%B')
        hour = dt.hour
        
        dow_stats[dow][0] += lhds
        dow_stats[dow][1] += 1
        month_stats[month][0] += lhds
        month_stats[month][1] += 1
        hour_stats[hour][0] += lhds
        hour_stats[hour][1] += 1

print("\n=== STRUCTURAL BREAKDOWNS COUNT (TOXICITY) ===")
for sym, count in results.items():
    print(f"{sym}: {count}")

if results:
    most_severe = max(results, key=results.get)
    print(f"=> Asset with most severe structural breakdowns: {most_severe} ({results[most_severe]} instances)")

print("\n=== SEASONALITY OF LHDS (LIQUIDITY HOLES) ===")
dow_avg = {k: v[0]/v[1] for k, v in dow_stats.items() if v[1] > 0}
month_avg = {k: v[0]/v[1] for k, v in month_stats.items() if v[1] > 0}
hour_avg = {k: v[0]/v[1] for k, v in hour_stats.items() if v[1] > 0}

if dow_avg:
    best_dow = min(dow_avg.items(), key=lambda x: x[1])
    print(f"Best Day of Week (Lowest LHDS): {best_dow[0]} (Avg LHDS: {best_dow[1]:.6f})")
    
if month_avg:
    best_month = min(month_avg.items(), key=lambda x: x[1])
    print(f"Best Month (Lowest LHDS): {best_month[0]} (Avg LHDS: {best_month[1]:.6f})")
    
if hour_avg:
    best_hour = min(hour_avg.items(), key=lambda x: x[1])
    print(f"Best UTC Hour (Lowest LHDS): {best_hour[0]:02d}:00 (Avg LHDS: {best_hour[1]:.6f})")
