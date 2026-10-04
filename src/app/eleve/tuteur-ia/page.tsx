"use client";

import { useEffect, useRef, useState } from "react";
import { appelAPI } from "@/lib/client-api";
import { MATIERES } from "@/lib/programmes/curriculum";

interface Message {
  id: string;
  role: "ELEVE" | "IA" | "SYSTEME";
  contenu: string;
}

export default function PageTuteurIA() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [matiereCode, setMatiereCode] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enAttente, setEnAttente] = useState(false);
  const finDesMessages = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finDesMessages.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function demarrerSession() {
    setEnAttente(true);
    try {
      const { session, messageAccueil } = await appelAPI<{ session: { id: string }; messageAccueil: string }>(
        "/api/tuteur/sessions",
        { method: "POST", corpsJSON: { matiereCode: matiereCode || undefined } }
      );
      setSessionId(session.id);
      setMessages([{ id: "accueil", role: "IA", contenu: messageAccueil }]);
    } finally {
      setEnAttente(false);
    }
  }

  async function envoyerMessage() {
    if (!sessionId || !saisie.trim()) return;
    const contenu = saisie.trim();
    setSaisie("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: "ELEVE", contenu }]);
    setEnAttente(true);
    try {
      const { message } = await appelAPI<{ message: Message }>(`/api/tuteur/sessions/${sessionId}/messages`, {
        method: "POST",
        corpsJSON: { contenu },
      });
      setMessages((m) => [...m, message]);
    } catch (e) {
      setMessages((m) => [...m, { id: `erreur-${Date.now()}`, role: "SYSTEME", contenu: `Erreur : ${(e as Error).message}` }]);
    } finally {
      setEnAttente(false);
    }
  }

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-bold text-slate-900">Nouvelle session avec le Professeur IA</h1>
        <p className="mt-1 text-sm text-slate-500">Choisis une matière (optionnel) puis commence à poser tes questions.</p>
        <div className="carte mt-4">
          <label className="etiquette">Matière</label>
          <select className="champ-saisie" value={matiereCode} onChange={(e) => setMatiereCode(e.target.value)}>
            <option value="">Peu importe / plusieurs matières</option>
            {MATIERES.map((m) => (
              <option key={m.code} value={m.code}>
                {m.icone} {m.nom}
              </option>
            ))}
          </select>
          <button className="bouton-primaire mt-4 w-full" onClick={demarrerSession} disabled={enAttente}>
            {enAttente ? "Démarrage…" : "Commencer la session"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "ELEVE" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "ELEVE"
                  ? "bg-educia-600 text-white"
                  : m.role === "SYSTEME"
                    ? "bg-danger/10 text-danger"
                    : "bg-white text-slate-800 shadow-sm"
              }`}
            >
              {m.contenu}
            </div>
          </div>
        ))}
        {enAttente && <div className="text-sm text-slate-400">Le Professeur IA réfléchit…</div>}
        <div ref={finDesMessages} />
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          envoyerMessage();
        }}
      >
        <input
          className="champ-saisie flex-1"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Écris ta question ici…"
          disabled={enAttente}
        />
        <button className="bouton-primaire" type="submit" disabled={enAttente || !saisie.trim()}>
          Envoyer
        </button>
      </form>
    </div>
  );
}
