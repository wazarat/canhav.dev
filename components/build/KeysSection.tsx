"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";

import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { CopyBlock } from "@/components/ui/CopyBlock";
import { Field, Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { StatusChip } from "@/components/ui/StatusChip";
import { BUILD_COPY } from "@/content/build";
import type { KeyScope, ProjectKeyRow } from "@/lib/project-keys";

/**
 * Project keys on Deployments (M111): the rows with name, fingerprint,
 * scope, last use and Revoke, a Create form, and the new key shown once in
 * a copy block, the deployer key reveal pattern. PlusGate for a free
 * account.
 */
export function KeysSection({ projectId }: { projectId: string }) {
  return (
    <PlusGate feature="project_keys">
      <KeysInner projectId={projectId} />
    </PlusGate>
  );
}

function when(value: string | Date | null): string {
  const C = BUILD_COPY.keys;
  if (!value) return C.neverUsed;
  return C.lastUsed(new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
}

function KeysInner({ projectId }: { projectId: string }) {
  const C = BUILD_COPY.keys;
  const [keys, setKeys] = useState<ProjectKeyRow[] | null>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<KeyScope>("read");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/ideation/projects/${projectId}/keys`);
    if (!res.ok) {
      setFailed(C.failed);
      return;
    }
    setKeys(((await res.json()) as { keys: ProjectKeyRow[] }).keys);
  };
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const create = async () => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scope }),
      });
      const body = (await res.json()) as { key?: string; error?: string };
      if (!res.ok || !body.key) {
        setFailed(body.error ?? C.failed);
        return;
      }
      setFresh(body.key);
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (keyId: string) => {
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch(`/api/ideation/projects/${projectId}/keys/${keyId}`, { method: "DELETE" });
      if (!res.ok) setFailed(C.failed);
      setConfirm(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      {fresh ? (
        <div className="space-y-3">
          <StatusChip tone="warning" variant="block">
            {C.shownOnce}
          </StatusChip>
          <CopyBlock label={C.headerLabel} text={`Authorization: Bearer ${fresh}`} hint={C.headerHint} /> {/* copy-ok, an HTTP header */}
          <Button size="sm" variant="outline" onClick={() => setFresh(null)}>
            {C.saved}
          </Button>
        </div>
      ) : null}
      {keys === null ? null : keys.length === 0 ? (
        <p className="text-xs text-ink-500">{C.none}</p>
      ) : (
        <ul className="divide-y divide-ink-700/40 rounded-lg border border-ink-700/60">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-50">
                  {k.name} <span className="font-mono text-xs font-normal text-ink-400">{k.prefix}…</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{k.revoked_at ? C.revoked : when(k.last_used_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip tone={k.revoked_at ? "neutral" : k.scope === "write" ? "warning" : "info"}>
                  {k.scope === "write" ? C.write : C.read}
                </StatusChip>
                {k.revoked_at ? null : confirm === k.id ? (
                  <span className="flex items-center gap-2 text-xs text-ink-300">
                    <span>{C.revokeConfirm(k.name)}</span>
                    <Button size="sm" onClick={() => void revoke(k.id)} disabled={busy}>
                      {busy ? C.busy : C.yes}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>
                      {C.no}
                    </Button>
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(k.id)} disabled={busy}>
                    {C.revoke}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <Field label={C.nameLabel}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={C.namePlaceholder} maxLength={60} className="max-w-xs" />
        </Field>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-ink-200">{C.scopeLabel}</span>
          <div>
            <Segmented
              value={scope}
              onChange={setScope}
              ariaLabel={C.scopeLabel}
              options={[
                { value: "read", label: C.read },
                { value: "write", label: C.write },
              ]}
            />
          </div>
        </div>
        <Button size="sm" onClick={() => void create()} disabled={busy || !name.trim()}>
          <KeyRound aria-hidden className="h-3.5 w-3.5" /> {busy ? C.creating : C.create}
        </Button>
      </div>
      {failed ? <p className="text-xs text-rose-400">{failed}</p> : null}
      <p className="text-[11px] text-ink-500">{C.teamNote}</p>
    </div>
  );
}
