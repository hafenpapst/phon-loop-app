export const metadata = {
  title: "Impressum – Phonologische Schleife",
  description: "Impressum und Projektinformationen",
};

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <div className="card">
        <h1 className="text-2xl md:text-3xl font-semibold mb-3">Impressum</h1>
        <p className="text-sm text-gray-600 mb-6">
          Herausgeber: <b>Dennis Eustermann</b><br/>
          E-Mail: <a className="text-indigo-600 underline" href="mailto:Dennis.Eustermann@mailbox.tu-dresden.de">
            Dennis.Eustermann@mailbox.tu-dresden.de
          </a>
        </p>

        <h2 className="text-xl font-semibold mb-2">Projekt</h2>
        <p className="mb-6">
          <b>Projekt im Seminar „Gedächtnis und Aufmerksamkeit in Kindheit und Jugend“</b>
        </p>

        <h2 className="text-xl font-semibold mb-2">Zugehörige Webseiten</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Corsi-Block-App:{" "}
            <a className="text-indigo-600 underline" href="https://corsi-app.vercel.app" target="_blank" rel="noreferrer">
              https://corsi-app.vercel.app
            </a>
          </li>
          <li>
            Phonologische Schleife:{" "}
            <a className="text-indigo-600 underline" href="https://phon-loop-app.vercel.app" target="_blank" rel="noreferrer">
              https://phon-loop-app.vercel.app
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}
