"use client";

import { useEffect, useState } from "react";

import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { BUILD_COPY } from "@/content/build";
import type { DomainStatus } from "@/lib/domains";

type Loaded = DomainStatus & { slug: string | null; published: boolean; visibility: "public" | "private" };

/**
 * The custom domain on Publish (M127, Studio+): a host to connect, the
 * DNS records to set while it is not verified, the state as a sentence,
 * Disconnect. PlusGate for a free account.
 */
export function DomainSection({ projectId }: { projectId: string }) {
  return (
    <PlusGate feature="custom_domain">
      <Inner projectId={projectId} />
    </PlusGate>
  );
}

function Inner({ projectId }: { projectId: string }) {
  const C = BUILD_COPY.domain;
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [host, setHost] = useState("");

  const load = async () => {
    const res = await fetch(`/api/ideation/projects/${projectId}/domain`);
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

  const connect = async () => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/domain`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain: host }) });
      if (!res.ok) {
        setFailed(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? C.failed);
        return;
      }
      setData((await res.json()) as Loaded);
      setHost("");
    } finally {
      setBusy(false);
    }
  };
  const disconnect = async () => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/domain`, { method: "DELETE" });
      if (!res.ok) setFailed(C.failed);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!data && !failed) return <p className="text-xs text-ink-500">{C.loading}</p>;
  const state = !data?.domain ? C.none : !data.configured ? C.notConfigured : data.verified && !data.misconfigured ? C.live(data.domain) : C.waiting(data.domain);

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-500">{C.intro}</p>
      <p className="text-xs text-ink-400">{state}</p>
      {data?.domain ? (
        <>
          {data.records.length && !(data.verified && !data.misconfigured) ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-ink-200">{C.records}</p>
              <ul className="space-y-1 font-mono text-xs text-ink-300">
                {data.records.map((r) => (
                  <li key={`${r.type}-${r.name}`}>
                    {r.type} {r.name} {r.value}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink-500">{C.recordsHint}</p>
            </div>
          ) : null}
          {!data.published ? <p className="text-xs text-ink-500">{C.unpublished}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void load()}>
              {C.check}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={disconnect}>
              {C.disconnect}
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <Field label={C.hostLabel} hint={C.hostHint}>
            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="app.example.com" className="font-mono text-xs" />
          </Field>
          <Button size="sm" disabled={busy || host.trim().length < 4 || !data?.configured} onClick={connect}>
            {C.connect}
          </Button>
        </div>
      )}
      {failed ? <p className="text-xs text-rose-400">{failed}</p> : null}
    </div>
  );
}
