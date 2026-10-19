"use client";

import { useEffect, useState } from "react";

import type { DeployedToken } from "@/components/build/DeploymentsTab";
import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { ChipMultiSelect } from "@/components/ui/ChipGroup";
import { Field, Input } from "@/components/ui/Input";
import { SegmentedField } from "@/components/ui/Segmented";
import { SelectField } from "@/components/ui/Select";
import { BUILD_COPY } from "@/content/build";
import { ALERT_KINDS, CHANNEL_KINDS, type AlertKind, type ChannelKind, explorerTx } from "@/lib/alerts/kinds";
import type { AlertChannelView, AlertEventView, AlertRuleView } from "@/lib/alerts/schema";
import { formatEthWei } from "@/lib/analytics";

/**
 * Monitoring and alerts on Deployments (M123, Studio+): the rules (an
 * address and what to watch), the channels (masked) and the last ten
 * events as text lines. The worker on Fly does the watching. PlusGate
 * for a free account.
 */
export function AlertsSection({ projectId, contracts, tokens }: { projectId: string; contracts: Array<{ address: string; label?: string }>; tokens: DeployedToken[] }) {
  return (
    <PlusGate feature="monitoring">
      <AlertsInner projectId={projectId} contracts={contracts} tokens={tokens} />
    </PlusGate>
  );
}

type Loaded = { rules: AlertRuleView[]; channels: AlertChannelView[]; events: AlertEventView[]; configured: boolean };

const OTHER = "other";

function AlertsInner({ projectId, contracts, tokens }: { projectId: string; contracts: Array<{ address: string; label?: string }>; tokens: DeployedToken[] }) {
  const C = BUILD_COPY.alerts;
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const known = [
    ...tokens.map((t) => ({ value: t.address, label: `${t.name}${t.symbol ? ` $${t.symbol}` : ""}` })),
    ...contracts.map((c) => ({ value: c.address, label: c.label ? `${c.label} ${c.address.slice(0, 6)}…${c.address.slice(-4)}` : c.address })),
  ];
  const [pick, setPick] = useState<string>(known[0]?.value ?? OTHER);
  const [custom, setCustom] = useState("");
  const [label, setLabel] = useState("");
  const [kinds, setKinds] = useState<AlertKind[]>(["ownership", "pause"]);
  const [threshold, setThreshold] = useState("");

  const [channelKind, setChannelKind] = useState<ChannelKind>("email");
  const [target, setTarget] = useState("");

  const load = async () => {
    const res = await fetch(`/api/ideation/projects/${projectId}/alerts`);
    if (!res.ok) {
      setFailed(C.loadFailed);
      return;
    }
    setData((await res.json()) as Loaded);
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const post = async (path: string, body: unknown) => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/alerts/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        setFailed(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? C.failed);
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  };
  const remove = async (path: string) => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/alerts/${path}`, { method: "DELETE" });
      if (!res.ok) setFailed(C.failed);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const addRule = async () => {
    const address = pick === OTHER ? custom.trim() : pick;
    const ok = await post("rules", { address, label: label.trim() || undefined, kinds, thresholdEth: kinds.includes("large_transfer") && threshold.trim() ? threshold.trim() : undefined });
    if (ok) {
      setLabel("");
      setThreshold("");
      setCustom("");
    }
  };
  const addChannel = async () => {
    const ok = await post("channels", { kind: channelKind, target: target.trim() });
    if (ok) setTarget("");
  };

  if (!data && !failed) return <p className="text-xs text-ink-500">{C.loading}</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-300">{C.intro}</p>
      {data && !data.configured ? <p className="text-xs text-ink-400">{C.notConfigured}</p> : null}

      <div className="space-y-3">
        <p className="text-xs font-medium text-ink-200">{C.rules}</p>
        {data?.rules.length ? (
          <ul className="space-y-1.5 text-xs text-ink-300">
            {data.rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span className="text-ink-200">{r.label || `${r.address.slice(0, 6)}…${r.address.slice(-4)}`}</span>
                <span className="text-ink-500">{r.kinds.map((k) => C.kinds[k]).join(" · ")}{r.thresholdWei ? ` · ${C.above(formatEthWei(r.thresholdWei))}` : ""}</span>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(`rules/${r.id}`)}>
                  {C.remove}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">{C.noRules}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label={C.addressLabel} value={pick} onChange={(v) => setPick(v || OTHER)} options={[...known, { value: OTHER, label: C.otherAddress }]} />
          {pick === OTHER ? (
            <Field label={C.customLabel}>
              <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="0x…" className="font-mono text-xs" />
            </Field>
          ) : (
            <Field label={C.labelLabel}>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={C.labelPlaceholder} maxLength={60} />
            </Field>
          )}
        </div>
        <ChipMultiSelect label={C.watchLabel} value={kinds} onChange={setKinds} options={ALERT_KINDS.map((k) => ({ value: k, label: C.kinds[k] }))} />
        {kinds.includes("large_transfer") ? (
          <Field label={C.thresholdLabel} hint={C.thresholdHint}>
            <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="1000" inputMode="decimal" />
          </Field>
        ) : null}
        <Button size="sm" disabled={busy || kinds.length === 0 || (pick === OTHER && !/^0x[a-fA-F0-9]{40}$/.test(custom.trim()))} onClick={addRule}>
          {C.addRule}
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-ink-200">{C.channels}</p>
        {data?.channels.length ? (
          <ul className="space-y-1.5 text-xs text-ink-300">
            {data.channels.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="text-ink-200">{C.channelKinds[c.kind]}</span>
                <span className="font-mono text-ink-500">{c.masked}</span>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(`channels/${c.id}`)}>
                  {C.remove}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">{C.noChannels}</p>
        )}
        <SegmentedField label={C.channelLabel} value={channelKind} onChange={setChannelKind} options={CHANNEL_KINDS.map((k) => ({ value: k, label: C.channelKinds[k] }))} />
        <Field label={C.targetLabel[channelKind]} hint={C.targetHint[channelKind]}>
          <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={C.targetPlaceholder[channelKind]} className={channelKind === "email" ? undefined : "font-mono text-xs"} />
        </Field>
        <Button size="sm" disabled={busy || target.trim().length < 3} onClick={addChannel}>
          {C.addChannel}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-200">{C.events}</p>
        {data?.events.length ? (
          <ul className="space-y-1.5 text-xs text-ink-300">
            {data.events.map((e) => {
              const sent = e.delivered ? Object.values(e.delivered) : [];
              const okCount = sent.filter((d) => d.ok).length;
              return (
                <li key={e.id}>
                  {e.line}{" "}
                  <a href={explorerTx(e.chainId, e.txHash)} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
                    {C.openTx}
                  </a>
                  <span className="text-ink-500">
                    {" · "}
                    {new Date(e.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {sent.length ? ` · ${C.delivered(okCount, sent.length)}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">{C.noEvents}</p>
        )}
      </div>
      {failed ? <p className="text-xs text-rose-400">{failed}</p> : null}
    </div>
  );
}
