"use client";

import { useEffect, useRef, useState } from "react";

import type { DeployedToken } from "@/components/build/DeploymentsTab";
import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { ChipMultiSelect } from "@/components/ui/ChipGroup";
import { Collapsible } from "@/components/ui/Collapsible";
import { Field, Input } from "@/components/ui/Input";
import { SegmentedField } from "@/components/ui/Segmented";
import { SelectField } from "@/components/ui/Select";
import { BUILD_COPY } from "@/content/build";
import { ALERT_CHAINS, ALERT_KINDS, ALERT_LIMITS, type AlertKind, explorerTx } from "@/lib/alerts/kinds";
import { type AlertsView, formatBaseUnits } from "@/lib/alerts/schema";

/**
 * Monitoring and alerts on Deployments (M123, made simple in M128,
 * Studio+): the Watch switch, a status line from the worker's heartbeat,
 * the channels with guided Telegram and Discord connections, a test alert
 * button, the last ten events, and the per address form behind a fold.
 * Plain text status, no chips. PlusGate for a free account.
 */
export function AlertsSection({ projectId, contracts, tokens }: { projectId: string; contracts: Array<{ address: string; label?: string }>; tokens: DeployedToken[] }) {
  return (
    <PlusGate feature="monitoring">
      <AlertsInner projectId={projectId} contracts={contracts} tokens={tokens} />
    </PlusGate>
  );
}

const OTHER = "other";
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const POLL_PAIRING_MS = 3_000;
const POLL_PENDING_MS = 20_000;

type Pairing = { link: string; since: number; channelsBefore: number };

