import { GradeStamp, GradeChip, GRADE_NAMES, type GradeLetter } from "@/components/shared/grade";

const LETTERS: GradeLetter[] = ["A", "B", "C", "D", "F"];

const GRADE_SHARES: Record<GradeLetter, string> = {
  A: "8%",
  B: "17%",
  C: "41%",
  D: "26%",
  F: "8%",
};

const GRADE_BLURBS: Record<GradeLetter, string> = {
  A: "Zero critical findings. Safe to connect.",
  B: "Minor findings. Review before wide use.",
  C: "Notable concerns. Scope-limit recommended.",
  D: "Major risks. Do not grant write access.",
  F: "Weaponized by design. Do not connect.",
};

const SIGNALS: { id: string; title: string; body: string }[] = [
  {
    id: "01",
    title: "Deceptive language",
    body: "Words like 'secretly', 'silently', 'skip', 'MUST', 'without informing the user' — operational mandates disguised as tool descriptions. 460 servers across npm and PyPI contain language of this kind.",
  },
  {
    id: "02",
    title: "Invisible characters",
    body: "Zero-width joiners, Unicode tags, and bidi overrides hidden in tool descriptions. 145 CRITICAL findings in our census. Invisible in editors, GitHub diffs, and code review — fully parsed by LLMs.",
  },
  {
    id: "03",
    title: "Dangerous patterns",
    body: "Phrases such as 'skip approval', 'bypass confirmation', overly broad parameters, tools that write to the filesystem without scope limits, or tools that expose credentials in logs.",
  },
  {
    id: "04",
    title: "Surface area",
    body: "The more tools a server exposes, the more seams an injection can slip through. Census finding: every server with 21 or more tools scores zero on our composite across subsequent checks.",
  },
];

