# LabSim: Virtual Laboratory Protocol Simulation Platform

Browser-based virtual laboratory games and scientific protocol engines. Students learn wet-lab techniques through interactive SVG equipment, real-time feedback, and generative AI research mentors.

## Overview

LabSim is a web-based virtual science laboratory and interactive protocol platform. Built for university biology and biochemistry curricula, it allows learners to conduct wet-lab procedures with high-fidelity laboratory equipment without physical resource constraints.

### Key Capabilities

- **47+ Interactive Protocols**: Comprehensive protocols spanning cell culture, MTT cell viability assays, SDS-PAGE gel electrophoresis, Western blotting, PCR preparation, and bacterial transformation.
- **Tiered SVG Scene Renderer**: Modular, reactive vector artwork for micropipettes, microcentrifuges, spectrophotometers, 96-well plates, heat blocks, and laminar flow hoods with real-time liquid level and meniscus physics.
- **AI Research Mentor**: Integrated real-time laboratory mentor powered by FastAPI and high-speed LLM inference, answering student questions, clarifying experimental steps, and discussing safety protocols.
- **Automated Experiment Reports**: Interactive lab report generator that structures student observations, quantitative metrics, error analysis, and scientific conclusions into exportable reports.
- **Declarative YAML Authoring**: Clean separation of scientific protocol logic, object registries, and step definitions in structured YAML, compiled to optimized TypeScript runtimes.
- **Physics Module Foundation**: Documented architecture and roadmap for expanding the platform to classical mechanics, electromagnetism, and optics simulations.

## System Architecture

The platform consists of a lightweight SolidJS/TypeScript client, a declarative YAML compilation pipeline, and an optional AI backend daemon:

```
+-------------------------------------------------------------+
|                     Browser Client                          |
|  +--------------------+  +-------------------------------+  |
|  | Protocol Launcher  |  | Protocol Host & HUD Shell     |  |
|  +--------------------+  +-------------------------------+  |
|  | Interactive Scene  |  | AI Mentor & Lab Report Panels |  |
|  +--------------------+  +-------------------------------+  |
+-------------------------------------------------------------+
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
+-----------------------------+   +---------------------------+
| Generated Client Artifacts  |   | Python FastAPI AI Backend |
| - Precomputed Layouts       |   | - Context-Aware Mentor    |
| - Typed Protocol Registry   |   | - Report Generator        |
| - Liquid SVG Manifest       |   | - Secure Groq / LLM Seam  |
+-----------------------------+   +---------------------------+
```

## Quick Start

### 1. Web Simulation Frontend

Ensure Node.js 18+ and Python 3.12+ are available.

```bash
# Clone the repository
git clone https://github.com/VENKATAVISHALKOVURU/SIMULATE.git
cd SIMULATE

# Install dependencies
npm ci

# Build production bundle and launch the local server
bash run_web_server.sh
```

The launcher interface will automatically open in your default browser.

### 2. AI Mentor Backend (Optional)

To enable the live AI Laboratory Mentor and automated report generation:

```bash
# Set your API key
export GROQ_API_KEY="your-api-key-here"

# Install backend dependencies
pip install fastapi uvicorn pydantic groq httpx

# Start the backend server on port 8001
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001
```

## Core Commands

| Command | Description |
| :--- | :--- |
| `bash run_web_server.sh` | Builds artifacts, starts local HTTP server, and opens launcher |
| `bash build_github_pages.sh` | Production build for GitHub Pages (`dist/` output) |
| `bash check_codebase.sh` | TypeScript compilation, ESLint, and code formatting gate |
| `pytest tests/ backend/tests/` | Complete Python unit and contract test suite |
| `node --import tsx --test tests/test_*.mjs` | Node unit and regression test runner |
| `npx playwright test` | End-to-end browser walkthroughs and HUD validation |

## Project Documentation

Detailed design specifications and architectural guidelines are available in `docs/`:

- [docs/PRIMARY_CONTRACT.md](docs/PRIMARY_CONTRACT.md): Non-negotiable architectural invariants and schema constraints.
- [docs/PRIMARY_SPEC.md](docs/PRIMARY_SPEC.md): Interactive simulation specification and runtime contract.
- [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md): Frontend component tree, renderer hierarchy, and data flow.
- [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md): Comprehensive repository layout and file catalog.
- [docs/specs/PHYSICS_MODULE_ROADMAP.md](docs/specs/PHYSICS_MODULE_ROADMAP.md): Roadmap and technical foundation for physics simulations.
- [docs/specs/PROTOCOL_AUTHORING_GUIDE.md](docs/specs/PROTOCOL_AUTHORING_GUIDE.md): Guide for authoring new laboratory protocols in YAML.

## Testing & Quality Assurance

LabSim enforces rigorous automated testing across the entire codebase:

- **E2E Browser Walkthroughs**: Automated Playwright specs test protocol navigation, DOM key binding, interactive tool selection, and HUD responsive behavior.
- **Contract & Boundary Enforcement**: Tests strictly check import boundaries between shell, launcher, and runtime layers.
- **Determinism & Hygiene**: Complete test suite runs headless, deterministic, and sandboxed without network dependencies.

## License

- Code: [LGPL-3.0 License](LICENSE.LGPL-3.0)
- Non-code content and artwork: [CC-BY-4.0 License](LICENSE.CC-BY-4.0)
