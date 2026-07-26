# LACW — Third-Party Plugin SDK & Marketplace Architecture

## Overview
The Plugin SDK enables external developers and quant engineers to build custom widgets and engines for LACW.

---

## Security Sandbox & Capabilities
Plugins must explicitly declare requested capabilities in their manifest. Capabilities are verified against Granted System Capabilities by `LACWWidgetRegistry`. Ungranted capability requests result in hard registration rejection.

```javascript
import { manifest } from './manifest.js';

export class MyCustomWidget {
  constructor() {
    this.manifest = manifest;
  }
  async mount(container) {
    container.innerHTML = '<div>Custom Widget</div>';
    return { dispose: () => this.dispose() };
  }
  dispose() {}
  [Symbol.dispose]() { this.dispose(); }
}
```
