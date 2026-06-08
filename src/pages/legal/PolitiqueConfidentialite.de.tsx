import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '8. Juni 2026';

export default function DatenschutzDE() {
  useEffect(() => {
    document.title = 'Datenschutzerklärung — Logisorama by Immo-rama.ch';
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Zur Startseite
        </Link>
        <div className="text-xs text-muted-foreground mb-6 flex gap-3">
          <Link to="/politique-confidentialite" className="hover:text-primary">FR</Link>
          <Link to="/en/privacy-policy" className="hover:text-primary">EN</Link>
          <span className="text-primary font-semibold">DE</span>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary shrink-0 mt-1" />
          <div>
            <h1 className="text-4xl font-bold">Datenschutzerklärung</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ausgerichtet am revidierten DSG (in Kraft seit 1. September 2023) und an der DSGVO,
              soweit diese für betroffene Personen in der EU gilt — Letzte Aktualisierung: {LAST_UPDATE}
            </p>
          </div>
        </div>

        <p className="mb-8">
          Bei Logisorama hat der Schutz Ihrer personenbezogenen Daten oberste Priorität. Diese Erklärung
          beschreibt, welche Daten wir erheben, warum, wie wir sie verwenden und welche Rechte Sie haben.
          Insbesondere erklärt sie, warum wir bestimmte vertrauliche Dokumente (Lohnabrechnungen,
          Betreibungsauszug, Ausweis, Aufenthaltsbewilligung, Arbeitsvertrag) anfordern, die für ein
          bei Schweizer Verwaltungen, Eigentümern und Vermietern annehmbares Mieterdossier erforderlich sind.
        </p>

        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Verantwortlicher</h2>
            <p>Gemäss Art. 5 lit. j revDSG:</p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch</strong> — Einzelunternehmen</li>
              <li>Inhaber und Kontakt: <strong>Christ Ramazani</strong></li>
              <li>Chemin de l'Esparcette 5, 1023 Crissier, Schweiz</li>
              <li>UID: CHE-442.303.796</li>
              <li>E-Mail: <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Erhobene Datenkategorien</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Identitäts- und Kontaktdaten</strong>: Name, Vorname, Geburtsdatum, Nationalität, Zivilstand, Adresse, Telefon, E-Mail.</li>
              <li><strong>Vertrags- und Finanzdaten</strong>: Einkommen, berufliche Situation, Bankverbindung (Anzahlung/Rückerstattung), Mandatsverlauf.</li>
              <li><strong>Vertrauliche Dokumente mit erhöhtem Schutzbedarf</strong>: Lohnabrechnungen, Betreibungsauszug, Ausweis, Aufenthaltsbewilligung, Arbeitsvertrag, Bankverbindung, Haushaltsinformationen.</li>
              <li><strong>Navigationsdaten</strong>: IP-Adresse, Gerätetyp, Cookies, Werbe-IDs (Google Ads, Meta Pixel, TikTok Pixel — siehe §11).</li>
              <li><strong>Kommunikationsdaten</strong>: E-Mails, WhatsApp-Nachrichten, interne Messaging-Funktionen.</li>
            </ul>
            <p className="mt-4">Einige dieser Dokumente können besonders schützenswerte Personendaten im Sinne von Art. 5 lit. c revDSG enthalten oder offenbaren (insb. Betreibungen, Sanktionen, Daten aus der Intimsphäre). Wir wenden daher erhöhte Sicherheitsmassnahmen auf das gesamte Mieterdossier an.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Warum wir Ihre Dokumente erheben</h2>
            <p>Schweizer Liegenschaftsverwaltungen, Eigentümer und Vermieter verlangen vor jeder Wohnungsvergabe ein vollständiges Dossier. Ohne diese Dokumente wird Ihre Bewerbung in der Regel abgewiesen. Wir erheben sie ausschliesslich zum Aufbau, zur Prüfung und Übermittlung Ihres Dossiers in Ihrem Namen.</p>
            <div className="overflow-x-auto mt-5 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr className="text-left"><th className="p-3 font-semibold">Dokument</th><th className="p-3 font-semibold">Zweck</th><th className="p-3 font-semibold">Rechtfertigung / DSGVO-Grundlage soweit anwendbar</th></tr></thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="p-3 align-top"><strong>Lohnabrechnungen</strong></td><td className="p-3 align-top">Nachweis gegenüber Verwaltungen, dass Ihr Einkommen den üblichen Bonitätskriterien entspricht (Miete ≤ rund 1/3 Nettoeinkommen).</td><td className="p-3 align-top">Erforderlich zur Erfüllung des Mandats + ausdrückliche Einwilligung zur Weitergabe.</td></tr>
                  <tr><td className="p-3 align-top"><strong>Betreibungsauszug</strong></td><td className="p-3 align-top">Von Verwaltungen/Vermietern verlangtes Dokument zur Bonitätsprüfung und zur Feststellung laufender Verfahren.</td><td className="p-3 align-top">Erforderlich zur Erfüllung des Mandats + überwiegendes Interesse des Vermieters.</td></tr>
                  <tr><td className="p-3 align-top"><strong>Ausweis / Aufenthaltsbewilligung</strong></td><td className="p-3 align-top">Überprüfung Ihrer Identität und ggf. Aufenthaltssituation, um ein den üblichen Anforderungen entsprechendes Dossier zu erstellen.</td><td className="p-3 align-top">Erforderlich zur Erfüllung des Mandats + ausdrückliche Einwilligung zur Weitergabe.</td></tr>
                  <tr><td className="p-3 align-top"><strong>Arbeitsvertrag</strong></td><td className="p-3 align-top">Nachweis der Stabilität, des Beschäftigungsgrades und der Vertragsart.</td><td className="p-3 align-top">Erforderlich zur Erfüllung des Mandats.</td></tr>
                  <tr><td className="p-3 align-top"><strong>Bankverbindung</strong></td><td className="p-3 align-top">Einzug der Anzahlung von CHF 300, Buchhaltungsdokumente und ggf. Rückerstattung gemäss Mandat.</td><td className="p-3 align-top">Erforderlich zur Vertragsdurchführung.</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">Es steht Ihnen frei, diese Dokumente nicht zu übermitteln. In diesem Fall können wir das Suchmandat möglicherweise nicht ordnungsgemäss erfüllen, da kein Dossier erstellt werden kann, das den üblichen Anforderungen der Schweizer Verwaltungen, Eigentümer und Vermieter entspricht.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Empfänger und Auftragsbearbeiter</h2>
            <p>Ihre Daten können je nach Bedarf zugänglich sein für:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>das interne Team von Immo-rama.ch / Logisorama;</li>
              <li>mandatierte Agenten, die an Ihrer Suche beteiligt sind;</li>
              <li>Liegenschaftsverwaltungen, Eigentümer oder Vermieter, an die Ihr Dossier mit Ihrem Einverständnis weitergeleitet wird;</li>
              <li>technische Auftragsbearbeiter mit Vertraulichkeits- und Sicherheitsverpflichtungen.</li>
            </ul>
            <div className="overflow-x-auto mt-5 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr className="text-left"><th className="p-3 font-semibold">Anbieter</th><th className="p-3 font-semibold">Funktion</th><th className="p-3 font-semibold">Land / Region</th><th className="p-3 font-semibold">Betroffene Daten</th></tr></thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="p-3 align-top"><strong>Supabase</strong></td><td className="p-3 align-top">App-Hosting, Datenbank, Authentifizierung, sicherer Speicher</td><td className="p-3 align-top">EU oder andere Region je nach Konfiguration</td><td className="p-3 align-top">Kontodaten, Klientendossier, Belege, Suchstatus</td></tr>
                  <tr><td className="p-3 align-top"><strong>Resend</strong></td><td className="p-3 align-top">Transaktions-E-Mails und Benachrichtigungen</td><td className="p-3 align-top">Vertraglich zu prüfen</td><td className="p-3 align-top">E-Mail, Name, Inhalt der Benachrichtigungen</td></tr>
                  <tr><td className="p-3 align-top"><strong>AbaNinja</strong></td><td className="p-3 align-top">Fakturierung, Buchhaltung, Zahlungsverfolgung</td><td className="p-3 align-top">Schweiz</td><td className="p-3 align-top">Rechnungsdaten, Anzahlungen, Rückerstattungen, Vertragsinformationen</td></tr>
                  <tr><td className="p-3 align-top"><strong>Meta</strong></td><td className="p-3 align-top">Werbung, Konversionsmessung, Meta Pixel, WhatsApp Business ggf.</td><td className="p-3 align-top">CH / EU / USA je nach Dienst</td><td className="p-3 align-top">Marketingdaten, Werbe-IDs, WhatsApp-Nachrichten ggf.</td></tr>
                  <tr><td className="p-3 align-top"><strong>Google</strong></td><td className="p-3 align-top">Werbung, Analytics, Consent, Produktivitätstools/Speicher je nach Konfiguration</td><td className="p-3 align-top">CH / EU / USA je nach Dienst</td><td className="p-3 align-top">Navigationsdaten, Statistiken, E-Mails/Dokumente bei Google Workspace</td></tr>
                  <tr><td className="p-3 align-top"><strong>TikTok</strong></td><td className="p-3 align-top">Werbe-Pixel und Kampagnenmessung</td><td className="p-3 align-top">EU / USA / andere</td><td className="p-3 align-top">Werbe-IDs, Navigationsdaten, Konversionsereignisse</td></tr>
                  <tr><td className="p-3 align-top"><strong>WhatsApp Business</strong></td><td className="p-3 align-top">Kundenkommunikation, operative Nachverfolgung, Austausch zum Mandat</td><td className="p-3 align-top">CH / EU / USA je nach Meta-Diensten</td><td className="p-3 align-top">Nachrichten, Telefonnummer, freiwillig übermittelte Inhalte</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">Wir beschränken den Datenzugang auf das strikt Notwendige und wählen Anbieter mit angemessenen Garantien hinsichtlich Vertraulichkeit, Sicherheit und Datenschutz.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Internationale Datenübermittlungen</h2>
            <p>Bei Übermittlungen in die USA prüfen wir, ob der Anbieter unter dem <strong>Swiss-U.S. Data Privacy Framework</strong> und/oder dem <strong>EU-U.S. Data Privacy Framework</strong> zertifiziert ist (soweit die DSGVO anwendbar ist). Andernfalls verwenden wir vom EDÖB anerkannte Standardvertragsklauseln, ggf. ergänzt um zusätzliche technische Massnahmen.</p>
            <p className="mt-3">Manche technischen oder werblichen Anbieter können Daten aus Ländern verarbeiten, deren Schutzniveau dem schweizerischen oder europäischen nicht entspricht. In diesen Fällen treffen wir die erforderlichen vertraglichen, organisatorischen und technischen Garantien.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Aufbewahrungsdauer</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Aktives Klientendossier</strong>: für die gesamte Dauer des Mandats.</li>
              <li><strong>Buchhaltungs- und Vertragsdaten</strong>: 10 Jahre gemäss geltenden Buchführungspflichten.</li>
              <li><strong>Marketingdaten und Cookies</strong>: begrenzte Dauer je nach Zwecken und Einwilligung.</li>
            </ul>
            <p className="mt-3">Belege des Mieterdossiers (Lohnabrechnungen, Betreibungsauszug, Ausweis, Aufenthaltsbewilligung, Arbeitsvertrag) werden bei Mandatsabschluss gelöscht oder anonymisiert, vorbehaltlich gesetzlicher Aufbewahrungspflicht, laufenden Streitigkeiten, vertraglicher Anfechtung, Beweisbedarfs oder ausdrücklichen, gesetzlich zulässigen Verlangens der betroffenen Person.</p>
            <p className="mt-3">Technische Backups können bestimmte Daten vorübergehend enthalten, bis sie gemäss unserer internen Backup-Politik automatisch überschrieben werden.</p>
            <p className="mt-3">Wir wenden den Grundsatz der Datenminimierung an: Daten werden nur so lange aufbewahrt, wie es für die Zwecke ihrer Erhebung erforderlich ist, vorbehaltlich gesetzlicher Pflichten oder legitimer Beweisbedürfnisse.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Sicherheit</h2>
            <p>Gemäss Art. 8 revDSG treffen wir geeignete technische und organisatorische Massnahmen: Verschlüsselung bei Übertragung, ruhende Verschlüsselung soweit verfügbar, rollenbasierte Zugriffskontrolle, privater Speicher, Zugriffsprotokollierung und Sensibilisierung der Mitarbeitenden.</p>
            <p className="mt-3">Belege sind nur streng berechtigten Personen zugänglich. Der Zugriff ist rollenbasiert, protokolliert und wird widerrufen, sobald er nicht mehr erforderlich ist. Dokumente werden an Verwaltungen nach Möglichkeit über sicheren Link oder geschützten Bereich übermittelt.</p>
            <p className="mt-3">Wir vermeiden die Übermittlung von Lohnabrechnungen, Ausweisen oder Betreibungsauszügen über WhatsApp oder ungesicherte Kanäle, ausser auf ausdrücklichen Wunsch nach Risikohinweis.</p>
            <p className="mt-3">Da keine Sicherheitsmassnahme ein Nullrisiko garantieren kann, passen wir unsere Praktiken regelmässig an, um Risiken von unbefugtem Zugriff, Verlust, Veränderung oder versehentlicher Offenlegung zu reduzieren.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Datenpannen</h2>
            <p>Bei einer Verletzung der Datensicherheit, die voraussichtlich zu einem hohen Risiko für die betroffenen Personen führt, analysieren wir den Vorfall und melden ihn, soweit das Gesetz dies verlangt (Art. 24 revDSG), so rasch als möglich dem Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) sowie den betroffenen Personen, sofern dies zu deren Schutz erforderlich ist.</p>
            <p className="mt-3">Wir führen eine interne Dokumentation der Sicherheitsvorfälle, um Korrekturmassnahmen zu evaluieren und den Datenschutz fortlaufend zu verbessern.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Ihre Rechte</h2>
            <p>Gemäss Art. 25–32 revDSG haben Sie jederzeit das Recht auf Auskunft, Berichtigung, Löschung, Widerspruch, Datenportabilität, Widerruf der Einwilligung (ohne Rückwirkung) und das Recht, den EDÖB anzurufen.</p>
            <p className="mt-3">Für Personen in der Europäischen Union kann die DSGVO Anwendung finden, wenn unsere Dienste gezielt angeboten oder ihr Verhalten beobachtet wird. In diesem Fall wenden wir die DSGVO-Garantien an: Auskunft, Berichtigung, Löschung, Widerspruch, Einschränkung, Portabilität und Recht, keiner ausschliesslich automatisierten Entscheidung unterworfen zu sein.</p>
            <p className="mt-3">Zur Ausübung dieser Rechte schreiben Sie an <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a> mit Identitätsnachweis. Wir antworten innert 30 Tagen.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Automatisierte Einzelentscheidungen</h2>
            <p>Gemäss Art. 21 revDSG informieren wir Sie, dass unser internes Tool „AI-Relocation" eine automatisierte Vorsortierung von Wohnungsangeboten nach Ihren Kriterien durchführt. Keine endgültige vertragliche Entscheidung (Dossierversand, Vertragsunterzeichnung) wird ohne menschliche Beteiligung getroffen.</p>
            <p className="mt-3">AI-Relocation dient ausschliesslich der internen Organisation, dem Matching und der Vorsortierung. Es lehnt keine Klienten automatisch ab, entscheidet nicht eigenständig über den Versand eines Dossiers und ersetzt nicht die menschliche Analyse durch einen Agenten von Logisorama / Immo-rama.ch.</p>
            <p className="mt-3">Sie können jederzeit eine manuelle Überprüfung Ihrer Situation oder eines Ergebnisses verlangen.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Cookies und Werbe-Tracker</h2>
            <p>Die Website nutzt funktionale Cookies, die für den Betrieb erforderlich sind, und – mit Ihrer Einwilligung – Analyse- und Werbe-Cookies (Google Ads, Meta Pixel, TikTok Pixel).</p>
            <p className="mt-3">Das Consent-System sieht standardmässig die Ablehnung nicht notwendiger Cookies vor. Die Schaltfläche „Alle ablehnen" muss ebenso sichtbar und zugänglich sein wie „Alle akzeptieren". Sie können Ihre Einstellungen jederzeit über das Banner oder den Cookie-Verwaltungs-Link ändern.</p>
            <p className="mt-3">Eine ausführliche Cookie-Richtlinie (Cookie-Name, Anbieter, Zweck, Dauer, Kategorie, Land) kann in einer späteren Iteration veröffentlicht werden.</p>
            <p className="mt-3">Zum Datum der letzten Aktualisierung dieser Erklärung verwendet die Logisorama-Website weder Google reCAPTCHA noch Typo3. Hinweise auf diese Tools aus älteren Rechtsseiten gelten als obsolet.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Marketing-Profiling</h2>
            <p>Im Sinne von Art. 5 lit. f revDSG können wir Interessenten segmentieren (z. B. laufende Suche, unvollständiges Dossier, eingereichte Bewerbung, aktives Mandat, abgeschlossenes Mandat). Dieses Profiling dient ausschliesslich der Personalisierung unserer Kommunikation, der Verbesserung der Nachverfolgung und der Vermeidung irrelevanter Nachrichten. Es entfaltet keine rechtliche Wirkung Ihnen gegenüber und schliesst Sie nicht automatisch von einer Dienstleistung aus.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">13. Aufsichtsbehörde</h2>
            <p>Falls Sie der Ansicht sind, dass Ihre Rechte nicht respektiert werden, können Sie sich an den EDÖB wenden, Feldeggweg 1, 3003 Bern — <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.edoeb.admin.ch</a>.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">14. Änderungen</h2>
            <p>Diese Erklärung kann jederzeit aktualisiert werden, um rechtliche, technische oder organisatorische Entwicklungen widerzuspiegeln. Das Datum der letzten Aktualisierung steht oben.</p>
            <p className="mt-3">Bei wesentlichen Änderungen können wir die Nutzer per E-Mail, Benachrichtigung oder sichtbarem Hinweis auf der Website informieren.</p>
          </div>
        </section>

        <div className="mt-12 text-sm text-muted-foreground">
          <Link to="/de/impressum" className="text-primary hover:underline">Siehe auch das Impressum</Link>
        </div>
      </div>
    </main>
  );
}
