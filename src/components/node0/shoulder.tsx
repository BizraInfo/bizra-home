"use client";

import * as React from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronUp,
  ExternalLink,
  Loader2,
  Lock,
  RotateCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Node0State, ShoulderSource, ShoulderState } from "./types";
import { api } from "./api";
import {
  FeedEmpty,
  fmtBytes,
  fmtDubai,
  HashChip,
  LawLine,
  Section,
  StatTile,
  StatusChip,
  type Tone,
} from "./shared";

/* ------------------------------------------------------------------ */
/* Truth labels — the honest SNR of the shoulder                        */
/* MEASURED → emerald · seed-scale / DESIGNED / ARITHMETIC / DECLARED   */
/* → amber (honest, not proven here) · NOT LIVE → red, the sealed door  */
/* ------------------------------------------------------------------ */

function labelTone(label: string): Tone {
  const l = label.toUpperCase();
  if (l.startsWith("NOT LIVE")) return "red";
  if (l.startsWith("MEASURED") && !l.includes("SEED")) return "emerald";
  return "amber";
}

const labelChip: Record<Tone, string> = {
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  red: "border-red-500/30 bg-red-500/10 text-red-400",
  zinc: "border-zinc-700 bg-zinc-800/40 text-zinc-400",
};

function MatrixLabel({ label }: { label: string }) {
  const tone = labelTone(label);
  return (
    <span
      title={`truth label: ${label}`}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 break-words rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
        labelChip[tone],
      )}
    >
      {tone === "emerald" ? (
        <Check className="size-3 shrink-0" aria-hidden="true" />
      ) : tone === "red" ? (
        <Lock className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 1 · The lineage — ROOT → SHOULDER → LIVE SYSTEM                      */
/* ------------------------------------------------------------------ */

interface LineageStage {
  id: string;
  kind: "root" | "shoulder" | "live";
  name: string;
  line: string;
  hash: { value: string | null; label: string };
}

const RAIL_CONNECTORS = [
  { glyph: "⊥", label: "stands on" },
  { glyph: "↑", label: "breaks ground above" },
] as const;

function LineageCard({ stage, badge }: { stage: LineageStage; badge: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col gap-2.5 rounded-lg border p-4 sm:p-5",
        stage.kind === "shoulder"
          ? "node0-glow border-amber-500/60 bg-amber-500/[0.06]"
          : stage.kind === "root"
            ? "border-zinc-700/80 bg-zinc-900/40"
            : "border-emerald-600/40 bg-zinc-900/30",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "font-mono text-sm font-semibold tracking-[0.18em]",
            stage.kind === "shoulder"
              ? "text-amber-300"
              : stage.kind === "live"
                ? "text-emerald-300"
                : "text-zinc-100",
          )}
        >
          {stage.name}
        </span>
        {badge}
      </div>
      <p className="break-words text-[11px] leading-relaxed text-zinc-400">{stage.line}</p>
      <HashChip
        value={stage.hash.value}
        label={stage.hash.label}
        head={12}
        tail={8}
        className="mt-auto w-full justify-start border-zinc-800 bg-zinc-950/60 py-1.5"
      />
    </div>
  );
}

