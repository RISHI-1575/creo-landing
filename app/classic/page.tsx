import type { Metadata } from "next";
import Link from "next/link";
import { Cormorant_Garamond, JetBrains_Mono, Pinyon_Script, Tiro_Devanagari_Hindi } from "next/font/google";
import WorldStage from "@/components/world-stage";
const COPYRIGHT = `© ${new Date().getFullYear()} SiferTech`;
import "../world.css";

const script = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--w-script", display: "swap" });
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "500"], variable: "--w-serif", display: "swap" });
const deva = Tiro_Devanagari_Hindi({ subsets: ["devanagari", "latin"], weight: "400", variable: "--w-deva", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: "400", variable: "--w-mono", display: "swap" });

export const metadata: Metadata = {
  title: "CREO — Your AI marketing team, in every language India speaks",
  description:
    "Meet CREO: a brand, strategy, design, publishing, market research and analytics team for Indian businesses. On-brand, editable posts in 11 languages that never go live until you say yes.",
  alternates: { canonical: "/classic" },
};

// Seven acts, one colour world each (the director in world-stage.tsx reads data-act order).
// Beat timing: data-in / data-out are local act progress (0..1). Position classes place the beat.
const LANGS: [string, string, string][] = [
  ["hi", "नमस्ते", "Hindi"], ["bn", "নমস্কার", "Bengali"], ["ta", "வணக்கம்", "Tamil"],
  ["te", "నమస్కారం", "Telugu"], ["mr", "नमस्कार", "Marathi"], ["gu", "નમસ્તે", "Gujarati"],
  ["kn", "ನಮಸ್ಕಾರ", "Kannada"], ["ml", "നമസ്കാരം", "Malayalam"], ["pa", "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "Punjabi"],
  ["or", "ନମସ୍କାର", "Odia"], ["en", "Hello", "English"],
];

// After the film the page scrolls like a normal site: how it works, questions, one last ask.
const STEPS = [
  ["Tell", "Describe your business in plain words — what you sell, who buys, what's coming up. CREO turns it into your brand kit."],
  ["Choose", "Get three genuinely different directions, each with its caption. Pick one, or ask for changes the way you'd ask a person."],
  ["Approve", "Every layer stays editable. Download it, or publish to your connected accounts — only when you say yes."],
];

const FAQ = [
  ["I'm not a designer. Can I really use this?", "Yes. You describe, choose and approve. The editor is there if you want to tweak something — you never have to."],
  ["Will it look like my brand, or like everyone else's?", "Every design is built from your brand kit: your colours, fonts, logo and tone of voice. Three directions per brief keep it from feeling templated."],
  ["Do I have to connect Instagram or Facebook?", "No. You can always download the design and copy the caption. Connecting is optional, and even then nothing posts without your approval."],
  ["Will AI change my product photos?", "No. Your uploads are placed as the original pixels. Any AI alteration is something you switch on, and it's saved as a new version."],
  ["What does it cost?", "CREO is free during early access — no card required. You'll hear from us well before that changes."],
];

const CHAPTERS = ["Today", "You", "The ask", "The trap", "Your team", "At work", "Every language"];

// The six specialists (docs/AGENT_SYSTEM.md). Beat k is live at local progress 0.17 + 0.13k —
// world-stage.tsx highlights the matching orbiting node with the same timing.
const AGENTS: [string, React.ReactNode, string?][] = [
  ["Brand", <>learns your colours, fonts, logo and the way you talk — <em>once.</em></>],
  ["Strategist", <>plans what to post this week, <em>and why.</em></>],
  ["Designer", <>writes the copy and designs the post — <em>in your languages.</em></>],
  ["Manager", <>schedules what you approve, <em>and tells you when it&apos;s out.</em></>],
  ["Research", <>reads your competitors&apos; public posts and finds the gaps — <em>so every post has a reason.</em></>],
  ["Analyst", <>reads your real results and tells you <em>what worked.</em></>],
];

export default function WorldPage() {
  return (
    <div className={`w ${script.variable} ${serif.variable} ${deva.variable} ${mono.variable}`} data-tone="dark" suppressHydrationWarning>
      {/* Decide film mode before first paint so the static fallback never flashes. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.currentScript.parentElement.classList.add('w-film')",
        }}
      />

      <header className="w-hud">
        <Link href="/" className="w-mark">CREO</Link>
        <nav className="w-ruler" aria-label="Chapters">
          <span className="w-ruler-fill" aria-hidden="true" />
          {CHAPTERS.map((c, i) => (
            <a key={c} href={`#act-${i}`} data-chapter={i} aria-label={c}>
              <i aria-hidden="true" />
              <span>{c}</span>
            </a>
          ))}
        </nav>
        <Link href="/login" className="w-hud-cta">Start free</Link>
      </header>

      <main>
        <section className="w-act" id="act-0" data-act="0" style={{ "--h": 160 } as React.CSSProperties}>
          <div className="w-stage">
            <p className="w-beat w-c w-kicker" data-in="-1" data-out="0.55">For India&apos;s small businesses</p>
            <h1 className="w-beat w-c w-low" data-in="-1" data-out="0.55">
              Your business deserves <em>a whole team.</em>
            </h1>
            <div className="w-beat w-c w-bottom" data-in="-1" data-out="0.5">
              <button type="button" className="w-hold" data-hold>
                <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="20" /><circle cx="22" cy="22" r="20" data-hold-ring /></svg>
                <span>Hold to switch on CREO</span>
              </button>
              <span className="w-hint">or scroll</span>
            </div>
          </div>
        </section>

        <section className="w-act" id="act-1" data-act="1" style={{ "--h": 260 } as React.CSSProperties}>
          <div className="w-stage">
            <h2 className="w-beat w-tl" data-in="0.08" data-out="0.5">You started a business <em>to make things.</em></h2>
            <p className="w-beat w-br w-big" data-in="0.5" data-out="0.95">Not to make <em>posts.</em></p>
          </div>
        </section>

        <section className="w-act" id="act-2" data-act="2" style={{ "--h": 340 } as React.CSSProperties}>
          <div className="w-stage">
            <h2 className="w-beat w-c w-big" data-in="0.06" data-out="0.32">But your customers <em>scroll.</em></h2>
            <p className="w-beat w-tl" data-in="0.34" data-out="0.66">
              They expect a post for every sale, every launch, every festival — <em>in their own language.</em>
            </p>
            <p className="w-beat w-br" data-in="0.68" data-out="0.96">Go quiet for a week, <em>and they scroll past you.</em></p>
          </div>
        </section>

        <section className="w-act" id="act-3" data-act="3" style={{ "--h": 400 } as React.CSSProperties}>
          <div className="w-stage">
            <h2 className="w-beat w-tl" data-in="0.04" data-out="0.3">So you tried <em>an agency.</em> <small>Slow replies. Monthly bills.</small></h2>
            <p className="w-beat w-br" data-in="0.3" data-out="0.55">You tried <em>templates.</em> <small>The same post as the shop next door.</small></p>
            <p className="w-beat w-tl" data-in="0.55" data-out="0.8">
              You asked <em>a generic AI.</em> <small>It couldn&apos;t even spell <span lang="hi">नमस्ते</span>.</small>
            </p>
            <p className="w-beat w-c w-big" data-in="0.82" data-out="1.02">None of them <em>knew your brand.</em></p>
          </div>
        </section>

        <section className="w-act" id="act-4" data-act="4" style={{ "--h": 520 } as React.CSSProperties}>
          <div className="w-stage">
            <h2 className="w-beat w-c w-intro" data-in="0.02" data-out="0.16">
              <em>Introducing</em> <strong>CREO</strong>
              <small>Six specialists. One team. Working for you.</small>
            </h2>
            {AGENTS.map(([name, line, tag], k) => (
              <p
                key={name}
                className={`w-beat w-agent ${k % 2 ? "w-br" : "w-tl"}`}
                data-in={(0.17 + 0.13 * k).toFixed(2)}
                data-out={(0.3 + 0.13 * k).toFixed(2)}
              >
                <b>0{k + 1} · {name}{tag && <i> · {tag}</i>}</b>
                {line}
              </p>
            ))}
          </div>
        </section>

        <section className="w-act" id="act-5" data-act="5" style={{ "--h": 420 } as React.CSSProperties}>
          <div className="w-stage">
            <h2 className="w-beat w-tl" data-in="0.04" data-out="0.3">
              Watch them make <em>one post.</em> <small>Brand facts in, a finished design out.</small>
            </h2>
            <p className="w-beat w-bl" data-in="0.36" data-out="0.72">
              Every post comes <em>in layers you can edit.</em>
              <small>Real fonts. Real text in every script. Never a flat picture.</small>
            </p>
            <p className="w-beat w-bl w-big" data-in="0.76" data-out="1.02">Nothing goes live <em>until you say yes.</em></p>
            <p className="w-beat w-foot" data-in="0.2" data-out="0.74">Real CREO post · The Pizza Bakery, Bengaluru</p>
          </div>
        </section>

        <section className="w-act" id="act-6" data-act="6" style={{ "--h": 340 } as React.CSSProperties}>
          <div className="w-stage">
            <h2 className="w-beat w-tl" data-in="0.04" data-out="0.42">
              Speak to every customer <em>in the language they think in.</em>
            </h2>
            <ul className="w-beat w-langs" data-in="0.12" data-out="0.42" aria-label="Languages CREO writes in">
              {LANGS.map(([code, word, name]) => (
                <li key={code}><span lang={code}>{word}</span><small>{name}</small></li>
              ))}
            </ul>
            <div className="w-beat w-c w-final" data-in="0.46" data-out="9">
              <h2>Your first post is free. <em>Meet your team today.</em></h2>
              <Link href="/login" className="w-cta-big">Make my first post — free</Link>
              <p className="w-small">Every poster here was made by CREO · drag to spin</p>
            </div>
          </div>
        </section>
      </main>

      <div className="w-after">
        <section id="how" aria-labelledby="how-h">
          <p className="w-kicker">How it works</p>
          <h2 id="how-h">Three steps. <em>You stay in charge.</em></h2>
          <ol className="w-steps">
            {STEPS.map(([name, text], k) => (
              <li key={name}><b>0{k + 1} · {name}</b><p>{text}</p></li>
            ))}
          </ol>
        </section>

        <section id="faq" aria-labelledby="faq-h">
          <p className="w-kicker">Questions</p>
          <h2 id="faq-h">What owners <em>ask us first.</em></h2>
          <div className="w-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <section className="w-last" aria-labelledby="last-h">
          <h2 id="last-h">Ready when you are. <em>Your first post is free.</em></h2>
          <Link href="/login" className="w-cta-big">Make my first post — free</Link>
        </section>
      </div>

      <footer className="w-footer">
        <span>{COPYRIGHT}</span>
        <Link href="/classic">Classic page</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </footer>

      <Link href="/login" className="w-pill" data-pill>
        <span className="w-pill-dot" aria-hidden="true" />
        Make my first post — free
      </Link>

      <WorldStage />
    </div>
  );
}
