# 21st.dev UI Component System — Skill Document

## Objective
Generate high-quality, conversion-optimized UI components for landing pages, dashboards, and marketing sites. Each component follows the 21st.dev design philosophy: dark theme, gradients, subtle animations, and mobile-first responsive design.

## UI Agents Available

| Agent | Class | Function |
|-------|-------|----------|
| `ui_hero` | `UIHeroAgent` | Hero sections with badge, CTA, social proof |
| `ui_pricing` | `UIPricingAgent` | Pricing tables with featured plan, features list |
| `ui_faq` | `UIFAQAgent` | FAQ accordion with schema.org markup |
| `ui_testimonial` | `UITestimonialAgent` | Testimonial cards with star ratings |
| `ui_component_design` | `UIComponentDesignAgent` | Full component-based landing page |
| `ui_full_page` | `UIFullPageAgent` | Orchestrated full page composer |

## Component Registry

All components are stored in `UIComponentRegistry` (`src/campaign_autopilot/ui_component_registry.py`):

- `navbar-default` — Responsive navigation bar
- `hero-default` — Hero section with CTA
- `features-grid` — Feature cards grid
- `pricing-table` — Pricing plans comparison
- `cta-section` — Call-to-action banner
- `testimonial-card` — Social proof cards
- `footer-default` — Site footer with links
- `faq-section` — FAQ accordion
- `card` — Generic card component

## Design Tokens

```css
:root {
  /* Core palette */
  --lyzer-bg: #0a0a1a;
  --lyzer-bg-secondary: #0d0d2b;
  --lyzer-bg-card: rgba(255,255,255,0.03);
  --lyzer-primary: #6366f1;
  --lyzer-primary-gradient: linear-gradient(135deg, #6366f1, #8b5cf6);
  --lyzer-text: #fff;
  --lyzer-text-secondary: #94a3b8;
  --lyzer-text-muted: #64748b;
  --lyzer-border: rgba(255,255,255,0.08);
  --lyzer-success: #22c55e;
  --lyzer-warning: #f59e0b;
  --lyzer-radius: 12px;
  --lyzer-radius-lg: 20px;
}
```

## Workflow

Recommended workflow for generating a complete landing page:

1. `ui_component_design` → analyze niche/goal
2. `ui_hero` → generate hero section
3. `ui_pricing` → generate pricing table
4. `ui_faq` → generate FAQ section
5. `ui_testimonial` → generate testimonials
6. `ui_full_page` → compose complete page
7. `OutputCritic` → quality check (must pass 85/100)

## Quality Criteria

Each UI component is evaluated by `OutputCritic` on:
- **Clarity** (20%) — Clear messaging and value proposition
- **Execution** (20%) — HTML/CSS quality, responsive design
- **Business Value** (20%) — Conversion optimization
- **Consistency** (15%) — Brand alignment, design system compliance
- **Conversion** (15%) — CTA placement and urgency
- **Brand Alignment** (10%) — Lyzer Labs design language

## Output Location

Generated files saved to: `output/ui_design/{component_type}/`
