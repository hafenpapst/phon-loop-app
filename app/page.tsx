"use client";

import React, { useState, useEffect } from "react";

const digitPool = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const syllablePool = ["Bein", "Wein", "Pein", "Sein", "Mein", "Dein"];
const shortWords = [
  "Hund",
  "Boot",
  "Haus",
  "Stuhl",
  "Bus",
  "Berg",
  "Zug",
  "Fisch",
  "Apfel",
  "Uhr",
  "Hand",
  "Buch",
  "Kind",
  "Baum",
  "Tisch",
  "Mond",
  "Sonne",
  "Blume",
  "Wolke",
  "Auto",
];
const longWords = [
  "Akademie",
  "Telefonnummer",
  "Melodie",
  "Banane",
  "Fotografie",
  "Universität",
  "Regenbogen",
  "Schokolade",
  "Straßenbahn",
  "Kreisverkehr",
  "Wasserflasche",
  "Feuerwehrmann",
  "Krankenhaus",
  "Bibliothek",
  "Abenteuer",
  "Schmetterling",
  "Erdbeere",
  "Zahnarztpraxis",
  "Fernsehsendung",
  "Computerspiel",
];

type TestType = "digits" | "syllables" | "wordlength";

interface TrialResult {
  test: TestType;
  target: string[];
  response: string[];
  correct: boolean;
  length: number;
  condition?: "short" | "long";
  duration: number | null; // Antwortdauer in Sekunden
}

