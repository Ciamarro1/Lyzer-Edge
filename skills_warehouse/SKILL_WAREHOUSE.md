# 🧠 Skill Warehouse — Campaign Autopilot / Lyzer Labs

> **Catálogo completo de skills reutilizáveis** para agentes (Codex, Claude, Cursor, ChatGPT).
> **3 fontes:** SkillsMP (1.9M+ skills), Garden Skills (skills prontas), Lyzer Labs (skills proprietárias)

---

## 📊 Estatísticas

| Fonte | Quantidade | Descrição |
|-------|-----------|-----------|
| SkillsMP Community | **36** | Skills de marketing, design, SEO, automação, copywriting |
| Garden Skills | **~200** | Skills prontas de web design, frontend, imagem, artigo |
| Lyzer Labs | **14** | Skills proprietárias CIA/CTO, marketing, UI/UX design 21st.dev, automação |
| **Total** | **~250** | |

---

## 🏗️ Estrutura

```
skills_warehouse/
├── SKILL_WAREHOUSE.md          ← Este índice
├── README.md                   ← Guia de uso
│
├── garden/                     ← Garden Skills (clonado do GitHub)
│   ├── web-design-engineer/
│   ├── beautiful-article/
│   ├── gpt-image-2/
│   ├── web-video-presentation/
│   └── ...
│
├── community/                  ← SkillsMP (top skills by category)
│   ├── marketing/              (10 skills)
│   ├── design/                 (8 skills)
│   ├── automation/             (6 skills)
│   ├── seo/                    (5 skills)
│   └── copywriting/            (7 skills)
│
└── lyzer-labs/                 ← Skills proprietárias
    ├── cto-cia/                (3 skills: CTO, CIA, Anti-Fragility)
    ├── marketing/              (3 skills: Affiliate, SEO, Money Loop)
    ├── design/                 (1 skill: Product Forge)
    ├── automation/             (2 skills: Workflow DAG, Ponytail)
    ├── research/               (1 skill: Competitive Intelligence)
    ├── media-revenue/          (1 skill: Media Providers)
    ├── governance/             (1 skill: System Governance)
    └── agent-orchestration/    (1 skill: Agent Factory & Evolution)
```

---

## 📂 Community Skills por Categoria

### 📢 Marketing
| Skill | Stars | Descrição |
|-------|-------|-----------|
| `marketing-campaign` | 219K★ | End-to-end marketing campaign planning and execution |
| `marketing-psychology` | 68K★ | Psychological principles for copy and design |
| `marketing-ideas` | 41K★ | Marketing strategies and growth ideas |
| `marketing-plan` | 34K★ | Comprehensive marketing plan generation |
| `marketing-shaper` | 13★ | Structure vague marketing requests into briefs |
| `marketing-funnel-analysis` | 10★ | Analyze conversion leaks across TOFU/MOFU/BOFU |
| `seo-content-strategy` | 232★ | SEO content strategy and planning |
| `content-marketing` | 1K★ | Content marketing strategy and execution |

### 🎨 Design & UX
| Skill | Stars | Descrição |
|-------|-------|-----------|
| `octopus-ui-ux-design` | 3.6K★ | Full UI/UX design system generation |
| `design-ui-ux-pro-max` | 47★ | 50 styles, 21 palettes, 50 font pairings |
| `design-system` | 219K★ | Design system creation and management |
| `ui-design-patterns` | 59★ | Common UI patterns and best practices |
| `web-design-engineer` | 109★ | Web design and frontend engineering |
| `beautiful-article` | 8.6K★ | Transform any source into beautiful articles |
| `gpt-image-2` | 8.6K★ | Advanced image generation and prompting |

### ⚡ Automação
| Skill | Stars | Descrição |
|-------|-------|-----------|
| `workflow-automation` | 60K★ | Workflow automation and pipeline design |
| `agent-orchestration` | 41K★ | Multi-agent optimization and improvement |
| `pipeline-automation` | 14★ | CI/CD and deployment pipeline automation |
| `ci-cd-automation` | 30★ | Continuous integration and delivery |
| `task-runner` | 747★ | Automated task execution and scheduling |

