import type { Metadata } from "next";
import {
  Geist_Mono,
  Instrument_Serif,
  Inter_Tight,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from "next/font/google";
import CreoHome from "@/components/creo-home";
import "./home.css";

// "Living Letters": one particle field spells Creo., melts into five Indian scripts, then
// becomes a poster. The behaviour (WebGL, reel, wall, hold) lives in components/creo-home.tsx;
// everything readable is real HTML here so it renders without JS.

const display = Inter_Tight({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["600", "800"], variable: "--font-deva", display: "swap" });
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], weight: ["600", "800"], variable: "--font-tamil", display: "swap" });
const beng = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["600", "800"], variable: "--font-beng", display: "swap" });
const knda = Noto_Sans_Kannada({ subsets: ["kannada"], weight: ["600", "800"], variable: "--font-knda", display: "swap" });
const telu = Noto_Sans_Telugu({ subsets: ["telugu"], weight: "600", variable: "--font-telu", display: "swap" });
const gujr = Noto_Sans_Gujarati({ subsets: ["gujarati"], weight: "600", variable: "--font-gujr", display: "swap" });
const mlym = Noto_Sans_Malayalam({ subsets: ["malayalam"], weight: "600", variable: "--font-mlym", display: "swap" });
const guru = Noto_Sans_Gurmukhi({ subsets: ["gurmukhi"], weight: "600", variable: "--font-guru", display: "swap" });
const orya = Noto_Sans_Oriya({ subsets: ["oriya"], weight: "600", variable: "--font-orya", display: "swap" });
const FONTS = [display, serif, mono, deva, tamil, beng, knda, telu, gujr, mlym, guru, orya].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "Creo. — Your AI marketing team, in every language India speaks",
  description:
    "Meet Creo: six AI specialists for Indian businesses. Brand, strategy, design, publishing, research and analytics. On-brand, editable posts in 11 languages that never go live until you say yes.",
  alternates: { canonical: "/" },
};

