// src/shell/hud/protocol_hud.tsx
//
// The protocol shell is one Solid composition root. It projects the typed
// runtime snapshot into the student-facing regions; it never reads scene DOM
// or changes protocol state. The host places #shell-root in the page grid, and
// .protocol-shell uses display: contents so these three regions remain grid
// siblings of the scene panel without making the shell an ancestor of it.

import { createSignal } from "solid-js";
import type { Accessor, JSXElement } from "solid-js";
import type { ProtocolStep, ShellViewSnapshot } from "../adapter/types";
import type { SessionSaveStatus } from "../../scene_runtime/protocol/session_persistence.js";
import { GuidanceBar } from "../regions/guidance_bar.js";
import { StepCounter } from "../regions/step_counter.js";
import { StepOutline } from "../regions/step_outline.js";
import { SessionControls } from "./session_controls.js";
import { MentorPanel } from "./mentor_panel.js";
import { ReportModal } from "./report_modal.js";

export interface ProtocolHudProps {
  snapshot: Accessor<ShellViewSnapshot>;
  steps?: ReadonlyArray<ProtocolStep>;
  entry_step: string;
  display_title: string;
  session_status: Accessor<SessionSaveStatus>;
  action_hint_open: Accessor<boolean>;
  protocol_name?: string | undefined;
  learning_objectives?: string | undefined;
  learning_goals?: string | undefined;
  on_action_hint_toggle(open: boolean): void;
  on_start_over(): void;
}

export function ProtocolHud(props: ProtocolHudProps): JSXElement {
  const steps = props.steps ?? [];
  const [mentor_open, set_mentor_open] = createSignal(false);
  const [report_open, set_report_open] = createSignal(false);

  const resolved_protocol_name = props.protocol_name ?? "active_protocol";

  return (
    <div class="protocol-shell">
      <header class="protocol-header" data-region="header">
        <div class="protocol-brand" aria-label="Virtual lab coach">
          <span class="protocol-brand-mark" aria-hidden="true">
            VL
          </span>
          <span class="protocol-brand-text">Virtual Lab Coach</span>
        </div>
        <p class="protocol-display-title" data-protocol-display-title="">
          {props.display_title}
        </p>
        <div class="protocol-header-statuses">
          <div class="protocol-tool-actions">
            <button
              type="button"
              class="sci-tool-btn sci-tool-mentor"
              data-hud-mentor-btn
              onClick={() => set_mentor_open(!mentor_open())}
              title="Open AI Scientific Mentor"
            >
              <span class="sci-btn-dot" aria-hidden="true"></span>
              AI Mentor
            </button>
            <button
              type="button"
              class="sci-tool-btn sci-tool-report"
              data-hud-report-btn
              onClick={() => set_report_open(true)}
              title="Generate Experiment Report"
            >
              Lab Report
            </button>
          </div>
          <SessionControls
            status={props.session_status}
            on_start_over={() => props.on_start_over()}
          />
          <StepCounter snapshot={props.snapshot} />
        </div>
        <div class="protocol-hud" aria-hidden="true">
          <span data-hud-step>{props.snapshot().current_step_name ?? ""}</span>
          <span data-hud-prompt>{props.snapshot().current_prompt ?? ""}</span>
          <span data-hud-progress>
            {props.snapshot().progress.completed_step_count}/
            {props.snapshot().progress.total_step_count}
          </span>
        </div>
      </header>

      <StepOutline steps={steps} entry_step={props.entry_step} snapshot={props.snapshot} />
      <GuidanceBar
        snapshot={props.snapshot}
        action_hint_open={props.action_hint_open}
        on_action_hint_toggle={(open: boolean) => props.on_action_hint_toggle(open)}
      />

      <MentorPanel
        open={mentor_open}
        on_close={() => set_mentor_open(false)}
        protocol_name={resolved_protocol_name}
        display_title={props.display_title}
        snapshot={props.snapshot}
        learning_goals={props.learning_goals}
      />

      <ReportModal
        open={report_open}
        on_close={() => set_report_open(false)}
        protocol_name={resolved_protocol_name}
        display_title={props.display_title}
        snapshot={props.snapshot}
        steps={steps}
        learning_objectives={props.learning_objectives}
      />
    </div>
  );
}
