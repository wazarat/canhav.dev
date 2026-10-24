"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Segmented } from "@/components/ui/Segmented";
import { Select, optionClasses } from "@/components/ui/Select";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import type { Icp } from "@/lib/icp";
import { PROSPECT_LIMITS, type Prospect, type ProspectInput, contactHrefs, linkedinHandle, today, xHandle } from "@/lib/prospects";

type Draft = Omit<ProspectInput, "contacted"> & { contacted: boolean };

const blank = (): Draft => ({ name: "", email: "", linkedin: "", x: "", contacted: false, contactedOn: undefined, profile: undefined });

/**
 * The people to contact (M158, F14): a compact table of real people who
 * fit a profile, with their contact links, whether they were contacted and
 * when, and the profile they fit. Rows live in their own table and come
 * through the project's prospects route; nothing here touches the draft
 * document, so they never publish, export or reach a drafting model.
 */
export function ProspectsTable({ projectId, profiles }: { projectId: string; profiles: Icp[] | undefined }) {
  const C = STUDIO_PLUS_COPY.prospects;
  const [rows, setRows] = useState<Prospect[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(blank());
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/ideation/projects/${projectId}/prospects`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { prospects: Prospect[] }) => live && setRows(d.prospects))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [projectId]);

  const profileName = (i: number) => profiles?.[i]?.name?.trim() || STUDIO_PLUS_COPY.icp.profile(i + 1);
  const start = (p?: Prospect) => {
    setFailed(null);
    setEditing(p ? p.id : "new");
    setDraft(p ? { id: p.id, name: p.name, email: p.email ?? "", linkedin: p.linkedin ?? "", x: p.x ?? "", contacted: p.contacted, contactedOn: p.contactedOn, profile: p.profile } : blank());
  };
  const save = async () => {
    setWorking(true);
    setFailed(null);
    try {
      const body = { rows: [{ ...draft, email: draft.email || undefined, linkedin: draft.linkedin || undefined, x: draft.x || undefined, contactedOn: draft.contacted ? draft.contactedOn : undefined }] };
      const res = await fetch(`/api/ideation/projects/${projectId}/prospects`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as { prospects?: Prospect[]; error?: string };
      if (!res.ok || !json.prospects) {
        setFailed(json.error ?? C.failed);
        return;
      }
      setRows(json.prospects);
      setEditing(null);
    } catch {
      setFailed(C.failed);
    } finally {
      setWorking(false);
    }
  };
  const remove = async (id: string) => {
    const res = await fetch(`/api/ideation/projects/${projectId}/prospects/${id}`, { method: "DELETE" });
    if (res.ok) setRows((r) => (r ?? []).filter((p) => p.id !== id));
  };

  const list = rows ?? [];
  const full = list.length >= PROSPECT_LIMITS.rows;
  const form = (
    <tr className="align-top">
      <td className="px-3 py-2">
        <Input value={draft.name} maxLength={PROSPECT_LIMITS.name.max} placeholder={C.placeholders.name} aria-label={C.columns.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="h-8 min-w-[9rem] text-xs" />
      </td>
      <td className="space-y-1.5 px-3 py-2">
        <Input value={draft.email ?? ""} maxLength={PROSPECT_LIMITS.contact.max} placeholder={C.placeholders.email} aria-label={C.placeholders.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="h-8 min-w-[12rem] text-xs" />
        <Input value={draft.linkedin ?? ""} maxLength={PROSPECT_LIMITS.contact.max} placeholder={C.placeholders.linkedin} aria-label={C.placeholders.linkedin} onChange={(e) => setDraft({ ...draft, linkedin: e.target.value })} className="h-8 min-w-[12rem] text-xs" />
        <Input value={draft.x ?? ""} maxLength={PROSPECT_LIMITS.contact.max} placeholder={C.placeholders.x} aria-label={C.placeholders.x} onChange={(e) => setDraft({ ...draft, x: e.target.value })} className="h-8 min-w-[12rem] text-xs" />
      </td>
      <td className="px-3 py-2">
        <Segmented<"yes" | "no">
          size="sm"
          ariaLabel={C.columns.contacted}
          value={draft.contacted ? "yes" : "no"}
          onChange={(v) => setDraft({ ...draft, contacted: v === "yes", contactedOn: v === "yes" ? (draft.contactedOn ?? today()) : undefined })}
          options={[
            { value: "yes", label: C.yes },
            { value: "no", label: C.no },
          ]}
        />
      </td>
      <td className="px-3 py-2">
        {draft.contacted ? <Input type="date" value={draft.contactedOn ?? today()} aria-label={C.columns.date} onChange={(e) => setDraft({ ...draft, contactedOn: e.target.value })} className="h-8 text-xs" /> : null}
      </td>
      <td className="px-3 py-2">
        <Select value={draft.profile === undefined ? "" : String(draft.profile)} aria-label={C.columns.profile} onChange={(e) => setDraft({ ...draft, profile: e.target.value === "" ? undefined : (Number(e.target.value) as 0 | 1) })} className="h-8 min-w-[9rem] text-xs">
          <option value="" className={optionClasses}>
            {C.noProfile}
          </option>
          {(profiles ?? []).map((_, i) => (
            <option key={i} value={String(i)} className={optionClasses}>
              {profileName(i)}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" disabled={working || draft.name.trim().length < PROSPECT_LIMITS.name.min} onClick={() => void save()}>
            {C.save}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
            {C.cancel}
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      <p className="text-xs text-ink-400">{C.count(list.length, list.filter((p) => p.contacted).length)}</p>
      {rows === null ? null : list.length === 0 && editing !== "new" ? (
        <p className="text-xs text-ink-500">{C.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink-700/60">
          <table className="w-full text-left text-xs">
            <thead className="text-ink-500">
              <tr>
                <th className="px-3 py-2 font-medium">{C.columns.name}</th>
                <th className="px-3 py-2 font-medium">{C.columns.contact}</th>
                <th className="px-3 py-2 font-medium">{C.columns.contacted}</th>
                <th className="px-3 py-2 font-medium">{C.columns.date}</th>
                <th className="px-3 py-2 font-medium">{C.columns.profile}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/40 text-ink-200">
              {list.map((p) =>
                editing === p.id ? (
                  <FormRow key={p.id}>{form}</FormRow>
                ) : (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-ink-100">{p.name}</td>
                    <td className="px-3 py-2">
                      <ContactCell p={p} />
                    </td>
                    <td className="px-3 py-2">{p.contacted ? C.yes : C.no}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-400">{p.contactedOn ?? ""}</td>
                    <td className="px-3 py-2 text-ink-400">{p.profile === undefined ? "" : profileName(p.profile)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => start(p)} className="text-ink-300 transition-colors hover:text-ink-50 hover:underline">
                          {C.edit}
                        </button>
                        <button type="button" onClick={() => void remove(p.id)} className="text-ink-400 transition-colors hover:text-rose-400 hover:underline">
                          {C.remove}
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {editing === "new" ? <FormRow>{form}</FormRow> : null}
            </tbody>
          </table>
        </div>
      )}
      {failed ? <p className="text-xs text-rose-400">{failed}</p> : null}
      {editing === null ? (
        <Button size="sm" variant="outline" disabled={full || rows === null} onClick={() => start()}>
          {C.add}
        </Button>
      ) : null}
      {full ? <p className="text-xs text-ink-500">{C.limit(PROSPECT_LIMITS.rows)}</p> : null}
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ContactCell({ p }: { p: Prospect }) {
  const h = contactHrefs(p);
  const parts: Array<{ href: string; label: string }> = [];
  if (h.email && p.email) parts.push({ href: h.email, label: p.email });
  if (h.linkedin && p.linkedin) parts.push({ href: h.linkedin, label: `LinkedIn ${linkedinHandle(p.linkedin) ?? ""}`.trim() });
  if (h.x && p.x) parts.push({ href: h.x, label: `@${xHandle(p.x) ?? p.x}` });
  if (!parts.length) return <span className="text-ink-500">{""}</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {parts.map((x) => (
        <a key={x.href} href={x.href} target="_blank" rel="noreferrer" className="text-ink-100 hover:underline">
          {x.label}
        </a>
      ))}
    </span>
  );
}