function Lineage({ state, sh }: { state: Node0State; sh: ShoulderState }) {
  const stages: LineageStage[] = [
    {
      id: "root",
      kind: "root",
      name: "ROOT",
      line: `${state.constitution.files.length} sealed PDFs · immutable even by their author`,
      hash: { value: sh.stands_on, label: "root hash" },
    },
    {
      id: "shoulder",
      kind: "shoulder",
      name: "SHOULDER",
      line: `${sh.corpus} · ${
        sh.bytes != null ? sh.bytes.toLocaleString("en-US") : "—"
      } bytes · sealed once, receipt #${sh.receipt_seq ?? "—"}`,
      hash: { value: sh.sha256, label: "sha256" },
    },
    {
      id: "live",
      kind: "live",
      name: "LIVE SYSTEM",
      line: "the runtime that measures what the boards declare · the console you are reading",
      hash: { value: state.chain.head, label: "chain head" },
    },
  ];

  const badges: React.ReactNode[] = [
    <StatusChip key="root" status={state.constitution.verified ? "VERIFIED" : "DRIFT"} />,
    <span
      key="shoulder"
      className="inline-flex items-center gap-1.5 rounded-sm border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300"
    >
      <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
      sealed · #{sh.receipt_seq ?? "—"}
    </span>,
    <StatusChip key="live" status={state.runtime.status} />,
  ];

  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        The constitutional stacking · root → shoulder → live
      </div>

      {/* Desktop — horizontal rail */}
      <ol className="hidden items-stretch gap-2 lg:flex" aria-label="The constitutional stacking">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.id}>
            <li className="min-w-0 flex-1">
              <LineageCard stage={stage} badge={badges[i]} />
            </li>
            {i < stages.length - 1 ? (
              <li
                className="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5"
                aria-hidden="true"
              >
                <span className="font-mono text-lg leading-none text-amber-500/80">
                  {RAIL_CONNECTORS[i].glyph}
                </span>
                <span className="text-center font-mono text-[8px] uppercase leading-relaxed tracking-[0.16em] text-zinc-600">
                  {RAIL_CONNECTORS[i].label}
                </span>
              </li>
            ) : null}
          </React.Fragment>
        ))}
      </ol>

      {/* Mobile / tablet — vertical rail */}
      <ol className="flex flex-col gap-2 lg:hidden" aria-label="The constitutional stacking">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.id}>
            <li>
              <LineageCard stage={stage} badge={badges[i]} />
            </li>
            {i < stages.length - 1 ? (
              <li className="flex flex-col items-center gap-1" aria-hidden="true">
                <span className="font-mono text-base leading-none text-amber-500/80">
                  {RAIL_CONNECTORS[i].glyph}
                </span>
                <span className="text-center font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                  {RAIL_CONNECTORS[i].label}
                </span>
              </li>
            ) : null}
          </React.Fragment>
        ))}
      </ol>

      <LawLine>
        &ldquo;By respecting the root we honor the whole BIZRA — the root is never modified; the
        ground breaks above the shoulder.&rdquo;
      </LawLine>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 2 · The seal card + the observed sources                             */
/* ------------------------------------------------------------------ */

function SourceCard({ source }: { source: ShoulderSource }) {
  const isRoot = source.id === "R";
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
            isRoot
              ? "border-zinc-700 bg-zinc-800/40 text-zinc-400"
              : "border-amber-600/40 bg-amber-500/10 text-amber-300",
          )}
        >
          {source.id}
        </span>
        <span className="font-mono text-[10px] text-zinc-500" title="bytes measured at fetch">
          {source.bytes > 0 ? fmtBytes(source.bytes) : "local"}
        </span>
      </div>
      <div className="truncate text-xs leading-snug text-zinc-300" title={source.name}>
        {source.name}
      </div>
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-auto inline-flex min-w-0 items-center gap-1.5 font-mono text-[10px] text-zinc-500 transition-colors hover:text-amber-300"
          title={source.url}
        >
          <ExternalLink
            className="size-3 shrink-0 text-zinc-600 group-hover:text-amber-500"
            aria-hidden="true"
          />
          <span className="truncate">{source.url}</span>
          <span className="sr-only">opens the observed source in a new tab</span>
        </a>
      ) : (
        <span className="mt-auto font-mono text-[10px] text-zinc-600">no url · the local estate</span>
      )}
    </li>
  );
}

