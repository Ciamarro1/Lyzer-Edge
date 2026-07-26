# LACW — Motion System & Animation Guidelines

## State-Communicating Motion Rules
- **State Birth**: Smooth fade-in ($100\,\text{ms}$)
- **State Migration**: Panel resize ($150\,\text{ms}$ with `cubic-bezier(0.16, 1, 0.3, 1)`)
- **State Veto**: Subtle red glow outline pulse ($120\,\text{ms}$)
- **GPU Acceleration**: Exclusive use of `transform` and `opacity` to avoid reflows.
