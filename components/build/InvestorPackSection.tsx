"use client";

import { useState } from "react";

import { type DraftMeta, DraftButton } from "@/components/build/DraftButton";
import { SimpleMarkdown } from "@/components/build/SimpleMarkdown";
import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { SelectField } from "@/components/ui/Select";
import { GRANT_PROGRAMS, grantProgram } from "@/content/grants";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { draftPackPrompt } from "@/lib/agent-prompts-draft";
import type { AgentWriteMode } from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";
import { type DeckSlide, type InvestorPack, mergeInvestorPack, packParts } from "@/lib/investor-pack";

/**
 * The investor and grant pack on Publish (M126, Studio+): three Draft
 * buttons (agent first, CanHav fallback), the parts rendered under them,
 * the markdown downloads and the print page. The pack stays on the draft.
 */
export function InvestorPackSection({ projectId, doc, patch, agentMode }: { projectId: string; doc: ProjectDoc; patch: (p: Partial<ProjectDoc>) => void; agentMode: AgentWriteMode }) {
  return (
    <PlusGate feature="investor_pack">
      <Inner projectId={projectId} doc={doc} patch={patch} agentMode={agentMode} />
    </PlusGate>
  );
}

function Inner({ projectId, doc, patch, agentMode }: { projectId: string; doc: ProjectDoc; patch: (p: Partial<ProjectDoc>) => void; agentMode: AgentWriteMode }) {
  const C = STUDIO_PLUS_COPY.pack;
  const [program, setProgram] = useState(GRANT_PROGRAMS[0].id);
  const pack = doc.investorPack;
  const parts = packParts(pack);
  const meta: DraftMeta = doc;
  const prompt = draftPackPrompt(doc.name, projectId);
  const set = (next: InvestorPack | undefined) => {
    if (next) patch({ investorPack: next });
    else {
      const { investorPack: _old, ...rest } = doc;
      patch({ ...rest, investorPack: undefined } as Partial<ProjectDoc>);
    }
  };
  const apply = (p: Parameters<typeof mergeInvestorPack>[1]) => set(mergeInvestorPack(pack, p));
  const remove = (part: "onepager" | "deck" | "grants") => {
    const { [part]: _gone, ...rest } = pack ?? {};
    const left = packParts(rest);
    set(left.length ? { ...rest, updatedAt: new Date().toISOString() } : undefined);
  };
  const file = (name: string) => `/api/export/project/${projectId}?file=${name}`;
  const prog = grantProgram(program) ?? GRANT_PROGRAMS[0];

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-500">{C.intro}</p>
      <p className="text-xs text-ink-400">
        {parts.length ? C.have(parts.map((p) => C.parts[p as keyof typeof C.parts]), new Date(pack?.updatedAt ?? Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })) : C.none}
      </p>

      <div className="flex flex-wrap items-start gap-3">
        <DraftButton<{ onepager: string }> projectId={projectId} kind="onepager" label={C.draftOnepager} doc={meta} patch={patch} agentMode={agentMode} gate={false} agentPrompt={prompt} onResult={(v) => apply({ onepager: v.onepager })} />
        <DraftButton<{ deck: DeckSlide[] }> projectId={projectId} kind="deck" label={C.draftDeck} doc={meta} patch={patch} agentMode={agentMode} gate={false} agentPrompt={prompt} onResult={(v) => apply({ deck: v.deck })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <SelectField label={C.programLabel} value={program} onChange={(v) => setProgram(v || GRANT_PROGRAMS[0].id)} options={GRANT_PROGRAMS.map((p) => ({ value: p.id, label: p.name }))} />
        <DraftButton<{ answers: Array<{ question: string; answer: string }> }>
          projectId={projectId}
          kind="grants"
          body={{ program }}
          label={C.draftGrants}
          doc={meta}
          patch={patch}
          agentMode={agentMode}
          gate={false}
          agentPrompt={prompt}
          onResult={(v) => apply({ grants: { [prog.id]: Object.fromEntries(v.answers.filter((a) => prog.questions.some((q) => q.id === a.question)).map((a) => [a.question, a.answer])) } })}
        />
      </div>

      {pack?.onepager ? (
        <Collapsible summary={C.parts.onepager}>
          <SimpleMarkdown text={pack.onepager} className="mt-2" />
          <Actions download={file("onepager")} onRemove={() => remove("onepager")} extra={{ href: `/studio/project/${projectId}/onepager`, label: C.print }} />
        </Collapsible>
      ) : null}
      {pack?.deck?.length ? (
        <Collapsible summary={`${C.parts.deck} · ${C.slides(pack.deck.length)}`}>
          <ol className="mt-2 space-y-3">
            {pack.deck.map((s, i) => (
              <li key={i} className="space-y-1">
                <p className="text-sm font-semibold text-ink-100">
                  {i + 1}. {s.title}
                </p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-300">
                  {s.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <Actions download={file("deck")} onRemove={() => remove("deck")} />
        </Collapsible>
      ) : null}
      {pack?.grants && Object.keys(pack.grants).length ? (
        <Collapsible summary={`${C.parts.grants} · ${Object.entries(pack.grants).map(([pid, a]) => C.answers(Object.keys(a).length, grantProgram(pid)?.name ?? pid)).join(", ")}`}>
          <div className="mt-2 space-y-4">
            {Object.entries(pack.grants).map(([pid, answers]) => {
              const p = grantProgram(pid);
              if (!p) return null;
              return (
                <div key={pid} className="space-y-2">
                  <p className="text-sm font-semibold text-ink-100">{p.name}</p>
                  {p.questions
                    .filter((q) => answers[q.id])
                    .map((q) => (
                      <div key={q.id}>
                        <p className="text-xs text-ink-400">
                          {q.label} · {C.words(q.words)}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-200">{answers[q.id]}</p>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
          <Actions download={file("grants")} onRemove={() => remove("grants")} />
        </Collapsible>
      ) : null}
    </div>
  );
}

function Actions({ download, onRemove, extra }: { download: string; onRemove: () => void; extra?: { href: string; label: string } }) {
  const C = STUDIO_PLUS_COPY.pack;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <a href={download}>{C.download}</a>
      </Button>
      {extra ? (
        <Button asChild size="sm" variant="outline">
          <a href={extra.href} target="_blank" rel="noreferrer">
            {extra.label}
          </a>
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" onClick={onRemove}>
        {C.remove}
      </Button>
    </div>
  );
}
