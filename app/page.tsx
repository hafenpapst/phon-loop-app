"use client";

import React, { useState, useEffect } from "react";

const digitPool = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const syllablePool = ["Bein", "Wein", "Pein", "Sein", "Mein", "Dein"];
const shortWords = ["Hund", "Boot", "Haus", "Stuhl", "Bus", "Berg", "Zug", "Fisch", "Apfel", "Uhr", "Hand", "Buch", "Kind"];
const longWords = ["Akademie", "Telefonnummer", "Melodie", "Banane", "Fotografie", "Universität", "Regenbogen", "Schokolade", "Straßenbahn", "Kreisverkehr"];

type TestType = "digits" | "syllables" | "wordlength";

interface TrialResult {
  test: TestType;
  target: string[];
  response: string[];
  correct: boolean;
  length: number;
  condition?: "short" | "long";
  time: string;
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

  // neu:
  const [participantName, setParticipantName] = useState<string>("");
  const [showReport, setShowReport] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  function makeSequence(len: number, pool: string[]) {
    const seq: string[] = [];
    for (let i = 0; i < len; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      seq.push(pool[idx]);
    }
    return seq;
  }

  function speakItem(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve();
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const deVoice = voices.find((v) => v.lang.startsWith("de"));
      if (deVoice) utter.voice = deVoice;

      // kleine Feinjustierung: "ba" etwas langsamer, weil TTS das gern verschluckt
      if (text.toLowerCase() === "ba") {
        utter.rate = 0.8;
      } else {
        utter.rate = 0.9;
      }

      utter.onend = () => {
        resolve();
      };
      window.speechSynthesis.speak(utter);
    });
  }

async function presentSequence(seq: string[]) {
  setIsSpeaking(true);

  // NEU: kurze Vorbereitungs-Pause vor der ERSTEN Ansage
  await new Promise((r) => setTimeout(r, 1500)); // 1500 = 1,5 Sekunden, kannst du auf 2000 stellen

  for (const item of seq) {
    await speakItem(item);
    await new Promise((r) => setTimeout(r, 400));
  }
  setIsSpeaking(false);
}

  async function startTrial() {
    if (phase !== "idle" && phase !== "feedback") return;

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
    setPhase("presenting");

    await presentSequence(seq);

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

    const thisResult: TrialResult = {
      test: activeTest,
      target,
      response: resp,
      correct,
      length: target.length,
      condition: activeTest === "wordlength" ? wordCondition : undefined,
      time: new Date().toLocaleTimeString(),
    };

    setResults((prev) => [thisResult, ...prev].slice(0, 50));

    if (correct) {
      setCurrentLength((len) => len + 1);
    } else {
      setCurrentLength(2);
    }

    setPhase("feedback");
  }

  // beim Test-Wechsel alles zurück
  useEffect(() => {
    setCurrentLength(2);
    setPhase("idle");
    setUserResponse([]);
  }, [activeTest]);

  // kleine Hilfsfunktionen für die Auswertung
  const totalCorrectDigits = results.filter((r) => r.test === "digits" && r.correct).length;
  const totalCorrectSyllables = results.filter((r) => r.test === "syllables" && r.correct).length;
  const totalCorrectWords = results.filter((r) => r.test === "wordlength" && r.correct).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Phonetische Schleife – Demo</h1>
          <p>3 Aufgaben: Zahlenspanne, Silben, Wortlänge / Ähnlichkeit</p>
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
              Silben-Span
            </button>
            <button
              onClick={() => setActiveTest("wordlength")}
              className={activeTest === "wordlength" ? "tab active" : "tab"}
            >
              Wortlänge / Ähnlichkeit
            </button>
          </div>

          <div className="card big">
            <h2>
              {activeTest === "digits" && "Zahlenspanne"}
              {activeTest === "syllables" && "Silben-Span"}
              {activeTest === "wordlength" && "Wortlänge / Ähnlichkeit"}
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
                    {r.condition ? `(${r.condition})` : ""} – Länge {r.length} – {r.time}
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
              placeholder="Wie war die Aufgabe? War die Stimme verständlich? ..."
            />
          </div>
        </div>
      </main>

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
