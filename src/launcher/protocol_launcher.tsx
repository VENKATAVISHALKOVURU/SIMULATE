// src/launcher/protocol_launcher.tsx
//
// Launcher component: gives students a clear choice between guided workflows
// and focused technique practice. It reads the slim protocol index
// and keeps every protocol as one ordinary link so normal browser navigation
// remains available.
//
// Tier 1: "Guided workflows" -- sequence_runner entries, prominent cards.
// Tier 2: "Mini-protocols" -- mini_protocol entries grouped by cluster.
// Tier 3: "Physics simulation roadmap" -- honest upcoming modules.

import { createSignal, For, Show } from "solid-js";
import type { ProtocolIndexSlimEntry } from "../shell/adapter/types.js";
import type { JSXElement } from "solid-js";

export interface LauncherProps {
  readonly index: ReadonlyArray<ProtocolIndexSlimEntry>;
}

// Known acronyms that must remain upper-cased in cluster labels.
const ACRONYMS: Readonly<Record<string, string>> = {
  sdspage: "SDS-PAGE",
  mtt: "MTT",
  pbs: "PBS",
  dmso: "DMSO",
  hepes: "HEPES",
};

function formatToken(token: string): string {
  const lower = token.toLowerCase();
  if (ACRONYMS[lower]) {
    return ACRONYMS[lower];
  }
  if (token.length === 0) {
    return token;
  }
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function deriveClusterLabel(cluster: string): string {
  const tokens = cluster.split("_");
  const formatted = tokens.map(formatToken);
  const joined = formatted.join(" ");
  return joined;
}

interface ClusterGroup {
  readonly cluster_key: string;
  readonly cluster_label: string;
  readonly entries: ReadonlyArray<ProtocolIndexSlimEntry>;
}

function groupByCluster(index: ReadonlyArray<ProtocolIndexSlimEntry>): ReadonlyArray<ClusterGroup> {
  const buckets = new Map<string, ProtocolIndexSlimEntry[]>();
  for (const entry of index) {
    const key = entry.cluster;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      buckets.set(key, [entry]);
    }
  }
  const sorted_keys = Array.from(buckets.keys()).sort();
  const groups: ClusterGroup[] = [];
  for (const key of sorted_keys) {
    const bucket = buckets.get(key);
    if (!bucket) {
      continue;
    }
    const sorted_entries = bucket
      .slice()
      .sort((a, b) => a.protocol_name.localeCompare(b.protocol_name));
    groups.push({
      cluster_key: key,
      cluster_label: deriveClusterLabel(key),
      entries: sorted_entries,
    });
  }
  return groups;
}

function kindLabel(protocol_type: ProtocolIndexSlimEntry["protocol_type"]): string {
  if (protocol_type === "sequence_runner") {
    return "Guided workflow";
  }
  return "Focused technique practice";
}

function callToAction(protocol_type: ProtocolIndexSlimEntry["protocol_type"]): string {
  if (protocol_type === "sequence_runner") {
    return "Open guided workflow";
  }
  return "Practice this technique";
}

function renderEntry(entry: ProtocolIndexSlimEntry): JSXElement {
  const protocol_name = entry.protocol_name;
  const display_title = entry.display_title;
  const learning_goal_hook = entry.learning_goal_hook;
  const protocol_type = entry.protocol_type;
  const step_count = entry.step_count;
  const href = protocol_name + ".html";

  return (
    <a
      class="protocol-card"
      data-protocol-id={protocol_name}
      data-protocol-type={protocol_type}
      data-cluster={entry.cluster}
      data-launcher-link
      href={href}
    >
      <div class="protocol-card-header">
        <div class="protocol-card-badge-row">
          <span class="sci-status-pill sci-status-available">Available</span>
          <span class="protocol-card-steps" data-launcher-step-count>
            {step_count} steps
          </span>
        </div>
        <span class="protocol-card-title" data-launcher-link-name>
          {display_title}
        </span>
      </div>
      <span class="protocol-card-kind" data-launcher-kind>
        {kindLabel(protocol_type)}
      </span>
      <Show when={learning_goal_hook}>
        <p class="protocol-card-hook" data-launcher-link-description>
          {learning_goal_hook}
        </p>
      </Show>
      <span class="protocol-card-cta" data-launcher-cta>
        {callToAction(protocol_type)}
      </span>
    </a>
  );
}

