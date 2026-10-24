"use client";

import { type DraftMeta, DraftControl } from "@/components/build/DraftControl";
import { SimpleMarkdown } from "@/components/build/SimpleMarkdown";
import { PlusGate } from "@/components/studio/PlusGate";
import { Button } from "@/components/ui/Button";
import { Collapsible } from "@/components/ui/Collapsible";
import { grantProgram } from "@/content/grants";
import { STUDIO_PLUS_COPY } from "@/content/studio-plus";
import { draftPackPrompt } from "@/lib/agent-prompts-draft";
import type { AgentWriteMode } from "@/lib/agent-writes";
import type { ProjectDoc } from "@/lib/ideation";
import { type InvestorPack, type PackFileKind, PACK_FILE_KINDS, mergeInvestorPack, packParts } from "@/lib/investor-pack";
import { type PackPromptInput, packPrompt } from "@/lib/pack-prompt";

/**
 * The investor pack on Business model (M126, moved there in M143, a prompt
 * since M159, Studio+): the one pager and the deck are built outside
 * CanHav by the team's agent or any AI. Each part has one control with
 * two ways, Draft with your agent (a request on the project, as before)
 * and Copy the prompt (the whole record and the brand kit, its length on
 * the item). The record keeps where each built file lives. Text written
 * before M159 and the earlier grant answers stay readable until removed.
 */
export function InvestorPackSection({ projectId, doc, patch, agentMode, token }: { projectId: string; doc: ProjectDoc; patch: (p: Partial<ProjectDoc>) => void; agentMode: AgentWriteMode; token?: PackPromptInput["token"] }) {
  return (
    <PlusGate feature="investor_pack">
      <Inner projectId={projectId} doc={doc} patch={patch} agentMode={agentMode} token={token} />
    </PlusGate>
  );
}

function Inner({ projectId, doc, patch, agentMode, token }: { projectId: string; doc: ProjectDoc; patch: (p: Partial<ProjectDoc>) => void; agentMode: AgentWriteMode; token?: PackPromptInput["token"] }) {
  const C = STUDIO_PLUS_COPY.pack;
  const pack = doc.investorPack;
  const parts = packParts(pack);
  const meta: DraftMeta = doc;
  const agentPrompt = draftPackPrompt(doc.name, projectId);
  const prompts = Object.fromEntries(PACK_FILE_KINDS.map((k) => [k, packPrompt(k, { doc, projectId, token: token ?? null })])) as Record<PackFileKind, string>;
  const set = (next: InvestorPack | undefined) => {
    if (next) patch({ investorPack: next });
    else {
      const { investorPack: _old, ...rest } = doc;
      patch({ ...rest, investorPack: undefined } as Partial<ProjectDoc>);
    }
  };
  const remove = (part: "onepager" | "deck" | "grants") => {
    const { [part]: _gone, ...rest } = pack ?? {};
    set(packParts(rest).length ? { ...rest, updatedAt: new Date().toISOString() } : undefined);
  };
  const forgetFile = (kind: PackFileKind) => set(packParts(mergeInvestorPack(pack, { files: { [kind]: null } })).length ? mergeInvestorPack(pack, { files: { [kind]: null } }) : undefined);
  const file = (name: string) => `/api/export/project/${projectId}?file=${name}`;
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const partLabel = (p: string) => C.parts[p as keyof typeof C.parts] ?? p;

  const fileLine = (kind: PackFileKind) => {
    const where = pack?.files?.[kind];
    if (!where) return null;
    const mark = doc.drafted?.[kind];
    const shown = /^https?:\/\//i.test(where) ? (
      <a href={where} target="_blank" rel="noreferrer" className="text-ink-100 hover:underline">
        {where}
      </a>
    ) : (
      <span className="font-mono text-ink-100">{where}</span>
    );
    return (
      <p className="text-xs text-ink-400">
        {mark?.by === "agent" ? C.builtAt(day(mark.at), "") : C.recordedAt("")}
        {shown}{" "}
        <button type="button" onClick={() => forgetFile(kind)} className="text-ink-400 transition-colors hover:text-ink-50 hover:underline">
          {C.removeFile}
        </button>
      </p>
    );
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-ink-500">{C.intro}</p>
      <p className="text-xs text-ink-400">{parts.length ? C.have(parts.map(partLabel), day(pack?.updatedAt ?? new Date().toISOString())) : C.none}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {PACK_FILE_KINDS.map((kind) => (
          <div key={kind} className="space-y-2">
            <DraftControl<never>
              projectId={projectId}
              kind={kind}
              label={kind === "onepager" ? C.draftOnepager : C.draftDeck}
              doc={meta}
              patch={patch}
              agentMode={agentMode}
              gate={false}
              serverDraft={false}
              agentPrompt={prompts[kind]}
              copyLabel={C.copyPrompt(prompts[kind].length)}
              copyHint={C.copyPromptHint}
              onResult={() => {}}
            />
            {fileLine(kind)}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-ink-500">{agentPrompt.split("\n")[0]}</p>

      {pack?.onepager ? (
        <Collapsible summary={`${C.parts.onepager} · ${C.earlier}`}>
          <SimpleMarkdown text={pack.onepager} className="mt-2" />
          <Actions download={file("onepager")} onRemove={() => remove("onepager")} extra={{ href: `/studio/project/${projectId}/onepager`, label: C.print }} />
        </Collapsible>
      ) : null}
      {pack?.deck?.length ? (
        <Collapsible summary={`${C.parts.deck} · ${C.slides(pack.deck.length)} · ${C.earlier}`}>
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
        <Collapsible summary={C.earlierGrants}>
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
          <Actions onRemove={() => remove("grants")} />
        </Collapsible>
      ) : null}
    </div>
  );
}

function Actions({ download, onRemove, extra }: { download?: string; onRemove: () => void; extra?: { href: string; label: string } }) {
  const C = STUDIO_PLUS_COPY.pack;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {download ? (
        <Button asChild size="sm" variant="outline">
          <a href={download}>{C.download}</a>
        </Button>
      ) : null}
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
