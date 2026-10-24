"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";

import { CopyBlock } from "@/components/ui/CopyBlock";
import { BUILD_COPY } from "@/content/build";
import type { CheckRunView } from "@/lib/checks/schema";
import type { ProjectDoc } from "@/lib/ideation";
import type { ProjectKeyRow } from "@/lib/project-keys";
import { workflowPath } from "@/lib/workflows/fill";

const SECRET = "CANHAV_PROJECT_KEY";

/**
 * Guided GitHub setup on Deployments (M144, Studio+): four plain text
 * steps. A write key (counted from the project's keys), the two workflow
 * downloads with the project's chain id and this deployment's address
 * filled in, the one repository secret, and the status of the last sync
 * and the newest check run with a Check again link.
 */
export function GithubSetupCard({ projectId, doc, checks }: { projectId: string; doc: ProjectDoc; checks: CheckRunView[] }) {
  const C = BUILD_COPY.deployments.setup;
  const D = BUILD_COPY.deployments.sync;
  const K = BUILD_COPY.checks;
  const router = useRouter();
  // null while loading, "unknown" when the keys could not be read, else the count of live write keys.
  const [writeKeys, setWriteKeys] = useState<number | null | "unknown">(null);

  useEffect(() => {
    let live = true;
    void fetch(`/api/ideation/projects/${projectId}/keys`)
      .then(async (res) => {
        if (!res.ok) {
          if (live) setWriteKeys("unknown");
          return;
        }
        const body = (await res.json()) as { keys: ProjectKeyRow[] };
        if (live) setWriteKeys(body.keys.filter((k) => k.scope === "write" && !k.revoked_at).length);
      })
      .catch(() => {
        if (live) setWriteKeys("unknown");
      });
    return () => {
      live = false;
    };
  }, [projectId]);

  const file = (name: "sync" | "checks") => `/api/ideation/projects/${projectId}/workflows/${name}`;
  const sync = doc.githubSync;
  const run = checks[0] ?? null;
  const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-ink-400">{C.intro}</p>
      <ol className="space-y-4 text-sm text-ink-200">
        <li className="space-y-1">
          <p className="font-medium text-ink-50">{C.step1}</p>
          <p className="text-xs text-ink-400">
            {writeKeys === null ? C.keysUnknown : writeKeys === "unknown" ? C.keysHint : writeKeys ? C.keyCount(writeKeys) : C.noKey}{" "}
            <a href="#project-keys" className="text-ink-200 hover:underline">
              {C.keysLink}
            </a>
          </p>
        </li>
        <li className="space-y-1.5">
          <p className="font-medium text-ink-50">{C.step2}</p>
          <p className="text-xs text-ink-400">{C.downloadHint}</p>
          <ul className="space-y-1 text-xs">
            {(["sync", "checks"] as const).map((name) => (
              <li key={name} className="flex flex-wrap items-center gap-2">
                <a href={file(name)} className="inline-flex items-center gap-1 text-ink-200 hover:underline">
                  <Download aria-hidden className="h-3 w-3" /> {C.download[name]}
                </a>
                <span className="font-mono text-ink-500">{workflowPath(name)}</span>
              </li>
            ))}
          </ul>
        </li>
        <li className="space-y-1.5">
          <p className="font-medium text-ink-50">{C.step3}</p>
          <CopyBlock label={C.secretLabel} text={SECRET} hint={C.secretHint} />
          {doc.githubRepo ? (
            <a href={`https://github.com/${doc.githubRepo}/settings/secrets/actions`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-ink-200 hover:underline">
              {C.openSecrets} <ExternalLink aria-hidden className="h-3 w-3" />
            </a>
          ) : null}
        </li>
        <li className="space-y-1">
          <p className="font-medium text-ink-50">{C.step4}</p>
          {sync ? (
            <p className="text-xs text-ink-400">
              {D.line(sync.sha.slice(0, 7), date(sync.at), sync.contracts, sync.steps)}
              {sync.outcome === "proposed" ? ` ${D.proposed}` : ""}{" "}
              <a href={sync.url} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
                {D.open}
              </a>
            </p>
          ) : null}
          {run ? (
            <p className="text-xs text-ink-400">
              {K.run(K.tools[run.tool], K.results[run.result], date(run.createdAt))}{" "}
              {run.runUrl ? (
                <a href={run.runUrl} target="_blank" rel="noreferrer" className="text-ink-200 hover:underline">
                  {K.open}
                </a>
              ) : null}
            </p>
          ) : null}
          {!sync && !run ? <p className="text-xs text-ink-400">{C.noRun}</p> : null}
          <button type="button" onClick={() => router.refresh()} className="text-xs text-ink-200 hover:underline">
            {C.checkAgain}
          </button>
        </li>
      </ol>
    </div>
  );
}