function SealBlock({ sh }: { sh: ShoulderState }) {
  const verifiedValue = sh.drift
    ? "DRIFTED"
    : sh.verified === true
      ? "VERIFIED"
      : sh.verified === false
        ? "MISMATCH"
        : "—";
  const verifiedTone: Tone = sh.drift ? "amber" : sh.verified === true ? "emerald" : "amber";
  const verifiedSub = sh.drift
    ? "honest amber — the root remains the only HALT boundary"
    : sh.verified === true
      ? "re-hash matches the sealed digest"
      : "no re-hash verdict recorded";

  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        The seal · one receipt, re-hashed on every read
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="seal"
          value={sh.sealed ? "SEALED" : "UNSEALED"}
          tone={sh.sealed ? "emerald" : "amber"}
          sub="sealed once — a second seal is refused"
        />
        <StatTile label="verify" value={verifiedValue} tone={verifiedTone} sub={verifiedSub} />
        <StatTile
          label="corpus"
          value={sh.bytes != null ? fmtBytes(sh.bytes) : "—"}
          tone="amber"
          sub={sh.bytes != null ? `${sh.bytes.toLocaleString("en-US")} bytes on disk` : "not measured"}
        />
        <StatTile
          label="receipt"
          value={sh.receipt_seq != null ? `#${sh.receipt_seq}` : "—"}
          tone="amber"
          sub={
            sh.receipt_digest ? (
              <HashChip value={sh.receipt_digest} label="digest" size="sm" head={8} tail={6} />
            ) : (
              "SHOULDER_SEALED"
            )
          }
        />
        <StatTile
          label="sealed at"
          value={<span className="text-[15px] leading-tight">{fmtDubai(sh.sealed_at)}</span>}
          tone="zinc"
          sub="GST · Asia/Dubai"
        />
        <StatTile
          label="sources"
          value={String(sh.sources.length)}
          tone="zinc"
          sub="observed · measured at fetch"
        />
      </div>
      <LawLine>&ldquo;{sh.law}&rdquo;</LawLine>
      <div className="flex flex-col gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          Observed · measured at fetch
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sh.sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </ul>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 3 · The reconciliation matrix                                        */
/* ------------------------------------------------------------------ */

function MatrixBlock({ sh }: { sh: ShoulderState }) {
  const counts = sh.matrix.reduce<Record<Tone, number>>(
    (acc, row) => {
      acc[labelTone(row.label)] += 1;
      return acc;
    },
    { emerald: 0, amber: 0, red: 0, zinc: 0 },
  );

  return (
    <>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        The reconciliation matrix · claimed vs measured — the honest SNR
      </div>
      <div className="node0-scroll overflow-x-auto rounded-lg border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="h-11 bg-zinc-900/60 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500/90">
                Claim
              </TableHead>
              <TableHead className="h-11 bg-zinc-900/60 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Declared in
              </TableHead>
              <TableHead className="h-11 bg-zinc-900/60 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Here
              </TableHead>
              <TableHead className="h-11 bg-zinc-900/60 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Truth label
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sh.matrix.map((row) => (
              <TableRow
                key={row.claim}
                className="border-zinc-800/70 align-top hover:bg-zinc-900/30"
              >
                <TableCell className="min-w-[12rem] py-3.5 pr-4 text-xs leading-relaxed break-words text-zinc-100">
                  {row.claim}
                </TableCell>
                <TableCell className="py-3.5 pr-4 font-mono text-[11px] leading-relaxed whitespace-nowrap text-amber-300/80">
                  {row.declared_in}
                </TableCell>
                <TableCell className="min-w-[16rem] py-3.5 pr-4 text-[11px] leading-relaxed break-words text-zinc-400">
                  {row.status_here}
                </TableCell>
                <TableCell className="min-w-[10rem] py-3.5">
                  <MatrixLabel label={row.label} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <LawLine>
        &ldquo;No claim above its evidence — what the boards declare, separated from what this
        runtime measures.&rdquo;
      </LawLine>
      <p className="font-mono text-[10px] leading-relaxed text-zinc-600">
        measured now: {sh.matrix.length} claims reconciled · {counts.emerald} MEASURED here ·{" "}
        {counts.amber} designed / declared (honest amber) · {counts.red} not live · sealed door
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 4+5 · The corpus reader + the doctrine index (parsed, not duplicated) */
/* ------------------------------------------------------------------ */

const DOCTRINE_HEADER = "## II · THE ABSORBED DOCTRINE";

function parseDoctrines(corpus: string): string[] {
  const start = corpus.indexOf(DOCTRINE_HEADER);
  if (start === -1) return [];
  const after = corpus.slice(start + DOCTRINE_HEADER.length);
  const nextSection = after.indexOf("\n## ");
  const section = nextSection === -1 ? after : after.slice(0, nextSection);
  return (section.match(/^###\s+.+$/gm) ?? []).map((line) =>
    line.replace(/^###\s+/, "").trim(),
  );
}

function DoctrineIndex({ corpus }: { corpus: string }) {
  const doctrines = React.useMemo(() => parseDoctrines(corpus), [corpus]);
  if (doctrines.length === 0) {
    return (
      <p className="font-mono text-[10px] text-zinc-600">
        no doctrine headers found in the sealed text — shown honestly, nothing is invented
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          The absorbed doctrine · parsed live from the sealed text
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-400">
          {doctrines.length} doctrines absorbed
        </div>
      </div>
      <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {doctrines.map((raw) => {
          const m = /^(\d+)\s*·\s*(.+)$/.exec(raw);
          const num = m ? m[1] : null;
          const text = m ? m[2] : raw;
          return (
            <li key={raw} className="flex min-w-0 items-baseline gap-2">
              {num ? (
                <span className="shrink-0 rounded-sm border border-zinc-800 bg-zinc-900/60 px-1 py-0.5 font-mono text-[9px] text-amber-500/80">
                  {num}
                </span>
              ) : null}
              <span className="break-words text-[11px] leading-snug text-zinc-400">{text}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CorpusReader({ shoulder }: { shoulder: ShoulderState }) {
  const [open, setOpen] = React.useState(false);
  const [corpus, setCorpus] = React.useState<string | null>(null);
  const [corpusSha, setCorpusSha] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const shaMatches =
    corpusSha != null && shoulder.sealed_sha256 != null && corpusSha === shoulder.sealed_sha256;

  const load = React.useCallback(async () => {
    if (busy || corpus) return;
    setBusy(true);
    setFailed(false);
    const { httpOk, data } = await api.fetchShoulder();
    if (httpOk && data && data.ok === true && typeof data.corpus === "string" && data.corpus.length > 0) {
      setCorpus(data.corpus);
      setCorpusSha(typeof data.corpus_sha256 === "string" ? data.corpus_sha256 : null);
    } else {
      setFailed(true);
      toast.error("CORPUS UNREACHABLE", {
        description:
          "The seal stands, the text is not fabricated — nothing is shown the runtime did not serve.",
      });
    }
    setBusy(false);
  }, [busy, corpus]);

  const onToggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (!corpus && !busy && !failed) void load();
  };

  const fetching = busy && !corpus;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5">
      {/* reader header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <BookOpen className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span className="break-words font-mono text-xs text-zinc-200">{shoulder.corpus}</span>
          {corpusSha ? (
            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
              <HashChip value={corpusSha} label="sha256" size="sm" head={10} tail={6} />
              {shaMatches ? (
                <span
                  title="the served corpus re-hashes to the sealed digest"
                  className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-400"
                >
                  <Check className="size-3" aria-hidden="true" /> match
                </span>
              ) : (
                <span
                  title="the served corpus does NOT match the sealed digest — shown honestly"
                  className="inline-flex items-center gap-1 rounded-sm border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-red-400"
                >
                  <AlertTriangle className="size-3" aria-hidden="true" /> mismatch
                </span>
              )}
            </span>
          ) : null}
        </div>
        <Button
          onClick={onToggle}
          disabled={fetching}
          className={cn(
            "h-11 w-full font-mono text-[11px] uppercase tracking-[0.14em] sm:w-auto",
            open
              ? "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              : "bg-amber-500 font-semibold text-amber-950 hover:bg-amber-400",
          )}
        >
          {fetching ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : open ? (
            <ChevronUp aria-hidden="true" />
          ) : (
            <BookOpen aria-hidden="true" />
          )}
          {fetching ? "FETCHING THE CORPUS…" : open ? "COLLAPSE THE CORPUS" : "READ THE SEALED CORPUS"}
        </Button>
      </div>

      {/* honest loading / failure notes — the preview stays visible beneath */}
      {open && !corpus && busy ? (
        <div
          role="status"
          className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950/70 p-4 font-mono text-[11px] text-zinc-400"
        >
          <Loader2 className="size-4 animate-spin text-amber-400" aria-hidden="true" />
          fetching the sealed corpus from the runtime…
        </div>
      ) : null}
      {open && !corpus && failed ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/[0.04] p-4"
        >
          <p className="text-sm leading-relaxed text-amber-200/90">
            Corpus unreachable — the seal stands, the text is not fabricated. The preview below is
            what the runtime last served; nothing beyond it is invented.
          </p>
          <Button
            onClick={() => void load()}
            variant="outline"
            className="h-11 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
          >
            <RotateCw aria-hidden="true" />
            RETRY
          </Button>
        </div>
      ) : null}

      {open && corpus ? (
        <>
          <pre
            aria-label="THE_SHOULDER.md — the full sealed text"
            className="node0-scroll max-h-[28rem] overflow-y-auto rounded-md border border-zinc-800/70 bg-zinc-950/70 p-4 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-zinc-300"
          >
            {corpus}
          </pre>
          <p className="font-mono text-[10px] leading-relaxed text-zinc-600">
            full sealed text · {corpus.length.toLocaleString("en-US")} characters served live ·
            re-hash {shaMatches ? "matches" : "does not match"} the seal
          </p>
          <DoctrineIndex corpus={corpus} />
        </>
      ) : (
        <>
          <pre
            aria-label="THE_SHOULDER.md — sealed preview"
            className="node0-scroll max-h-64 overflow-y-auto rounded-md border border-zinc-800/70 bg-zinc-950/70 p-4 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap text-zinc-300"
          >
            {shoulder.preview ?? "—"}
          </pre>
          <p className="font-mono text-[10px] leading-relaxed text-zinc-600">
            preview · first {(shoulder.preview?.length ?? 0).toLocaleString("en-US")} characters —
            the absorbed-doctrine index appears when the sealed corpus is opened
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The section                                                          */
/* ------------------------------------------------------------------ */

export function Shoulder({ state }: { state: Node0State }) {
  const sh = state.shoulder;

  if (!sh) {
    return (
      <Section
        id="shoulder"
        kicker="I½ · The Shoulder"
        title="THE SHOULDER"
        description="The absorbed wisdom of three years — observed, merged, verified, sealed above the root."
      >
        <FeedEmpty>this runtime reports no shoulder — nothing is invented here</FeedEmpty>
      </Section>
    );
  }

  return (
    <Section
      id="shoulder"
      kicker="I½ · The Shoulder"
      title="THE SHOULDER"
      description="The absorbed wisdom of three years — observed, merged, verified, sealed above the root. The lineage reads ROOT → SHOULDER → LIVE SYSTEM: what the boards declared, reconciled against what this runtime actually measures."
    >
      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-4">
          <Lineage state={state} sh={sh} />
        </div>
        <div className="flex flex-col gap-4">
          <SealBlock sh={sh} />
        </div>
        <div className="flex flex-col gap-4">
          <MatrixBlock sh={sh} />
        </div>
        <CorpusReader shoulder={sh} />
      </div>
    </Section>
  );
}