const HELLO = ["नमस्ते", "নমস্কার", "வணக்கம்", "నమస్కారం", "नमस्कार", "નમસ્તે", "ನಮಸ್ಕಾರ", "നമസ്കാരം", "ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "ନମସ୍କାର", "Hello"];

// Stage 0 is the hero; stages 1–4 are scripts; stage 5 is the poster. Order must match
// WORDS in components/creo-home.tsx.
const SCRIPTS = [
  ["Hindi", "Devanagari script", "नमस्ते · namaste · hello", "The same letters, rearranged. Creo writes real text in every script, with real fonts."],
  ["Tamil", "Tamil script", "வணக்கம் · vanakkam · hello", "Correct spelling, correct conjuncts. No broken glyphs on your poster."],
  ["Bengali", "Bengali script", "নমস্কার · nomoskar · hello", "Write once in plain words. Publish in the language each customer thinks in."],
  ["Kannada", "Kannada script", "ನಮಸ್ಕಾರ · namaskāra · hello", "Plus Telugu, Marathi, Gujarati, Malayalam, Punjabi, Odia and English."],
];

const TEAM: { name: string; color: string; line: React.ReactNode; scene: React.ReactNode }[] = [
  {
    name: "Brand", color: "var(--rose)",
    line: <>Learns your colours, fonts, logo and the way you talk. <em>Once.</em></>,
    scene: <div className="c-scene sc-orbit"><i /><i /><i /><i /><b>Aa</b></div>,
  },
  {
    name: "Strategist", color: "var(--saffron)",
    line: <>Plans what to post this week, <em>and why.</em></>,
    scene: (
      <div className="c-scene"><div className="sc-week">
        <div>Mon</div><div className="on">Tue<br />Offer</div><div>Wed</div><div className="on">Thu<br />Reel</div><div>Fri</div><div className="on">Sat<br />Sale</div><div>Sun</div>
      </div></div>
    ),
  },
  {
    name: "Designer", color: "var(--violet)",
    line: <>Writes the copy and designs the post, <em>in your languages.</em></>,
    scene: <div className="c-scene sc-layers"><span>Background</span><span>Your photo</span><span lang="hi">इस हफ़्ते नया</span><span>Offer</span></div>,
  },
  {
    name: "Manager", color: "var(--mint)",
    line: <>Schedules what you approve, <em>and tells you when it&apos;s out.</em></>,
    scene: (
      <div className="c-scene"><div className="sc-toast">
        <div>Approved by you<span>6:02 pm</span></div><div>Scheduled · Instagram<span>Sat 7:30</span></div><div>Posted ✓<span>Sat 7:30</span></div>
      </div></div>
    ),
  },
  {
    name: "Research", color: "var(--cyan)",
    line: <>Reads competitors&apos; public posts and finds the gaps, <em>so every post has a reason.</em></>,
    scene: (
      <div className="c-scene"><div className="sc-scan">
        {Array.from({ length: 12 }, (_, i) => (i === 5 ? <div key={i} className="gap">GAP<br />no Tamil</div> : <div key={i} />))}
      </div></div>
    ),
  },
  {
    name: "Analyst", color: "var(--amber)",
    line: <>Reads your real results and tells you <em>what worked.</em></>,
    scene: (
      <div className="c-scene"><div className="sc-bars">
        {[30, 46, 38, 62, 74, 92].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.2}s` }} />)}
      </div></div>
    ),
  },
];

const STEPS = [
  ["Tell", "Describe your business in plain words: what you sell, who buys, what's coming up. Creo turns it into your brand kit."],
  ["Choose", "Get three genuinely different directions, each with its caption. Pick one, or ask for changes the way you'd ask a person."],
  ["Approve", "Every layer stays editable. Download it, or publish to your connected accounts, only when you say yes."],
];

const FAQ = [
  ["I'm not a designer. Can I really use this?", "Yes. You describe, choose and approve. The editor is there if you want to tweak something. You never have to."],
  ["Will it look like my brand, or like everyone else's?", "Every design is built from your brand kit: your colours, fonts, logo and tone of voice. Three directions per brief keep it from feeling templated."],
  ["Do I have to connect Instagram or Facebook?", "No. You can always download the design and copy the caption. Connecting is optional, and even then nothing posts without your approval."],
  ["Will AI change my product photos?", "No. Your uploads are placed as the original pixels. Any AI alteration is something you switch on, and it's saved as a new version."],
  ["What does it cost?", "Creo is free during early access, with no card required. You'll hear from us well before that changes."],
];

// Manifesto: plain words light up one by one on scroll; [kind, text] pieces.
const MANIFESTO: [string, string][] = [
  ["t", "You started a business to"], ["em", "make things."], ["t", "Not to make posts."], ["chip", "a"],
  ["t", "So here is your team: six specialists who learn your brand"], ["em", "once,"],
  ["t", "then plan, write, design and publish"], ["chip", "b"], ["t", "in the language your customers"], ["em", "think in."],
  ["t", "And nothing goes live"], ["chip", "c"], ["t", "until you say"], ["foil", "yes."],
];

export default function Home() {
  return (
    <div className={`c ${FONTS}`} suppressHydrationWarning>
      {/* Decide motion mode before first paint so the static layout never flashes. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.currentScript.parentElement.classList.add('motion','is-loading')",
        }}
      />
      <CreoHome />

      <header className="c-nav c-pad">
        <a className="c-wordmark" href="#letters">Creo.</a>
        <nav className="c-nav-links" aria-label="Sections">
          <a href="#manifesto">Why</a><a href="#team-wrap">Team</a><a href="#wall">Work</a><a href="#how">How</a>
        </nav>
        <span className="c-clock" data-clock>IST</span>
        <a className="c-nav-cta" href="/login">Start free</a>
      </header>

      <main>
        <section id="letters" aria-label="Creo in eleven scripts">
          <div className="c-stage">
            <div className="c-fallback-word" aria-hidden="true">Creo.</div>

            <div className="c-cap c-hero-cap live" data-stage="0">
              <div className="c-hero-kick c-mono"><span>(AI marketing team)</span><span>For India&apos;s small businesses</span></div>
              <h1 className="c-hero-h">
                <span className="c-line"><span>A whole marketing</span></span>
                <span className="c-line"><span>team that speaks</span></span>
                <span className="c-line"><span><em className="c-serif c-foil">your India.</em></span></span>
              </h1>
              <div className="c-hero-side">
                <p><b>Six AI specialists</b> who learn your brand once, then plan, write and design your posts in eleven languages. Nothing goes live until you say yes.</p>
                <a className="c-btn" href="/login" data-magnetic>Make my first post, free <span className="arr">→</span></a>
              </div>
              <div className="c-scroll-cue c-mono"><span>Scroll</span><i /></div>
            </div>

            {SCRIPTS.map(([name, script, hello, line], i) => (
              <div className="c-cap c-lang-cap" data-stage={i + 1} key={name}>
                <div className="lc-right"><p className="lc-num">0{i + 2}<small> / 06</small></p><p className="c-mono">{script}</p></div>
                <div className="lc-left"><p className="c-mono">{hello}</p><p className="lc-name">{name}</p><p className="lc-mean">{line}</p></div>
              </div>
            ))}

            <div className="c-cap c-poster-cap" data-stage="5">
              <div className="pc-h">
                <h2>Every letter<br />becomes <em className="c-serif c-foil">a post.</em></h2>
                <p>Layered, editable, on-brand. Your photos stay the original pixels. Never a flat picture.</p>
              </div>
            </div>

            <div className="c-rail" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i}><b /></i>)}</div>
          </div>
        </section>

        <section className="c-manifesto c-pad" id="manifesto">
          <div className="meta c-mono"><span>(Why Creo)</span><span>01 — Manifesto</span></div>
          <p className="big" data-manifesto>
            {MANIFESTO.map(([kind, text], k) => {
              if (kind === "chip") return <span key={k}><span className={`w c-chip ${text}`} aria-hidden="true" /> </span>;
              if (kind === "em") return <span key={k}><em className="w c-serif">{text}</em> </span>;
              if (kind === "foil") return <em key={k} className="w c-serif c-foil">{text}</em>;
              return <span key={k}>{text.split(" ").map((word, j) => <span key={j}><span className="w">{word}</span> </span>)}</span>;
            })}
          </p>
        </section>

        <div className="c-marquee" aria-label="Hello in eleven languages">
          <div className="mq-track">{[...HELLO, ...HELLO].map((w, i) => <span key={i} aria-hidden={i >= HELLO.length}>{w}</span>)}</div>
        </div>

        <div id="team-wrap">
          <section id="team" aria-label="The team">
            <div className="c-reel" data-reel>
              <div className="c-panel intro">
                <h2>Meet your<br /><em className="c-serif c-foil">team.</em><sup>(06)</sup></h2>
                <p>Each specialist has one job and does it every week, for your shop only.</p>
              </div>
              {TEAM.map((t, i) => (
                <article className="c-panel" style={{ "--c": t.color } as React.CSSProperties} key={t.name}>
                  <div className="p-top"><span className="p-num" aria-hidden="true">0{i + 1}</span><span className="p-tag c-mono"><i />{t.name}</span></div>
                  <div aria-hidden="true">{t.scene}</div>
                  <div className="p-bottom"><h3 className="p-name">{t.name}</h3><p className="p-line">{t.line}</p></div>
                </article>
              ))}
            </div>
            <div className="c-reel-bar"><b data-reel-bar /></div>
          </section>
        </div>

        <section id="wall" aria-label="Posters made by Creo" data-cursor="Drag">
          <div className="c-wall-3d"><div className="c-plane" data-plane /></div>
          <div className="c-wall-fade" />
          <div className="c-wall-over"><h2>Every poster here<br /><em className="c-serif">was made by Creo.</em></h2></div>
          <div className="c-wall-meta c-mono"><span>Drag to explore</span><span>Real Creo posters</span></div>
        </section>

        <section id="yes" aria-label="Approve">
          <div className="c-flood" data-flood />
          <div className="c-yes-in c-pad">
            <p className="c-mono">(The only rule)</p>
            <h2 className="c-yes-h">Nothing goes live<br />until you say <em className="c-serif c-foil">yes.</em></h2>
            <button className="c-hold" type="button" data-hold data-cursor="Hold" aria-describedby="yes-msg"><span>Press<br />&amp; hold</span></button>
            <p className="c-yes-msg" id="yes-msg" aria-live="polite">Try it. This is the only button Creo needs from you.</p>
          </div>
        </section>

        <section className="c-how c-pad" id="how">
          <div className="how-l"><p className="c-mono">(How it works)</p><h2>Three steps.<br /><em className="c-serif c-foil">You stay in charge.</em></h2></div>
          <ol className="c-steps">
            {STEPS.map(([name, text]) => <li key={name}><div><h3>{name}</h3><p>{text}</p></div></li>)}
          </ol>
        </section>

        <section className="c-faq c-pad" id="faq">
          <h2>What owners<br /><em className="c-serif">ask us first.</em></h2>
          <div>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>
      </main>

      <footer className="c-footer">
        <div className="c-pad">
          <div className="f-top">
            <h2>Your team is ready. <em className="c-serif c-foil">Your first post is free.</em></h2>
            <a className="c-btn" href="/login" data-magnetic>Make my first post <span className="arr">→</span></a>
          </div>
          <div className="f-links">
            <span>© {new Date().getFullYear()} SiferTech</span>
            <a href="/pricing">Pricing</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/classic">Classic page</a>
          </div>
        </div>
        <div className="c-giant" aria-hidden="true">{"Creo.".split("").map((ch, i) => <span key={i}>{ch}</span>)}</div>
      </footer>
    </div>
  );
}
