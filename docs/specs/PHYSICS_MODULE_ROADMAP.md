# Physics Module Architectural Roadmap & First Experiment Specification

This specification outlines the architectural foundation for introducing real, mathematically grounded physics simulations into the Virtual Lab Protocol platform without disrupting or compromising existing biological wet-lab protocol contracts.

---

## 1. Executive Summary & Design Principle

The current repository executes biomedical protocols via discrete, state-driven SVG scene objects and interaction sequences (YAML to TypeScript pipeline). Physics experiments, conversely, require:
- Continuous algebraic or differential equations.
- Dynamic instrumentation (e.g. digital multimeters, oscilloscopes, sensors).
- Interactive set-points that immediately calculate derived physical quantities.

**Core Mandate**:
1. **Never fake physics**: We do not relabel biology protocols as physics experiments, nor do we present dummy interfaces that pretend to simulate circuits.
2. **Strict coexistence**: The existing `mini_protocol` and `sequence_runner` contracts defined in `PRIMARY_CONTRACT.md` remain untouched.
3. **Domain isolation**: The physics engine operates as a domain-specific calculation adapter that integrates with the existing SolidJS shell and layout engine.

---

## 2. Proposed First Experiment: Ohm's Law & DC Resistive Network Verification

### 2.1 Scientific Objectives & Learning Outcomes
- **Learning Objective**: Students completing this module will gain operational fluency with DC bench power supplies, digital multimeters (DMMs), resistor color-coding, and experimental verification of Ohm's Law ($V = I \cdot R$).
- **Learning Outcomes**:
  - Connect a closed series circuit with a variable DC power supply, precision resistor, and DMM in ammeter/voltmeter configurations.
  - Measure voltage drop across variable load resistances and calculate corresponding current flows.
  - Plot and verify the linear $V-I$ characteristic relationship.
  - Calculate power dissipation ($P = V \cdot I = I^2 R$) and identify resistor thermal limits.

### 2.2 Mathematical Model & Governing Equations
1. **Ohm's Law**:
   $$I = \frac{V_{\text{source}}}{R_{\text{load}} + R_{\text{internal}}}$$
   Where:
   - $V_{\text{source}}$: Power supply setpoint voltage ($0.0 \text{ V}$ to $30.0 \text{ V}$).
   - $R_{\text{load}}$: Authored or selected resistor value ($10\,\Omega$ to $100\,\text{k}\Omega$).
   - $R_{\text{internal}}$: Ammeter shunt resistance ($0.1\,\Omega$) and supply internal impedance ($0.05\,\Omega$).
2. **Power Dissipation**:
   $$P_{\text{resistor}} = I^2 \cdot R_{\text{load}}$$
   - Rated limit: $0.25 \text{ W}$ for $1/4\text{W}$ carbon film resistors.
   - Fault condition: If $P_{\text{resistor}} > 0.25 \text{ W}$, visual component overheating state is triggered.
3. **Measurement Tolerances**:
   - Resistor standard tolerance: $\pm 5\%$ (Gaussian distribution sample at module load).
   - DMM resolution: 3.5 digits (e.g., $00.00 \text{ V}$, $000.0 \text{ mA}$).

---

## 3. Physical Hardware & Visual Scene Art

The physical scene will be laid out in the canonical 16:9 frame (`physics_electronics_bench`) utilizing the following SVG-backed instruments:

| Instrument / Component | Kind | Interactive Affordance | Output State |
|:-----------------------|:-----|:-----------------------|:-------------|
| **DC Power Supply** | `instrument` | Voltage fine/coarse knobs, On/Off toggle switch | Seven-segment digital LED readouts ($V, I$) |
| **Digital Multimeter** | `instrument` | Rotary selector switch ($V_{DC}, I_{DC}, \Omega$), Banana jack terminals | Digital LCD display showing measured quantity with unit |
| **Resistor Decade Box** | `equipment` | 4-decade rotary dials ($1\Omega, 10\Omega, 100\Omega, 1\text{k}\Omega$) | Dial position indicator |
| **Probes & Banana Leads**| `tool` | Drag-to-connect red/black terminal clips | Snapped wire paths with topological continuity check |

---

## 4. UI Interaction Flow & Step Machine Alignment

To maintain 100% compatibility with the platform's step-machine, the experiment is structured into canonical pedagogical steps:

1. **`step_inspect_components`**:
   - Target: `resistor_decade_box`
   - Gesture: `adjust`
   - Goal: Set initial resistance to $1.0\,\text{k}\Omega$ ($1000\,\Omega$).
2. **`step_configure_multimeter`**:
   - Target: `digital_multimeter`
   - Gesture: `select` (range: $200\text{ mA DC}$).
   - Goal: Configure meter for series current measurement.
3. **`step_energize_circuit`**:
   - Target: `power_supply_switch`
   - Gesture: `click`
   - Goal: Power on DC supply at $5.0 \text{ V}$.
4. **`step_record_vi_points`**:
   - Target: `voltage_set_knob`
   - Gesture: `adjust` (sweep $2\text{V}, 4\text{V}, 6\text{V}, 8\text{V}, 10\text{V}$).
   - Goal: Observe linear current scaling ($2.0\text{mA}, 4.0\text{mA}, \dots$).

---

## 5. Architectural Integration Without Breaking Biology Contracts

```
content/protocols/
+-- biology/ (Existing 58 scenes, 47 protocols - UNTOUCHED)
|   +-- sdspage/
|   +-- mtt/
|   +-- cell_culture/
+-- physics/ (New Cluster)
    +-- dc_circuits_ohms_law/
        +-- protocol.yaml    (standard mini_protocol schema)
        +-- circuit.yaml     (circuit network topology schema)
        +-- scenes/
            +-- electronics_bench.yaml
```

- **Runtime Seam**:
  The existing runtime in `src/scene_runtime/` handles gestures and step transitions. For physics calculations, a modular `CircuitSolver` (using modified nodal analysis for linear circuits) computes nodal voltages and branch currents upon each `adjust` or `click` event.
- **Output Injection**:
  Calculated values update the dynamic SVG text node within `#scene-root` (e.g., `<text id="dmm-display">4.98 V</text>`), matching the existing `set_point_editor` and `subpart_dispatch` architecture.

---

## 6. Test Cases & Acceptance Criteria

1. **Analytical Accuracy**:
   - Given $V = 10.0\text{ V}$ and $R = 250\,\Omega$, solved current must equal $40.0\text{ mA} \pm 0.1\text{ mA}$.
2. **Fault Protection**:
   - Powering on with $R = 0\,\Omega$ triggers the power supply over-current limit indicator (CC mode) without crashing the simulation.
3. **State Persistence**:
   - Reloading the browser restores the exact knob angles, DMM selector position, and calculated display outputs.
4. **Walker Proof**:
   - Playwright walkthrough completes all measurement points through visible UI click and adjust affordances, saving before-and-after screenshots.
