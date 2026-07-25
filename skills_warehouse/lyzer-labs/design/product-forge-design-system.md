# Product Forge — Lyzer Labs Design System

> **Domain:** Design · UI/UX
> **Agent:** Codex / Claude
> **Version:** 1.0.0

## Design Tokens
- Colors: Dark theme (#0a0a0f base), accent gradients
- Typography: Inter, Space Grotesk, JetBrains Mono
- Spacing: 4px base grid
- Border radius: 8px (cards), 4px (buttons)

## Components
- HeroSection, FeaturesSection, TestimonialsSection
- PricingSection, CTASection, FooterSection
- MetricCard, ChartSpec, KPIRow
- EmailSection (text, button, image)

## Generators
- LandingPageGenerator → landing pages for affiliates
- DashboardGenerator → campaign dashboards
- EmailTemplateGenerator → email marketing
- PresentationGenerator → slide decks
- ArtifactGenerator → generic HTML/CSS output

## Usage
```bash
python scripts/generate_site.py --type landing --title "Produto" --niche "tecnologia"
python scripts/generate_site.py --type email --title "Newsletter"
python scripts/generate_site.py --type dashboard --title "Dashboard"
```