### 🔍 SEO
| Skill | Stars | Descrição |
|-------|-------|-----------|
| `seo-strategy` | 640★ | Comprehensive SEO strategy |
| `keyword-research` | 2.9K★ | Keyword research and analysis |
| `content-optimization` | 640★ | Content optimization for search |
| `seo-rank-tracking` | 372★ | Rank tracking and monitoring |
| `seo-audit` | 41K★ | Full SEO audit and recommendations |

### ✍️ Copywriting
| Skill | Stars | Descrição |
|-------|-------|-----------|
| `copywriting` | 68K★ | Persuasive copywriting techniques |
| `persuasive-writing` | 9★ | APAG framework for persuasive writing |
| `conversion-copywriting` | 368★ | Conversion-focused copywriting |
| `storytelling` | 1.3K★ | Narrative and storytelling techniques |
| `ad-copywriting-formulas` | 1K★ | Advertising copywriting formulas |

---

## 🏛️ Lyzer Labs Skills Proprietárias

| Categoria | Skill | Descrição |
|-----------|-------|-----------|
| 🏛️ CIA/CTO | `cto-executive-director` | Operating protocol for CTO-level engineering decisions |
| 🏛️ CIA/CTO | `cia-chief-intelligence-architect` | Cognitive architecture design (3 orders) |
| 🏛️ CIA/CTO | `anti-fragility-directive` | Detection and escalation of architectural risks |
| 📢 Marketing | `affiliate-marketing-strategy` | Multi-platform affiliate marketing (13 sources) |
| 📢 Marketing | `seo-content-pipeline` | Complete SEO content pipeline (8 steps) |
| 📢 Marketing | `money-loop-cycle` | 24/7 revenue generation cycle |
| 🎨 Design | `product-forge-design-system` | Lyzer Labs design system and generators |
| 🖌️ UI/UX Design | `21st-dev-component-system` | 21st.dev-style UI component generation — hero, pricing, FAQ, testimonials, full pages |
| ⚡ Automação | `workflow-dag-engine` | 30-workflow DAG engine |
| ⚡ Automação | `ponytail-lazy-dev-mode` | Stdlib-first, deletion-over-addition philosophy |
| 🔬 Research | `competitive-intelligence` | Competitor analysis and gap detection |
| 🎬 Media | `media-providers-layer` | 16 unified media providers with failover |
| 🏛️ Governance | `system-governance` | GovernanceAgent with 7 delegates |
| 🤖 Orchestration | `agent-factory-evolution` | Auto-creation and evolution of agents |

---

## 🔧 Como Usar

### Para agentes Codex/Claude/Cursor:
```bash
# Skills estão em skills_warehouse/ organizadas por categoria
# Use o caminho relativo para carregar uma skill:
skills/lyzer-labs/cto-cia/cto-executive-director.md
skills/community/marketing/marketing-campaign.md
```

### Para integrar no Campaign Autopilot:
```python
# O Skill Warehouse é referenciado pelo AGENTS.md e README.md
# Skills são carregadas automaticamente quando o contexto do projeto é ativado
```

### Para adicionar novas skills:
```bash
# SkillsMP API:
curl -s "https://skillsmp.com/api/skills?search=SEU_TERMO&limit=5"

# Skills próprias em:
skills_warehouse/lyzer-labs/CATEGORIA/SUA_SKILL.md
```

---

## 🔗 Links

- [SkillsMP](https://skillsmp.com) — 1.9M+ skills indexadas
- [Garden Skills](https://github.com/ConardLi/garden-skills) — Skills open source
- [Agent Skills Repo](https://agentskillsrepo.com) — 145K+ skills
- [uberSKILLS](https://uberskills.dev) — Criador visual de skills
- [UX/UI Agent Skills](https://agentskill.work/en/skills/plugin87/ux-ui-agent-skills) — Design skills

---

*Skill Warehouse v1.0 — Campaign Autopilot / Lyzer Labs*
*Atualizado em 2026-06-25*
