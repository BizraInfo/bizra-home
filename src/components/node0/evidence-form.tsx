"use client";

import * as React from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Section } from "./shared";

export interface TraceSubmitInput {
  source: string;
  kind: string;
  payload: string;
  correlation: string;
}

export function EvidenceForm({
  onSubmit,
  busy,
}: {
  onSubmit: (input: TraceSubmitInput) => void;
  busy: boolean;
}) {
  const [source, setSource] = React.useState("operator");
  const [kind, setKind] = React.useState("observation");
  const [correlation, setCorrelation] = React.useState("");
  const [payload, setPayload] = React.useState("");
  const payloadRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload.trim()) {
      payloadRef.current?.focus();
      return;
    }
    onSubmit({
      source,
      kind,
      payload: payload.trim(),
      correlation: correlation.trim().toUpperCase(),
    });
  };

  return (
    <Section
      id="submit"
      kicker="VII · Operator"
      title="Evidence submission"
      description="Submit evidence through the admissibility gate. The gate decides — scope, completeness, correlation — and its verdict, admit or refuse, is recorded on the chain."
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 sm:p-6"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="trace-source" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Source
            </Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="trace-source" className="h-11 border-zinc-700 bg-zinc-950/60 font-mono text-sm text-zinc-200">
                <SelectValue placeholder="source" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950">
                <SelectItem value="operator" className="font-mono text-zinc-200 focus:bg-zinc-800">
                  operator
                </SelectItem>
                <SelectItem value="browser" className="font-mono text-zinc-200 focus:bg-zinc-800">
                  browser
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="trace-kind" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Kind
            </Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="trace-kind" className="h-11 border-zinc-700 bg-zinc-950/60 font-mono text-sm text-zinc-200">
                <SelectValue placeholder="kind" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950">
                <SelectItem value="observation" className="font-mono text-zinc-200 focus:bg-zinc-800">
                  observation
                </SelectItem>
                <SelectItem value="signal" className="font-mono text-zinc-200 focus:bg-zinc-800">
                  signal
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="trace-correlation" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Correlation <span className="text-zinc-600">(optional)</span>
            </Label>
            <Input
              id="trace-correlation"
              value={correlation}
              onChange={(e) => setCorrelation(e.target.value)}
              placeholder="OBS-5"
              className="h-11 border-zinc-700 bg-zinc-950/60 font-mono text-sm text-zinc-200 placeholder:text-zinc-700"
              autoComplete="off"
            />
            <p className="text-[10px] leading-relaxed text-zinc-600">
              Namespaced identifier — A–Z, 0–9, dot, underscore, dash. Free text is refused.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="trace-payload" className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
              Payload
            </Label>
            <Textarea
              id="trace-payload"
              ref={payloadRef}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder="What did you observe? Evidence, not conclusions — the gate and SAT will judge."
              rows={4}
              className="min-h-28 border-zinc-700 bg-zinc-950/60 font-mono text-sm text-zinc-200 placeholder:text-zinc-700"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md font-mono text-[10px] leading-relaxed text-zinc-600">
            External traces cannot claim to be &ldquo;runtime&rdquo; — provenance forgery is
            refused and recorded.
          </p>
          <Button
            type="submit"
            disabled={busy}
            className="h-11 border border-amber-400/40 bg-amber-500 font-semibold tracking-wide text-amber-950 hover:bg-amber-400"
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            SUBMIT EVIDENCE
          </Button>
        </div>
      </form>
    </Section>
  );
}
