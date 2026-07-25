/**
 * Lyzer Edge Institutional Design System — Main Entry Point
 *
 * Import everything the Command Center needs from this single file:
 *
 *   import { institutionalTheme, InstitutionalCard, StatusIndicator, ... } from '../designSystem/index.js';
 */

// Tokens
export { colors, typography, spacing, STATUS, AWAITING_DATA, resolveStatus, statusColor, statusBg } from './tokens/index.js';

// Theme
export { institutionalTheme } from './theme/index.js';

// Primitive UI Components
export {
  InstitutionalCard,
  StatusIndicator,
  MetricCell,
  HashDisplay,
  EvidenceBadge,
  ReadOnlyBadge,
  SecurityBanner,
  TimelineEvent,
} from './primitives/index.js';
