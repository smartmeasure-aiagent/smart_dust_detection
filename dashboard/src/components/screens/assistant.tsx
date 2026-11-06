"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { Badge, BarChart, PageHeader, Panel, Stat, Toggle } from "@/components/ui";
import { Bin, ScreenProps } from "@/lib/fleet";
import { CHAT_SESSIONS, VOICE_INTENTS } from "@/lib/mock";

// Build a ready-to-speak answer from live fleet data for the demo box.
function speechFor(intent: string, bins: Bin[], live: ScreenProps["live"]): string {
  const liveBin = bins.find((b) => b.isReal);
  const full = bins.filter((b) => b.online && b.fill >= 80).sort((a, b) => b.fill - a.fill);
  switch (intent) {
    case "check_bin_fill":
      return liveBin && live.data?.ts != null
        ? `${liveBin.name} is ${live.data.fill} percent full. ${live.data.fill >= 80 ? "It needs to be collected now." : "No collection needed."}`
        : `${liveBin?.name ?? "The live bin"} has no recent reading from its sensor yet.`;
    case "list_full_bins":
      return full.length
        ? `${full.length} ${full.length === 1 ? "bin needs" : "bins need"} collection: ${full.slice(0, 3).map((b) => `${b.name} at ${b.fill} percent`).join(", ")}.`
        : "Good news — no bins currently need collection.";
    case "check_device_health": {
      const faults = bins.filter((b) => b.online && !b.sensorOk);
      const off = bins.filter((b) => !b.online);
      return faults.length || off.length
        ? `${faults.length} ${faults.length === 1 ? "sensor is" : "sensors are"} faulty and ${off.length} ${off.length === 1 ? "device is" : "devices are"} offline. The rest are healthy.`
        : "All devices are online and every sensor is responding normally.";
    }
    case "fill_trend":
      return `The live bin is filling at about ${liveBin?.fillRate ?? 3} percent per hour. At this rate it reaches full in a few hours.`;
    case "collections_today":
      return `${live.stats?.collections_today ?? 41} collections have been completed today across all five zones.`;
    case "acknowledge_reset":
      return "Understood — I've marked that bin as collected and reset its fill level to empty.";
    default:
      return "I can report fill levels, list full bins, check device health, or confirm a collection.";
  }
}