function AlertsInner({ projectId, contracts, tokens }: { projectId: string; contracts: Array<{ address: string; label?: string }>; tokens: DeployedToken[] }) {
  const C = BUILD_COPY.alerts;
  const [data, setData] = useState<AlertsView | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Set by every write; the status reads pending until the worker checked after it. */
  const [changedAt, setChangedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [discordOpen, setDiscordOpen] = useState(false);
  const [webhook, setWebhook] = useState("");
  const [ownBot, setOwnBot] = useState("");
  const [testLine, setTestLine] = useState<string | null>(null);

  const known = [
    ...tokens.map((t) => ({ value: t.address, label: `${t.name}${t.symbol ? ` $${t.symbol}` : ""}` })),
    ...contracts.filter((c) => ADDRESS.test(c.address)).map((c) => ({ value: c.address, label: c.label ? `${c.label} ${c.address.slice(0, 6)}…${c.address.slice(-4)}` : c.address })),
  ];
  const [pick, setPick] = useState<string>(known[0]?.value ?? OTHER);
  const [custom, setCustom] = useState("");
  const [label, setLabel] = useState("");
  const [kinds, setKinds] = useState<AlertKind[]>(["ownership", "pause"]);
  const [threshold, setThreshold] = useState("");

  const load = async (): Promise<AlertsView | null> => {
    const res = await fetch(`/api/ideation/projects/${projectId}/alerts`);
    if (!res.ok) {
      setFailed(C.loadFailed);
      return null;
    }
    const next = (await res.json()) as AlertsView;
    setData(next);
    setNow(Date.now());
    return next;
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const pending = Boolean(changedAt && (!data?.status.workerAt || new Date(data.status.workerAt).getTime() < changedAt));
  const pairingRef = useRef(pairing);
  pairingRef.current = pairing;

  // A pairing polls fast until the channel appears; a change polls slowly until the worker caught up; a watched project refreshes the "last checked" line.
  useEffect(() => {
    const interval = pairing ? POLL_PAIRING_MS : pending || (data?.rules.length ?? 0) > 0 ? POLL_PENDING_MS : 0;
    if (!interval) return;
    const id = setInterval(async () => {
      const next = await load();
      const p = pairingRef.current;
      if (p && next) {
        if (next.channels.length > p.channelsBefore) {
          setPairing(null);
          setNotice(C.telegramConnected);
        } else if (Date.now() - p.since > ALERT_LIMITS.pairingMs) {
          setPairing(null);
          setNotice(C.telegramExpired);
        }
      }
    }, interval);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairing, pending, data?.rules.length, projectId]);
  useEffect(() => {
    if (changedAt && data?.status.workerAt && new Date(data.status.workerAt).getTime() >= changedAt) setChangedAt(null);
  }, [changedAt, data?.status.workerAt]);

  const post = async (path: string, body?: unknown): Promise<Record<string, unknown> | null> => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/alerts/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
      const json = ((await res.json().catch(() => null)) as Record<string, unknown> | null) ?? null;
      if (!res.ok) {
        setFailed((json?.error as string | undefined) ?? C.failed);
        return null;
      }
      return json ?? {};
    } finally {
      setBusy(false);
    }
  };
  const changed = async () => {
    setChangedAt(Date.now());
    await load();
  };
  const remove = async (path: string) => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/alerts/${path}`, { method: "DELETE" });
      if (!res.ok) setFailed(C.failed);
      await changed();
    } finally {
      setBusy(false);
    }
  };

  const setWatch = async (enabled: boolean) => {
    setNotice(null);
    const r = await post("watch", { enabled });
    if (!r) return;
    if (enabled && r.email === "added" && data) setNotice(C.watch.emailAdded(data.channels.find((c) => c.kind === "email")?.masked ?? ""));
    if (enabled && r.email === "none") setNotice(C.watch.emailNone);
    const next = await load();
    setChangedAt(Date.now());
    if (enabled && r.email === "added" && next) setNotice(C.watch.emailAdded(next.channels.find((c) => c.kind === "email")?.masked ?? ""));
  };
  const addRule = async () => {
    const address = pick === OTHER ? custom.trim() : pick;
    const r = await post("rules", { address, label: label.trim() || undefined, kinds, thresholdEth: kinds.includes("large_transfer") && threshold.trim() ? threshold.trim() : undefined });
    if (r) {
      setLabel("");
      setThreshold("");
      setCustom("");
      await changed();
    }
  };
  const addChannel = async (kind: "email" | "telegram" | "discord", target: string, onDone: () => void) => {
    const r = await post("channels", { kind, target: target.trim() });
    if (r) {
      onDone();
      if (kind === "discord") setNotice(C.discordConnected);
      await changed();
    }
  };
  const connectTelegram = async () => {
    setNotice(null);
    const r = await post("telegram");
    if (!r || typeof r.link !== "string") return;
    window.open(r.link, "_blank", "noopener");
    setPairing({ link: r.link, since: Date.now(), channelsBefore: data?.channels.length ?? 0 });
  };
  const sendTest = async () => {
    setTestLine(null);
    setNotice(null);
    const r = await post("test");
    if (!r) return;
    const delivered = (r.delivered ?? {}) as Record<string, { ok: boolean }>;
    const ids = Object.keys(delivered);
    setTestLine(C.testSent(ids.filter((id) => delivered[id].ok).length, ids.length));
    await load();
  };

  if (!data && !failed) return <p className="text-xs text-ink-500">{C.loading}</p>;

  const rules = data?.rules ?? [];
  const chainId = rules[0]?.chainId;
  const chain = ALERT_CHAINS.find((c) => c.chainId === chainId);
  const checkedAt = data?.status.chains.find((c) => c.chainId === chainId)?.checkedAt ?? data?.status.workerAt ?? null;
  const statusLine = (() => {
    if (!data) return null;
    if (data.status.stale && data.status.workerAt) return C.status.stale(new Date(data.status.workerAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    if (rules.length === 0) return C.status.none;
    if (!checkedAt) return C.status.never;
    if (pending) return C.status.pending;
    return C.status.watching(rules.length, chain?.name ?? "the testnet", C.status.ago(Math.max(0, Math.round((now - new Date(checkedAt).getTime()) / 1000))));
  })();
  const channelName = (id: string) => {
    const c = data?.channels.find((x) => x.id === id);
    return c ? `${C.channelKinds[c.kind]} ${c.masked}` : "a removed channel";
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-300">{C.intro}</p>
      {data && !data.configured ? <p className="text-xs text-ink-400">{C.notConfigured}</p> : null}

      <div className="space-y-2">
        <SegmentedField label={C.watch.label} value={data?.watch ? "on" : "off"} onChange={(v) => void setWatch(v === "on")} options={[{ value: "on", label: C.watch.on, disabled: busy }, { value: "off", label: C.watch.off, disabled: busy }]} hint={C.watch.explain} />
        {!data?.watch && known.length === 0 ? <p className="text-xs text-ink-500">{C.watch.nothing}</p> : null}
        {statusLine ? <p className="text-sm text-ink-200">{statusLine}</p> : null}
        {notice ? <p className="text-xs text-ink-300">{notice}</p> : null}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-ink-200">{C.rules}</p>
        {rules.length ? (
          <ul className="space-y-1.5 text-xs text-ink-300">
            {rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2">
                <span className="text-ink-200">{r.label || `${r.address.slice(0, 6)}…${r.address.slice(-4)}`}</span>
                <span className="text-ink-500">
                  {r.kinds.map((k) => C.kinds[k]).join(" · ")}
                  {r.thresholdWei ? ` · ${C.above(formatBaseUnits(r.thresholdWei, r.decimals))}` : ""}
                  {r.source === "watch" ? ` · ${C.fromWatch}` : ""}
                </span>
                {r.source === "manual" ? (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(`rules/${r.id}`)}>
                    {C.remove}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">{C.noRules}</p>
        )}
        <Collapsible summary={C.anotherAddress}>
          <div className="space-y-3">
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
            <Button size="sm" disabled={busy || kinds.length === 0 || (pick === OTHER && !ADDRESS.test(custom.trim()))} onClick={addRule}>
              {C.addRule}
            </Button>
          </div>
        </Collapsible>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-ink-200">{C.channels}</p>
        {data?.channels.length ? (
          <ul className="space-y-1.5 text-xs text-ink-300">
            {data.channels.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <span className="text-ink-200">{C.channelKinds[c.kind]}</span>
                <span className={c.kind === "discord" ? "font-mono text-ink-500" : "text-ink-500"}>{c.masked}</span>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => remove(`channels/${c.id}`)}>
                  {C.remove}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">{C.noChannels}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEmailOpen((o) => !o)}>
            {C.addEmail}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy || Boolean(pairing)} onClick={connectTelegram} title={data?.telegram.available ? undefined : C.telegramUnavailable}>
            {C.connectTelegram}
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDiscordOpen((o) => !o)}>
            {C.connectDiscord}
          </Button>
          <Button size="sm" disabled={busy || !data?.channels.length} onClick={sendTest} title={data?.channels.length ? undefined : C.testNoChannel}>
            {busy ? C.testing : C.test}
          </Button>
        </div>
        {data && !data.telegram.available ? <p className="text-xs text-ink-500">{C.telegramUnavailable}</p> : null}
        {pairing ? (
          <p className="text-xs text-ink-300">
            {C.telegramWaiting}{" "}
            <a href={pairing.link} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
              {C.telegramOpen}
            </a>
          </p>
        ) : null}
        {emailOpen ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <Field label={C.emailLabel}>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
              </Field>
            </div>
            <Button size="sm" disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} onClick={() => addChannel("email", email, () => { setEmail(""); setEmailOpen(false); })}>
              {C.connect}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEmailOpen(false)}>
              {C.cancel}
            </Button>
          </div>
        ) : null}
        {discordOpen ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <Field label={C.discordLabel} hint={C.discordHint}>
                <Input value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/…" className="font-mono text-xs" />
              </Field>
            </div>
            <Button size="sm" disabled={busy || !webhook.trim().startsWith("https://")} onClick={() => addChannel("discord", webhook, () => { setWebhook(""); setDiscordOpen(false); })}>
              {C.connect}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setDiscordOpen(false)}>
              {C.cancel}
            </Button>
          </div>
        ) : null}
        {testLine ? <p className="text-xs text-ink-300">{testLine}</p> : null}
        <Collapsible summary={C.ownBot}>
          <div className="space-y-3">
            <Field label={C.ownBotLabel} hint={C.ownBotHint}>
              <Input value={ownBot} onChange={(e) => setOwnBot(e.target.value)} placeholder={C.ownBotPlaceholder} className="font-mono text-xs" />
            </Field>
            <Button size="sm" disabled={busy || ownBot.trim().length < 3} onClick={() => addChannel("telegram", ownBot, () => setOwnBot(""))}>
              {C.addChannel}
            </Button>
          </div>
        </Collapsible>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-ink-200">{C.events}</p>
        {data?.events.length ? (
          <ul className="space-y-1.5 text-xs text-ink-300">
            {data.events.map((e) => {
              const sent = e.delivered ? Object.entries(e.delivered) : [];
              const okCount = sent.filter(([, d]) => d.ok).length;
              const failures = sent.filter(([, d]) => !d.ok);
              return (
                <li key={e.id}>
                  {e.kind === "test" ? <span className="text-ink-500">{C.testLabel} · </span> : null}
                  {e.line}{" "}
                  {e.kind !== "test" ? (
                    <a href={explorerTx(e.chainId, e.txHash)} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
                      {C.openTx}
                    </a>
                  ) : null}
                  <span className="text-ink-500">
                    {" · "}
                    {new Date(e.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {sent.length ? ` · ${C.delivered(okCount, sent.length)}` : ""}
                  </span>
                  {failures.length ? (
                    <span className="block text-ink-500">{failures.map(([id, d]) => C.deliveryError(channelName(id), d.error ?? "no answer")).join(". ")}</span>
                  ) : null}
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