function renderCluster(group: ClusterGroup): JSXElement {
  return (
    <section class="cluster-section" data-cluster={group.cluster_key}>
      <details class="cluster-disclosure">
        <summary class="cluster-summary" data-launcher-cluster-toggle>
          <span class="cluster-heading">{group.cluster_label}</span>
          <span class="cluster-toggle-copy">
            <span class="cluster-entry-count">
              {group.entries.length} {group.entries.length === 1 ? "technique" : "techniques"}
            </span>
            <span class="cluster-toggle-state">
              <span class="cluster-toggle-show">Show</span>
              <span class="cluster-toggle-hide">Hide</span>
            </span>
          </span>
        </summary>
        <div class="protocol-card-grid" data-launcher-list>
          <For each={group.entries}>{renderEntry}</For>
        </div>
      </details>
    </section>
  );
}

export function Launcher(props: LauncherProps): JSXElement {
  const [query, set_query] = createSignal("");

  // Partition into sequence runners and mini-protocols
  const runners: ProtocolIndexSlimEntry[] = [];
  const minis: ProtocolIndexSlimEntry[] = [];
  for (const entry of props.index) {
    if (entry.protocol_type === "sequence_runner") {
      runners.push(entry);
    } else if (entry.protocol_type === "mini_protocol") {
      minis.push(entry);
    }
  }

  const filtered_runners = (): ReadonlyArray<ProtocolIndexSlimEntry> => {
    const q = query().trim().toLowerCase();
    if (!q) {
      return runners.slice().sort((a, b) => a.protocol_name.localeCompare(b.protocol_name));
    }
    return runners
      .filter((e) => e.display_title.toLowerCase().includes(q) || (e.learning_goal_hook ?? "").toLowerCase().includes(q))
      .sort((a, b) => a.protocol_name.localeCompare(b.protocol_name));
  };

  const filtered_minis = (): ReadonlyArray<ClusterGroup> => {
    const q = query().trim().toLowerCase();
    if (!q) {
      return groupByCluster(minis);
    }
    const matching = minis.filter(
      (e) =>
        e.display_title.toLowerCase().includes(q) ||
        e.cluster.toLowerCase().includes(q) ||
        (e.learning_goal_hook ?? "").toLowerCase().includes(q),
    );
    return groupByCluster(matching);
  };

  const runners_sorted = runners.slice().sort((a, b) => a.protocol_name.localeCompare(b.protocol_name));
  const mini_groups = groupByCluster(minis);

  return (
    <div class="launcher-root" data-launcher-root>
      <header class="launcher-header">
        <div class="launcher-badge-container">
          <span class="sci-hero-badge">Professional Virtual Laboratory</span>
        </div>
        <h1 class="launcher-title" data-launcher-title>
          Choose your lab experience
        </h1>
        <p class="launcher-subtitle">Choose a guided workflow or focused technique practice.</p>

        <div class="launcher-search-toolbar">
          <div class="launcher-search-box">
            <span class="launcher-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16" y2="16" />
              </svg>
            </span>
            <input
              type="search"
              class="launcher-search-input"
              data-launcher-search
              placeholder="Search experiments by title or technique..."
              value={query()}
              onInput={(e) => set_query(e.currentTarget.value)}
              aria-label="Search laboratory experiments"
            />
            <Show when={query().length > 0}>
              <button
                type="button"
                class="launcher-search-clear"
                data-launcher-search-clear
                onClick={() => set_query("")}
                aria-label="Clear search"
              >
                x
              </button>
            </Show>
          </div>
        </div>

        <nav class="launcher-path-nav" aria-label="Choose a protocol path">
          <Show when={runners_sorted.length > 0}>
            <a href="#guided-workflows">Browse guided workflows</a>
          </Show>
          <Show when={mini_groups.length > 0}>
            <a href="#focused-technique-practice">Practice a focused technique</a>
          </Show>
          <a href="#physics-roadmap">Explore upcoming physics modules</a>
        </nav>
      </header>

      <main class="launcher-main">
        <Show when={runners_sorted.length === 0 && mini_groups.length === 0}>
          <div class="launcher-empty-state" data-launcher-empty>
            <p class="launcher-empty-heading">No protocols available</p>
            <p class="launcher-empty-body">
              No protocol files were found in the index. If you are a course author, add
              mini-protocol or sequence-runner YAML files under content and rebuild the protocol
              index. If you are a student, contact your instructor.
            </p>
          </div>
        </Show>

        <Show when={runners_sorted.length > 0}>
          <section
            id="guided-workflows"
            class="launcher-tier launcher-tier-runners"
            data-launcher-tier="runners"
          >
            <div class="tier-heading-group">
              <h2 class="tier-heading">Guided workflows</h2>
              <p class="tier-description">Follow the authored steps in each workflow.</p>
            </div>
            <div class="protocol-card-grid protocol-card-grid-runners" data-launcher-list="runners">
              <For each={filtered_runners()}>{renderEntry}</For>
            </div>
          </section>
        </Show>

        <Show when={mini_groups.length > 0}>
          <section
            id="focused-technique-practice"
            class="launcher-tier launcher-tier-minis"
            data-launcher-tier="minis"
          >
            <div class="tier-heading-group">
              <h2 class="tier-heading">Focused technique practice</h2>
              <p class="tier-description">
                Practice one laboratory technique at a time, grouped by topic.
              </p>
            </div>
            <For each={filtered_minis()}>{renderCluster}</For>
          </section>
        </Show>

        {/* Honest Physics Roadmap Section */}
        <section id="physics-roadmap" class="launcher-tier launcher-tier-roadmap" data-roadmap-tier="physics">
          <div class="tier-heading-group">
            <div class="sci-roadmap-badge-row">
              <span class="sci-status-pill sci-status-roadmap">Architecture Roadmap</span>
              <span class="sci-roadmap-note">Coexists with biology contracts without fake simulation</span>
            </div>
            <h2 class="tier-heading">Upcoming physics experiments</h2>
            <p class="tier-description">
              In-design simulations governed by continuous differential circuit equations.
            </p>
          </div>

          <div class="sci-roadmap-grid">
            <article class="sci-roadmap-card">
              <div class="sci-card-header">
                <span class="sci-status-pill sci-status-planned">Coming soon</span>
                <span class="sci-card-domain">Direct Current Circuits</span>
              </div>
              <h3 class="sci-card-title">Ohm's Law and Resistive Networks</h3>
              <p class="sci-card-desc">
                Interactive DC power supply, resistor decade box, and digital multimeter for empirical
                verification of voltage, current, and power dissipation relationships.
              </p>
              <div class="sci-card-eq">
                <code>V = I * R</code> &bull; <code>P = V * I</code>
              </div>
            </article>

            <article class="sci-roadmap-card">
              <div class="sci-card-header">
                <span class="sci-status-pill sci-status-planned">Coming soon</span>
                <span class="sci-card-domain">Transient Dynamics</span>
              </div>
              <h3 class="sci-card-title">Capacitive Time Constants and RC Networks</h3>
              <p class="sci-card-desc">
                Step-voltage charging and discharging analysis with oscilloscope voltage sweep curves
                and empirical time-constant measurements.
              </p>
              <div class="sci-card-eq">
                <code>&tau; = R * C</code> &bull; <code>V(t) = V&#x2080;(1 - e^&#40;-t/&tau;&#41;)</code>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
