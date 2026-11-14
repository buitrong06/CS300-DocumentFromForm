# CS300-CPThought — Document: Fill and Deliver

Structured document preparation, form filling, delegation, submission, review, and authoritative DOCX/PDF export.

## Repository Structure

```text
.
├── .github/                  # PR template & CI workflows
├── docs/
│   ├── MISSING_CONTEXT.md    # Baseline index, prioritized gaps & workflow
│   ├── requirements/         # Vision, Use-case specs, UI prototypes, domain concepts
│   ├── analysis-and-design/  # Technical specs & ADRs (adr/)
│   ├── architecture/         # C4 diagrams & architecture overview (c4/)
│   ├── management/           # Live tracking: IMPLEMENTATION_STATUS, DECISIONS, ISSUES
│   └── test/                 # Test plans & acceptance criteria
├── pa/                       # Course assignment deliverables (PA1–PA3)
├── src/                      # Application source code (to be scaffolded)
├── AGENTS.md                 # Instructions & hard rules for AI coding agents
└── GLOSSARY.md               # Canonical domain terms
```

## Quick Start

1. Read [docs/MISSING_CONTEXT.md](docs/MISSING_CONTEXT.md) and [GLOSSARY.md](GLOSSARY.md).
2. Review the proposed C4 architecture in [docs/architecture/c4/README.md](docs/architecture/c4/README.md).
3. Copy `.env.example` to `.env` before running local services (once `src/` is initialized).
4. Check `docs/management/IMPLEMENTATION_STATUS.md` for current vertical-slice progress.