// ================= AI Voice Assistant =================
export function VoiceScreen({ bins, live }: ScreenProps) {
  const [intent, setIntent] = useState("list_full_bins");
  const [voiceOn, setVoiceOn] = useState(true);
  const answer = speechFor(intent, bins, live);
  const totalCalls = VOICE_INTENTS.reduce((s, v) => s + v.calls, 0);

  return (
    <>
      <PageHeader title="AI Voice Assistant" desc="The voice agent reads live bin data to callers over phone, web and WhatsApp">
        <Badge color="var(--good)"><span className="h-1.5 w-1.5 rounded-full dot-live" style={{ background: "var(--good)" }} />Agent online</Badge>
      </PageHeader>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Calls today" value="138" icon="phone" color="var(--brand)" sub="+12% vs yesterday" />
        <Stat label="Avg duration" value="1m 04s" icon="clock" color="var(--brand-2)" />
        <Stat label="Resolution rate" value="91%" icon="check" color="var(--good)" sub="without escalation" />
        <Stat label="Intents handled" value={VOICE_INTENTS.length} icon="voice" color="var(--accent)" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
        <Panel title="Try a query" subtitle="See exactly what the agent would say from live data" icon="voice">
          <div className="flex flex-wrap gap-2">
            {VOICE_INTENTS.map((v) => (
              <button key={v.intent} onClick={() => setIntent(v.intent)} className="btn !px-3 !py-1.5 !text-xs" style={intent === v.intent ? { background: "var(--brand)", color: "#04120c" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[color:var(--brand)]" style={{ background: "color-mix(in srgb, var(--brand) 14%, transparent)" }}><Icon name="voice" className="h-5 w-5" /></span>
            <div>
              <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Agent speaks</div>
              <p className="mt-1 text-sm leading-relaxed">“{answer}”</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl p-3 font-mono text-[0.7rem] text-muted" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            POST /api/voice/query · {"{"} &quot;intent&quot;: &quot;{intent}&quot; {"}"} → returns {"{"} speech, data {"}"}
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel title="Top intents" subtitle={`${totalCalls.toLocaleString()} calls this month`} icon="analytics">
            <BarChart data={VOICE_INTENTS.map((v) => ({ label: v.intent.split("_")[0], value: v.calls }))} color="var(--brand-2)" />
          </Panel>
          <Panel title="Agent settings" icon="settings">
            <div className="space-y-3">
              {[
                ["Voice responses", voiceOn, () => setVoiceOn((v) => !v)],
                ["Outbound full-bin calls", true, undefined],
                ["WhatsApp channel", true, undefined],
                ["Escalate on sensor fault", true, undefined],
              ].map(([label, on, fn], i) => (
                <div key={i} className="flex items-center justify-between">
                  <div><div className="text-sm font-medium">{label as string}</div></div>
                  <Toggle on={on as boolean} onClick={fn as (() => void) | undefined} />
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-medium">Voice &amp; language</span>
                <span className="rounded-lg px-3 py-1.5 text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>English (IN) · Female</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

// ================= Chat History =================
export function ChatScreen() {
  const [open, setOpen] = useState<string>(CHAT_SESSIONS[0].id);
  const [channel, setChannel] = useState("All");
  const shown = CHAT_SESSIONS.filter((s) => channel === "All" || s.channel === channel);
  const outcomeColor: Record<string, string> = { Resolved: "var(--good)", Dispatched: "var(--brand-2)", Escalated: "var(--warning)" };

  return (
    <>
      <PageHeader title="Chat History" desc="Transcripts of every voice and chat session with the assistant" />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sessions today" value="138" icon="chat" color="var(--brand)" />
        <Stat label="Resolved" value="126" icon="check" color="var(--good)" sub="91%" />
        <Stat label="Dispatched" value="34" icon="truck" color="var(--brand-2)" />
        <Stat label="Escalated" value="12" icon="warning" color="var(--warning)" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {["All", "Phone", "Web", "WhatsApp"].map((ch) => (
          <button key={ch} onClick={() => setChannel(ch)} className="btn !px-3 !py-1.5 !text-xs" style={channel === ch ? { background: "var(--brand)", color: "#04120c" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--ink)" }}>{ch}</button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((s) => {
          const isOpen = open === s.id;
          return (
            <Panel key={s.id} pad={false}>
              <button onClick={() => setOpen(isOpen ? "" : s.id)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[color:var(--brand-2)]" style={{ background: "color-mix(in srgb, var(--brand-2) 14%, transparent)" }}><Icon name="chat" className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{s.caller}</span><Badge color="var(--muted)">{s.channel}</Badge></div>
                  <div className="truncate text-xs text-muted">{s.id} · intent: {s.intent} · {Math.round(s.durationS)}s</div>
                </div>
                <span className="hidden shrink-0 font-mono text-[0.7rem] text-muted sm:block">{s.startedAgo}</span>
                <Badge color={outcomeColor[s.outcome]}>{s.outcome}</Badge>
                <Icon name="chevron" className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>
              {isOpen && (
                <div className="space-y-2.5 border-t border-line p-4">
                  {s.turns.map((t, i) => (
                    <div key={i} className={`flex ${t.who === "agent" ? "justify-start" : "justify-end"}`}>
                      <div className="max-w-[80%] rounded-2xl px-3.5 py-2 text-sm" style={t.who === "agent" ? { background: "color-mix(in srgb, var(--brand) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--brand) 24%, transparent)" } : { background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <div className="mb-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted">{t.who === "agent" ? "Assistant" : "Caller"}</div>
                        {t.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </>
  );
}
