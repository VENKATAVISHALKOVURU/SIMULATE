// src/shell/hud/mentor_panel.tsx
//
// Contextual AI scientific mentor panel. Captures read-only runtime snapshot
// context (active step, prompt, progress, targets) to query the isolated
// Groq backend. Degrades gracefully to local protocol guidance if the backend
// is offline or unconfigured.

import { createSignal, Show, For } from "solid-js";
import type { Accessor, JSXElement } from "solid-js";
import type { ShellViewSnapshot } from "../adapter/types.js";

export interface MentorPanelProps {
  readonly open: Accessor<boolean>;
  readonly on_close: () => void;
  readonly protocol_name: string;
  readonly display_title: string;
  readonly snapshot: Accessor<ShellViewSnapshot>;
  readonly learning_goals?: string | undefined;
}

interface MessageItem {
  readonly role: "user" | "mentor";
  readonly text: string;
  readonly hint?: string | undefined;
  readonly mode?: string | undefined;
  readonly timestamp: string;
}

interface MentorApiResponse {
  readonly status: string;
  readonly answer: string;
  readonly progressive_hint?: string;
  readonly mode?: string;
}

const BACKEND_BASE = "http://127.0.0.1:8001";

const QUICK_QUESTIONS = [
  "Why is this step scientifically necessary?",
  "What common laboratory mistake should I avoid here?",
  "How does this instrument or reagent work?",
  "What physical change should I observe after this action?",
];

export function MentorPanel(props: MentorPanelProps): JSXElement {
  const [question, set_question] = createSignal("");
  const [loading, set_loading] = createSignal(false);
  const [error_msg, set_error_msg] = createSignal<string | null>(null);
  const [messages, set_messages] = createSignal<MessageItem[]>([]);

  const ask_mentor = async (query_text: string): Promise<void> => {
    const trimmed = query_text.trim();
    if (!trimmed || loading()) return;

    set_loading(true);
    set_error_msg(null);

    const now_time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const user_msg: MessageItem = {
      role: "user",
      text: trimmed,
      timestamp: now_time,
    };
    set_messages((prev) => [...prev, user_msg]);
    set_question("");

    const snap = props.snapshot();
    const payload = {
      protocol_name: props.protocol_name,
      display_title: props.display_title,
      step_name: snap.current_step_name ?? "active_step",
      step_prompt: snap.current_prompt ?? "",
      learning_goals: props.learning_goals ?? "",
      question: trimmed,
      completed_step_count: snap.progress.completed_step_count,
      total_step_count: snap.progress.total_step_count,
      last_feedback: snap.last_interaction_feedback?.message ?? null,
    };

    try {
      const res = await fetch(`${BACKEND_BASE}/api/mentor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned code ${res.status}`);
      }

      const data = (await res.json()) as MentorApiResponse;
      const mentor_msg: MessageItem = {
        role: "mentor",
        text: data.answer,
        hint: data.progressive_hint ?? undefined,
        mode: data.mode === "live" ? "Groq Llama 3.3" : "Offline Guidance",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      set_messages((prev) => [...prev, mentor_msg]);
    } catch {
      // Local graceful fallback if backend is offline
      const current_prompt = snap.current_prompt;
      const fallback_hint = current_prompt
        ? `Focus on: "${current_prompt}". Observe highlighted target items on the bench.`
        : "Check the step outline and active highlighted equipment.";
      const mentor_fallback: MessageItem = {
        role: "mentor",
        text: `Laboratory Guidance for ${props.display_title}:\nEnsure you are following sequential aseptic technique. Verify the active object and its indicated gesture before proceeding.`,
        hint: fallback_hint,
        mode: "Offline Guidance (Backend Offline)",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      set_messages((prev) => [...prev, mentor_fallback]);
    } finally {
      set_loading(false);
    }
  };

  const handle_form_submit = (e: Event): void => {
    e.preventDefault();
    void ask_mentor(question());
  };

  return (
    <Show when={props.open()}>
      <aside class="sci-mentor-drawer" data-sci-mentor-panel aria-label="AI Laboratory Mentor">
        <div class="sci-mentor-header">
          <div class="sci-mentor-title-group">
            <span class="sci-mentor-badge">AI MENTOR</span>
            <h2 class="sci-mentor-title">Scientific Lab Coach</h2>
          </div>
          <button
            type="button"
            class="sci-btn-close"
            data-sci-mentor-close
            onClick={() => props.on_close()}
            aria-label="Close Mentor Panel"
          >
            x
          </button>
        </div>

        <div class="sci-mentor-context-strip">
          <span class="sci-context-label">Active Step:</span>
          <span class="sci-context-value">{props.snapshot().current_prompt ?? props.display_title}</span>
        </div>

        <div class="sci-mentor-messages" data-sci-mentor-messages>
          <Show when={messages().length === 0}>
            <div class="sci-mentor-empty">
              <p class="sci-empty-lead">Welcome to your Virtual Lab Coach.</p>
              <p class="sci-empty-sub">
                Ask questions regarding protocol theory, chemical mechanisms, or common pipetting pitfalls.
                The mentor guides your reasoning without spoiling validator checks.
              </p>
              <div class="sci-quick-questions">
                <span class="sci-quick-heading">Suggested Inquiries:</span>
                <For each={QUICK_QUESTIONS}>
                  {(q) => (
                    <button
                      type="button"
                      class="sci-quick-chip"
                      onClick={() => {
                        void ask_mentor(q);
                      }}
                    >
                      {q}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <For each={messages()}>
            {(msg) => (
              <div class={`sci-msg-card sci-msg-${msg.role}`}>
                <div class="sci-msg-meta">
                  <span class="sci-msg-author">{msg.role === "user" ? "You" : "Lab Mentor"}</span>
                  <Show when={msg.mode}>
                    <span class="sci-msg-mode">{msg.mode}</span>
                  </Show>
                  <span class="sci-msg-time">{msg.timestamp}</span>
                </div>
                <div class="sci-msg-body">{msg.text}</div>
                <Show when={msg.hint}>
                  <div class="sci-msg-hint">
                    <span class="sci-hint-tag">Progressive Hint</span>
                    <p class="sci-hint-text">{msg.hint}</p>
                  </div>
                </Show>
              </div>
            )}
          </For>

          <Show when={loading()}>
            <div class="sci-msg-loading" aria-live="polite">
              <span class="sci-spinner" aria-hidden="true"></span>
              <span>Consulting laboratory mentor...</span>
            </div>
          </Show>
        </div>

        <form class="sci-mentor-form" onSubmit={handle_form_submit}>
          <Show when={error_msg()}>
            <div class="sci-form-error">{error_msg()}</div>
          </Show>
          <div class="sci-input-row">
            <input
              type="text"
              class="sci-mentor-input"
              data-sci-mentor-input
              placeholder="Ask a scientific or technique question (e.g. why aspirate slowly?)..."
              value={question()}
              onInput={(e) => set_question(e.currentTarget.value)}
              maxLength={500}
              disabled={loading()}
            />
            <button
              type="submit"
              class="sci-btn-ask"
              data-sci-mentor-submit
              disabled={loading() || !question().trim()}
            >
              Ask
            </button>
          </div>
          <div class="sci-input-footer">
            <span class="sci-char-count">{question().length}/500</span>
            <span class="sci-guardrail-note">Read-only guidance * Cannot advance simulation</span>
          </div>
        </form>
      </aside>
    </Show>
  );
}