export default function PhonologicalApp() {
  const [activeTest, setActiveTest] = useState<TestType>("digits");
  const [phase, setPhase] = useState<"idle" | "presenting" | "recall" | "feedback">("idle");
  const [currentSeq, setCurrentSeq] = useState<string[]>([]);
  const [userResponse, setUserResponse] = useState<string[]>([]);
  const [currentLength, setCurrentLength] = useState<number>(2);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [wordCondition, setWordCondition] = useState<"short" | "long">("short");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Name/Feedback/Overlay
  const [participantName, setParticipantName] = useState<string>("");
  const [showReport, setShowReport] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  // Geschwindigkeit & Pause
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [pauseMs, setPauseMs] = useState<number>(400);

  // Stimmen-Auswahl
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number | null>(null);

  // Timing nur für Antwortphase
  const [startTime, setStartTime] = useState<number | null>(null);

  // Sequenz ohne Wiederholungen, bis alle Items einmal benutzt wurden
  function makeSequence(len: number, pool: string[]) {
    const seq: string[] = [];
    let available = [...pool]; // Kopie des Pools

    for (let i = 0; i < len; i++) {
      if (available.length === 0) {
        // Pool wieder auffüllen, wenn alles einmal dran war
        available = [...pool];
      }

      const idx = Math.floor(Math.random() * available.length);
      const next = available[idx];

      seq.push(next);
      // Verhindert Doppeltes innerhalb der gleichen Sequenz,
      // bis einmal alles verbraucht ist
      available.splice(idx, 1);
    }

    return seq;
  }

  // Mobile-Fix: Stimmen laden + Engine "anwärmen" + Stimmen in State
  async function ensureTtsReady(): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    // auf Stimmen warten (iOS lädt asynchron)
    await new Promise<void>((resolve) => {
      const voicesNow = synth.getVoices();
      if (voicesNow && voicesNow.length) return resolve();

      const timer = setTimeout(() => resolve(), 1200);
      const handler = () => {
        clearTimeout(timer);
        synth.onvoiceschanged = null;
        resolve();
      };
      synth.onvoiceschanged = handler;
    });

    const voices = synth.getVoices();
    const deVoices = voices.filter((v) =>
      v.lang?.toLowerCase().startsWith("de")
    );
    setAvailableVoices(deVoices);
    if (selectedVoiceIndex === null && deVoices.length > 0) {
      setSelectedVoiceIndex(0);
    }

    // Warmup – kurzer stummer Utterance im Klick-Kontext
    await new Promise<void>((resolve) => {
      try {
        const u = new SpeechSynthesisUtterance("bereit");
        u.lang = "de-DE";
        u.volume = 0;
        u.rate = 1.0;
        const t = setTimeout(() => resolve(), 300);
        u.onend = () => {
          clearTimeout(t);
          resolve();
        };
        synth.speak(u);
      } catch {
        resolve();
      }
    });
  }

  function speakItem(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }
      const synth = window.speechSynthesis;

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "de-DE";

      let voiceToUse: SpeechSynthesisVoice | undefined;

      if (availableVoices.length > 0 && selectedVoiceIndex !== null) {
        voiceToUse = availableVoices[selectedVoiceIndex]!;
      } else {
        const voices = synth.getVoices();
        voiceToUse = voices.find((v) =>
          v.lang?.toLowerCase().startsWith("de")
        );
      }

      if (voiceToUse) {
        utter.voice = voiceToUse;
      }

      // Rate aus Slider; „ba“ etwas langsamer, aber nie unter 0.3
      let rate = speechRate ?? 1.0;
      if (text.toLowerCase() === "ba") {
        rate = Math.max(0.3, rate - 0.1);
      }
      utter.rate = rate;
      utter.volume = 1;
      utter.pitch = 1;

      // Safety: falls onend auf Mobile nicht feuert
      const maxDur = Math.max(
        800,
        Math.min(2500, Math.round((text.length + 2) * (900 / rate)))
      );
      const timeout = setTimeout(() => resolve(), maxDur);

      utter.onend = () => {
        clearTimeout(timeout);
        resolve();
      };

      try {
        synth.speak(utter);
      } catch {
        clearTimeout(timeout);
        resolve();
      }
    });
  }

  async function presentSequence(seq: string[]) {
    setIsSpeaking(true);

    // alte Warteschlange leeren
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // Vorbereitungs-Pause vor der ersten Ansage
    await new Promise((r) => setTimeout(r, 1500));

    for (const item of seq) {
      await speakItem(item);
      if (pauseMs > 0) {
        await new Promise((r) => setTimeout(r, pauseMs));
      }
    }

    setIsSpeaking(false);
  }

  async function startTrial() {
    if (phase !== "idle" && phase !== "feedback") return;

    // TTS vorbereiten (wichtig für Mobile)
    await ensureTtsReady();

    let pool: string[] = [];
    if (activeTest === "digits") {
      pool = digitPool;
    } else if (activeTest === "syllables") {
      pool = syllablePool;
    } else {
      pool = wordCondition === "short" ? shortWords : longWords;
    }

    const seq = makeSequence(currentLength, pool);
    setCurrentSeq(seq);
    setUserResponse([]);
    setStartTime(null); // sicherheitshalber reset

    setPhase("presenting");
    await presentSequence(seq);

    // ⬇️ HIER: Recall beginnt → Zeit startet JETZT
    setStartTime(Date.now());
    setPhase("recall");
  }

  function handleButtonInput(item: string) {
    if (phase !== "recall") return;
    setUserResponse((prev) => {
      const updated = [...prev, item];
      if (updated.length === currentSeq.length) {
        evaluate(updated);
      }
      return updated;
    });
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phase !== "recall") return;
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const val = (data.get("resp") as string) || "";
    const parsed = val
      .split(/[ ,;]+/g)
      .map((x) => x.trim())
      .filter(Boolean);
    evaluate(parsed);
    form.reset();
  }

  function evaluate(resp: string[]) {
    const target = currentSeq;
    const correct =
      resp.length === target.length &&
      resp.every((r, idx) => r.toLowerCase() === target[idx].toLowerCase());

    const durationSec =
      startTime != null ? (Date.now() - startTime) / 1000 : null;

    const thisResult: TrialResult = {
      test: activeTest,
      target,
      response: resp,
      correct,
      length: target.length,
      condition: activeTest === "wordlength" ? wordCondition : undefined,
      duration: durationSec,
    };

    setResults((prev) => [thisResult, ...prev].slice(0, 50));

    if (correct) {
      setCurrentLength((len) => len + 1);
    } else {
      setCurrentLength(2);
    }

    setPhase("feedback");
  }

  useEffect(() => {
    setCurrentLength(2);
    setPhase("idle");
    setUserResponse([]);
    setStartTime(null);
  }, [activeTest]);

  const totalCorrectDigits = results.filter((r) => r.test === "digits" && r.correct).length;
  const totalCorrectSyllables = results.filter((r) => r.test === "syllables" && r.correct).length;
  const totalCorrectWords = results.filter((r) => r.test === "wordlength" && r.correct).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Phonologische Schleife – Teste dein Arbeitsgedächtnis</h1>
          <p>3 Aufgaben: Zahlenspanne, Ähnlichkeitseffekt, Wortlängeneffekt</p>
        </div>
        <div className="name-box">
          <label>
            Name / Gruppe:
            <input
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="z.B. Gruppe A oder Maria"
            />
          </label>
        </div>
      </header>

      <main className="main-layout">
        <div className="left-panel">
          <div className="tabs">
            <button
              onClick={() => setActiveTest("digits")}
              className={activeTest === "digits" ? "tab active" : "tab"}
            >
              Zahlenspanne
            </button>
            <button
              onClick={() => setActiveTest("syllables")}
              className={activeTest === "syllables" ? "tab active" : "tab"}
            >
              Ähnlichkeitseffekt
            </button>
            <button
              onClick={() => setActiveTest("wordlength")}
              className={activeTest === "wordlength" ? "tab active" : "tab"}
            >
              Wortlängeneffekt
            </button>
          </div>

          <div className="card big">
            <h2>
              {activeTest === "digits" && "Zahlenspanne"}
              {activeTest === "syllables" && "Ähnlichkeitseffekt"}
              {activeTest === "wordlength" && "Wortlängeneffekt"}
            </h2>

            {activeTest === "wordlength" && (
              <div className="condition-switch">
                <label>
                  <input
                    type="radio"
                    checked={wordCondition === "short"}
                    onChange={() => setWordCondition("short")}
                  />
                  kurze Wörter
                </label>
                <label>
                  <input
                    type="radio"
                    checked={wordCondition === "long"}
                    onChange={() => setWordCondition("long")}
                  />
                  lange Wörter
                </label>
              </div>
            )}

            <div className="status-line">
              <span>Aktuelle Listenlänge: {currentLength}</span>
              <span>Phase: {phase === "idle" ? "bereit" : phase}</span>
            </div>

            <div className="presentation">
              {phase === "presenting" ? (
                <div className="presenting">Vorsprechen… 🎧</div>
              ) : phase === "recall" ? (
                <div className="recall">Bitte wiederholen!</div>
              ) : phase === "feedback" ? (
                <div className="feedback">
                  Letzte Zielsequenz: <strong>{currentSeq.join(" – ")}</strong>
                  <br />
                  Deine Antwort:{" "}
                  <strong>
                    {userResponse.length ? userResponse.join(" – ") : "(Textfeld)"}
                  </strong>
                </div>
              ) : (
                <div className="idle">Klicke auf „Start“, um zu beginnen.</div>
              )}
            </div>

            <div className="controls">
              <button onClick={startTrial} disabled={phase === "presenting" || isSpeaking}>
                {phase === "presenting" ? "läuft…" : "Start"}
              </button>
            </div>

            {phase === "recall" && (
              <>
                {activeTest === "digits" ? (
                  <div className="button-grid">
                    {digitPool.map((d) => (
                      <button key={d} onClick={() => handleButtonInput(d)}>
                        {d}
                      </button>
                    ))}
                  </div>
                ) : activeTest === "syllables" ? (
                  <div className="button-grid">
                    {syllablePool.map((s) => (
                      <button key={s} onClick={() => handleButtonInput(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleTextSubmit} className="text-input-form">
                    <input
                      name="resp"
                      placeholder="Antwort hier eingeben (mit Leerzeichen trennen)…"
                      autoComplete="off"
                    />
                    <button type="submit">Abschicken</button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>

        <div className="right-panel">
          {/* Geschwindigkeits-Schieber */}
          <div className="card">
            <h2>Ansagegeschwindigkeit</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                type="range"
                min={0.3}
                max={1.4}
                step={0.05}
                value={speechRate}
                onChange={(e) => setSpeechRate(Number(e.target.value))}
              />
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Aktuell: <b>{speechRate.toFixed(2)}×</b>
              </div>
            </div>
          </div>

          {/* Stimmen-Auswahl */}
          <div className="card">
            <h2>Stimme</h2>
            {availableVoices.length === 0 ? (
              <p style={{ fontSize: 12, opacity: 0.8 }}>
                Stimmen werden geladen… (ggf. einmal „Start“ drücken oder Seite neu laden)
              </p>
            ) : (
              <select
                value={selectedVoiceIndex ?? 0}
                onChange={(e) => setSelectedVoiceIndex(Number(e.target.value))}
                style={{
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: 13,
                }}
              >
                {availableVoices.map((v, idx) => (
                  <option key={v.voiceURI} value={idx}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Pause-Schieber */}
          <div className="card">
            <h2>Pause zwischen Ansagen</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                type="range"
                min={0}
                max={1500}
                step={50}
                value={pauseMs}
                onChange={(e) => setPauseMs(Number(e.target.value))}
              />
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {pauseMs === 0 ? (
                  <>Direkt hintereinander (0 ms)</>
                ) : (
                  <>
                    Aktuell: <b>{pauseMs}</b> ms (max. 1500 ms)
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Auswertung</h2>
            <p>Letzte Durchläufe (max. 50):</p>
            <ul className="results-list">
              {results.length === 0 && <li>Noch keine Daten.</li>}
              {results.map((r, idx) => (
                <li key={idx} className={r.correct ? "res-ok" : "res-bad"}>
                  <div className="res-header">
                    <strong>
                      {r.test === "digits"
                        ? "Zahlenspanne"
                        : r.test === "syllables"
                        ? "Silben"
                        : "Wortlänge"}
                    </strong>{" "}
                    {r.condition ? `(${r.condition})` : ""} – Länge {r.length} –{" "}
                    Dauer: {r.duration != null ? r.duration.toFixed(2) : "—"} s
                  </div>
                  <div>Ziel: {r.target.join(", ")}</div>
                  <div>Antwort: {r.response.join(", ") || "—"}</div>
                  <div>{r.correct ? "✅ korrekt" : "❌ falsch"}</div>
                </li>
              ))}
            </ul>

            <button className="report-btn" onClick={() => setShowReport(true)}>
              Auswertung anzeigen
            </button>
          </div>

          <div className="card">
            <h2>Feedback</h2>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Wie war die Aufgabe? Was sollen wir anpassen? ..."
            />
          </div>
        </div>
      </main>

      {/* --- Impressum & Projekt-Infos --- */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-col">
            <p className="footer-title">Impressum</p>
            <p>
              Herausgeber: <strong>Dennis Eustermann</strong>
              <br />
              E-Mail:{" "}
              <a href="mailto:Dennis.Eustermann@mailbox.tu-dresden.de">
                Dennis.Eustermann@mailbox.tu-dresden.de
              </a>
            </p>
            <p className="footer-copy">© {new Date().getFullYear()} Dennis Eustermann</p>
          </div>

          <div className="footer-col">
            <p className="footer-title">Projekt</p>
            <p>
              <em>„Gedächtnis und Aufmerksamkeit in Kindheit und Jugend“</em>
              <br />
              Technische Universität Dresden
            </p>

            <div className="footer-apps">
              <a
                href="https://corsi-app.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="app-card"
              >
                <span className="app-title">Corsi-Block-App</span>
                <span className="app-desc">
                  Visuell-räumliche Arbeitsgedächtnisaufgabe
                </span>
              </a>

              <a
                href="https://mental-rotation-web.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="app-card"
              >
                <span className="app-title">Mental Rotation</span>
                <span className="app-desc">
                  Räumliche Vorstellung & mentale Drehung
                </span>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {showReport && (
        <div className="overlay">
          <div className="overlay-content">
            <h2>Übersicht {participantName ? `für ${participantName}` : ""}</h2>
            <p>Richtige Durchläufe pro Test:</p>
            <div className="bar-row">
              <span>Zahlenspanne</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.min(totalCorrectDigits * 12, 100)}%` }}
                />
              </div>
              <span>{totalCorrectDigits}</span>
            </div>
            <div className="bar-row">
              <span>Silben</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.min(totalCorrectSyllables * 12, 100)}%` }}
                />
              </div>
              <span>{totalCorrectSyllables}</span>
            </div>
            <div className="bar-row">
              <span>Wortlänge</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.min(totalCorrectWords * 12, 100)}%` }}
                />
              </div>
              <span>{totalCorrectWords}</span>
            </div>

            {feedbackText && (
              <div className="feedback-box">
                <h3>Feedback des Teilnehmenden</h3>
                <p>{feedbackText}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button onClick={() => setShowReport(false)}>Schließen</button>
              <button
                onClick={async () => {
                  try {
                    await fetch("/api/log-feedback", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: participantName || null,
                        feedback: feedbackText || null,
                        results,
                        createdAt: new Date().toISOString(),
                      }),
                    });
                    alert("Daten wurden gesendet ✅");
                  } catch (err) {
                    alert("Konnte nicht senden ❌");
                  }
                }}
              >
                An Lehrer / Server senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
