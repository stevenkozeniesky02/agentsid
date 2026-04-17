/**
 * /digest — MCP Security Digest subscribe page.
 * Same layout patterns as landing.tsx, grade.tsx, registry-v2.tsx.
 */
import { useState, useRef, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradeStamp, GRADE_COLORS } from "@/components/shared/grade";
import { HALL_STATS } from "./hall-of-mcps-data";

function FadeInSection({
  children,
  className = "",
  delay = 0,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const CORRELATION = [
  { tools: "1–5", servers: "14,259", pct: 1.8, color: GRADE_COLORS.A },
  { tools: "6–10", servers: "720", pct: 45.0, color: "#f59e0b" },
  { tools: "11–20", servers: "507", pct: 62.7, color: GRADE_COLORS.D },
  { tools: "21–50", servers: "382", pct: 83.2, color: GRADE_COLORS.F },
  { tools: "51+", servers: "115", pct: 94.8, color: GRADE_COLORS.F },
];

type Status = "idle" | "submitting" | "success" | "error";

function SubscribeForm({ id }: { id: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/digest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Failed" }));
        setErrorMsg(typeof body?.detail === "string" ? body.detail : "Failed");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg("Network error — try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30 px-5 py-4">
        <div className="flex items-center justify-center size-8 rounded-full bg-[#10b981]/20">
          <Check className="size-4" style={{ color: GRADE_COLORS.A }} />
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: GRADE_COLORS.A }}>
            You're in.
          </div>
          <div className="text-sm text-muted-foreground">
            First issue lands Monday morning.
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          id={id}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-md bg-card border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b] transition-colors"
        />
        <Button
          type="submit"
          disabled={status === "submitting"}
          className="px-6 font-semibold"
        >
          {status === "submitting" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </div>
      {errorMsg && (
        <div className="text-sm" style={{ color: GRADE_COLORS.F }}>
          {errorMsg}
        </div>
      )}
      <div className="text-xs text-muted-foreground">
        Free forever. Unsubscribe anytime. We don't sell your email.
      </div>
    </form>
  );
}

export function Digest() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(245,158,11,0.08), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1320px] px-6 md:px-10">
        {/* ─── HERO ─── */}
        <section className="pt-16 md:pt-24 pb-12">
          <FadeInSection>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-card border border-border">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#f59e0b", boxShadow: "0 0 8px #f59e0b" }}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Weekly · Every Monday
                </span>
              </div>
            </div>

            <h1
              className="font-extrabold tracking-[-0.04em] leading-[0.92]"
              style={{ fontSize: "clamp(2.8rem, 6vw, 5.5rem)" }}
            >
              The only weekly briefing<br />
              on what MCP tools are{" "}
              <span style={{ color: "#f59e0b" }}>actually doing.</span>
            </h1>

            <p className="mt-8 text-lg md:text-xl max-w-2xl text-muted-foreground">
              Every Monday. The worst tools we found, the grades that changed,
              and the one data pattern you should know about. Under 500 words.
              No fluff.
            </p>
          </FadeInSection>

          <FadeInSection delay={0.1} className="mt-10 max-w-lg">
            <SubscribeForm id="hero-subscribe" />
          </FadeInSection>

          {/* Stats strip */}
          <FadeInSection delay={0.15} className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-b border-border">
            <div className="py-5 border-r border-border pr-5">
              <div className="font-extrabold text-2xl md:text-3xl tabular-nums">
                {HALL_STATS.total.toLocaleString()}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                servers monitored
              </div>
            </div>
            <div className="py-5 md:border-r border-border pl-5 md:pr-5">
              <div
                className="font-extrabold text-2xl md:text-3xl tabular-nums"
                style={{ color: GRADE_COLORS.F }}
              >
                {HALL_STATS.fGrade.toLocaleString()}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                graded F
              </div>
            </div>
            <div className="py-5 border-t md:border-t-0 border-r border-border pr-5">
              <div className="font-extrabold text-2xl md:text-3xl tabular-nums">559</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                RCE paths found
              </div>
            </div>
            <div className="py-5 border-t md:border-t-0 border-border pl-5">
              <div className="font-extrabold text-2xl md:text-3xl tabular-nums">114</div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                hidden Unicode
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* ─── PREVIEW CARD ─── */}
        <section className="py-12 md:py-16 border-t border-border">
          <FadeInSection>
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-2 text-[#f59e0b]">
                  Preview · Issue #1
                </div>
                <h2
                  className="font-extrabold tracking-[-0.04em] leading-[0.92]"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
                >
                  Why tool count is the single best predictor.
                </h2>
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Apr 17, 2026
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.08}>
            <p className="text-lg text-muted-foreground max-w-3xl mb-8">
              Every server with 51+ tools scores F. Not most of them —{" "}
              <strong className="text-foreground">94.8% of them.</strong> The
              more tools a server exposes, the more seams an injection can slip
              through.
            </p>
          </FadeInSection>

          {/* Correlation table */}
          <FadeInSection delay={0.12}>
            <div className="rounded-lg bg-card border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                      Tools
                    </th>
                    <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                      Servers
                    </th>
                    <th className="text-left px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                      F-graded
                    </th>
                    <th className="px-5 py-3 w-[40%]"></th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {CORRELATION.map((row) => (
                    <tr
                      key={row.tools}
                      className="border-b border-border/50 last:border-b-0"
                    >
                      <td className="px-5 py-3">{row.tools}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {row.servers}
                      </td>
                      <td
                        className="px-5 py-3"
                        style={{
                          color: row.color,
                          fontWeight: row.pct > 80 ? 700 : 400,
                        }}
                      >
                        {row.pct}%
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-1.5 bg-secondary rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${row.pct}%`,
                              background: row.color,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeInSection>

          {/* Worst tools preview */}
          <FadeInSection delay={0.18} className="mt-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4 text-muted-foreground">
              Also in this issue
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-5 rounded-lg bg-card border border-border flex items-start gap-4">
                <GradeStamp letter="F" size="md" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    databricks-utils-mcp
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    3 tool descriptions instruct the LLM to bypass security
                    controls. Direct prompt injection → RCE path.
                  </div>
                  <div
                    className="font-mono text-[10px] mt-2"
                    style={{ color: GRADE_COLORS.F }}
                  >
                    5 CRITICAL · 47 HIGH
                  </div>
                </div>
              </div>
              <div className="p-5 rounded-lg bg-card border border-border flex items-start gap-4">
                <GradeStamp letter="F" size="md" />
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    linkedin-custom-mcp
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Hidden Unicode characters in tool descriptions. Invisible
                    in your editor. Fully parsed by the LLM.
                  </div>
                  <div
                    className="font-mono text-[10px] mt-2"
                    style={{ color: GRADE_COLORS.F }}
                  >
                    5 CRITICAL · 17 HIGH
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* ─── WHAT EACH ISSUE INCLUDES ─── */}
        <section className="py-12 md:py-16 border-t border-border">
          <FadeInSection>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 text-[#f59e0b]">
              What each issue includes
            </div>
            <h2
              className="font-extrabold tracking-[-0.04em] leading-[0.92] mb-10"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}
            >
              Three sections. Under 500 words.
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FadeInSection delay={0.05}>
              <div className="p-6 md:p-8 rounded-lg bg-card border border-border h-full">
                <GradeStamp letter="F" size="md" className="mb-5" />
                <div className="font-extrabold tracking-tight text-xl mb-2">
                  The worst tools this week
                </div>
                <p className="text-sm text-muted-foreground">
                  Real names, real findings, the offending text from their tool
                  descriptions. Not hypothetical — these are tools your agents
                  can install right now.
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.1}>
              <div className="p-6 md:p-8 rounded-lg bg-card border border-border h-full">
                <div
                  className="font-extrabold text-3xl mb-5"
                  style={{ color: "#f59e0b" }}
                >
                  ↕
                </div>
                <div className="font-extrabold tracking-tight text-xl mb-2">
                  Grade changes
                </div>
                <p className="text-sm text-muted-foreground">
                  Who improved, who got worse. If a tool you depend on drops
                  from C to F, you'll know before your agent does.
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.15}>
              <div className="p-6 md:p-8 rounded-lg bg-card border border-border h-full">
                <div
                  className="font-extrabold text-3xl mb-5"
                  style={{ color: GRADE_COLORS.A }}
                >
                  ⚡
                </div>
                <div className="font-extrabold tracking-tight text-xl mb-2">
                  One data pattern
                </div>
                <p className="text-sm text-muted-foreground">
                  Like: "94.8% of servers with 51+ tools score F." A single
                  insight you can cite in your next architecture review.
                </p>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section
          className="py-16 md:py-24 border-t border-border"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(245,158,11,0.06), transparent 70%)",
          }}
        >
          <FadeInSection>
            <div className="text-center max-w-xl mx-auto">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4 text-[#f59e0b]">
                Every Monday
              </div>
              <h2
                className="font-extrabold tracking-[-0.04em] leading-[0.92] mb-6"
                style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
              >
                Know what your tools<br />
                are doing before your<br />
                agents find out.
              </h2>
              <div className="max-w-md mx-auto">
                <SubscribeForm id="cta-subscribe" />
              </div>
              <div className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground tabular-nums">
                {HALL_STATS.total.toLocaleString()} servers monitored ·{" "}
                {HALL_STATS.totalFindings.toLocaleString()} findings · Published
                every Monday
              </div>
              <div className="mt-6">
                <Link
                  to="/registry"
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#f59e0b] hover:underline"
                >
                  browse the registry →
                </Link>
              </div>
            </div>
          </FadeInSection>
        </section>
      </div>
    </div>
  );
}