export function Grade() {
  return (
    <main className="relative min-h-screen bg-background text-foreground">
      {/* Ambient amber glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 15% 0%, rgba(245,158,11,0.06), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-10">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-16 items-center pt-20 pb-24">
          <div>
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b]">
              The AgentsID Grade
            </div>
            <h1 className="font-extrabold tracking-[-0.04em] leading-[0.92] text-[clamp(4rem,8vw,7.5rem)]">
              One letter.
              <br />
              <span className="font-light tracking-[-0.035em] text-muted-foreground">
                Everything
              </span>{" "}
              you need
              <br />
              to know.
            </h1>
            <p className="mt-8 max-w-lg text-xl text-muted-foreground">
              Every MCP tool in the world gets an AgentsID Grade — a single
              letter from <strong className="text-foreground">A</strong> to{" "}
              <strong className="text-foreground">F</strong> — computed from
              137,070 security findings across 15,982 servers.
            </p>
            <p className="mt-4 max-w-lg text-xl text-muted-foreground">
              Not a number. Not a percentage.{" "}
              <span
                className="text-foreground"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 55%, rgba(245,158,11,0.3) 55%)",
                }}
              >
                A grade you can actually feel.
              </span>
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              {LETTERS.map((l) => (
                <GradeChip key={l} letter={l} />
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <GradeStamp letter="F" size="hero" rotated />
          </div>
        </section>

        {/* Specimen: the five grades */}
        <section className="border-t border-border py-16">
          <div className="mb-10 flex items-baseline justify-between">
            <h2 className="font-extrabold tracking-[-0.04em] text-[3.5rem] leading-[0.92]">
              The five grades.
            </h2>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              specimen sheet
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {LETTERS.map((letter) => (
              <div
                key={letter}
                className="flex flex-col items-center text-center p-6 rounded-lg bg-card border border-border"
                style={
                  letter === "F"
                    ? {
                        background: "rgba(239,68,68,0.06)",
                        borderColor: "#ef4444",
                      }
                    : undefined
                }
              >
                <GradeStamp letter={letter} size="xl" />
                <div
                  className="mt-4 text-2xl font-extrabold tracking-[-0.04em]"
                  style={{
                    color: {
                      A: "#10b981",
                      B: "#22c55e",
                      C: "#eab308",
                      D: "#f97316",
                      F: "#ef4444",
                    }[letter],
                  }}
                >
                  {GRADE_NAMES[letter]}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {GRADE_BLURBS[letter]}
                </p>
                <div className="mt-4 text-[11px] font-medium uppercase tracking-[0.2em] font-mono text-muted-foreground">
                  {GRADE_SHARES[letter]} of fleet
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why a letter */}
        <section className="border-t border-border py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-16">
            <div>
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b]">
                Design rationale
              </div>
              <h2 className="font-extrabold tracking-[-0.04em] text-[3.2rem] leading-[0.92]">
                Why a letter,
                <br />
                not a number.
              </h2>
            </div>
            <div className="space-y-10">
              <div>
                <div className="text-3xl font-extrabold tracking-[-0.04em] leading-[0.92] mb-2">
                  1 · Compression does the work.
                </div>
                <p className="text-lg text-muted-foreground">
                  "73" is a fact. "D" is a feeling. A grade tells you{" "}
                  <em className="text-foreground">what to do</em>, not what
                  happened. It compresses 30+ underlying signals into one
                  decision.
                </p>
              </div>
              <div>
                <div className="text-3xl font-extrabold tracking-[-0.04em] leading-[0.92] mb-2">
                  2 · Letters beat numbers for memory.
                </div>
                <p className="text-lg text-muted-foreground">
                  People remember their college GPA's letters, not the
                  percentages. FICO broke that rule and has been explaining
                  itself ever since.
                </p>
              </div>
              <div>
                <div className="text-3xl font-extrabold tracking-[-0.04em] leading-[0.92] mb-2">
                  3 · A grade is a judgment, not a measurement.
                </div>
                <p className="text-lg text-muted-foreground">
                  Uptime scores measure "is it up?" AgentsID judges "is it
                  honest?" A security grade is inherently editorial — uptime
                  can be rounded, malice can't.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it's computed */}
        <section className="border-t border-border py-20">
          <div className="mb-10 flex items-baseline justify-between">
            <h2 className="font-extrabold tracking-[-0.04em] text-[3.2rem] leading-[0.92]">
              How we grade.
            </h2>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              four signals · one letter
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {SIGNALS.map((sig) => (
              <div
                key={sig.id}
                className="p-6 rounded-lg bg-card border border-border"
              >
                <div className="text-4xl font-extrabold tracking-[-0.04em] leading-[0.92] mb-3 text-[#f59e0b]">
                  {sig.id}
                </div>
                <div className="text-xl font-extrabold tracking-[-0.04em] mb-2">
                  {sig.title}
                </div>
                <p className="text-sm text-muted-foreground">{sig.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-lg bg-card border border-[#f59e0b] p-8">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b] font-mono">
              the formula
            </div>
            <pre className="font-mono text-lg leading-relaxed whitespace-pre-wrap">
{`grade = `}
<span className="text-[#f59e0b]">f</span>{`(
  `}<span className="text-[#f59e0b]">deceptive_language_score</span>{`,
  `}<span className="text-[#f59e0b]">invisible_chars</span>{`,
  `}<span className="text-[#f59e0b]">dangerous_patterns</span>{`,
  `}<span className="text-[#f59e0b]">surface_area</span>{`,
  `}<span className="text-[#f59e0b]">context_weighting</span>{`
)`}
            </pre>
            <div className="mt-4 text-sm text-muted-foreground">
              Any single CRITICAL finding caps the grade at{" "}
              <strong className="text-foreground">D</strong>. Active deception
              caps at <strong className="text-[#ef4444]">F</strong>. The full
              methodology is open source at{" "}
              <a
                href="https://github.com/agentsid-dev/scanner"
                className="font-mono text-[#f59e0b] hover:underline"
              >
                github.com/agentsid-dev/scanner
              </a>
              .
            </div>
          </div>
        </section>

        {/* Closing */}
        <section className="border-t border-border py-24 text-center">
          <div className="mb-6 text-2xl font-light tracking-[-0.035em] text-muted-foreground">
            The point.
          </div>
          <h2
            className="mx-auto max-w-[900px] font-extrabold tracking-[-0.04em] leading-[0.92]"
            style={{ fontSize: "clamp(3rem, 6vw, 5.5rem)" }}
          >
            You shouldn't need to be a security researcher to know which MCP
            server is going to steal your data.
          </h2>
          <div className="mt-8 text-6xl font-extrabold tracking-[-0.04em] text-[#f59e0b]">
            One letter.
          </div>
        </section>
      </div>
    </main>
  );
}
