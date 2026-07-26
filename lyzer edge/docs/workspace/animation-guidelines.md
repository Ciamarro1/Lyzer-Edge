# LACW — Animation & Motion Guidelines

## Overview
All motion inside LACW is state-communicating. Decorative animations are strictly prohibited. Animations signal state changes (e.g. preset switch, event publish, regression alert, ECA Court veto).

---

## Technical Constraints
- Max duration: 150ms
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`
- GPU acceleration: Use `transform` and `opacity` exclusively to prevent layout reflows.
