import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = 'June 8, 2026';

export default function PrivacyPolicyEN() {
  useEffect(() => {
    document.title = 'Privacy policy — Logisorama by Immo-rama.ch';
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="text-xs text-muted-foreground mb-6 flex gap-3">
          <Link to="/politique-confidentialite" className="hover:text-primary">FR</Link>
          <span className="text-primary font-semibold">EN</span>
          <Link to="/de/datenschutz" className="hover:text-primary">DE</Link>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary shrink-0 mt-1" />
          <div>
            <h1 className="text-4xl font-bold">Privacy policy</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Aligned with the revised Swiss FADP (in force since 1 September 2023) and the GDPR
              where it applies to data subjects in the European Union — Last updated: {LAST_UPDATE}
            </p>
          </div>
        </div>

        <p className="mb-8">
          At Logisorama, protecting your personal data is a priority. This policy explains what data we
          collect, why, how we use it and what your rights are. In particular, it details why we request
          certain confidential documents (pay slips, debt collection extract, ID, residence permit,
          employment contract), required to build a tenant file accepted by Swiss agencies, owners and landlords.
        </p>

        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Data controller</h2>
            <p>Pursuant to art. 5 let. j FADP:</p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch</strong> — sole proprietorship</li>
              <li>Owner and contact: <strong>Christ Ramazani</strong></li>
              <li>Chemin de l'Esparcette 5, 1023 Crissier, Switzerland</li>
              <li>UID: CHE-442.303.796</li>
              <li>Email: <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Categories of data collected</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Identity and contact data</strong>: surname, first name, date of birth, nationality, marital status, address, phone, email.</li>
              <li><strong>Contractual and financial data</strong>: income, professional situation, bank details (deposit/refund), mandate history.</li>
              <li><strong>Confidential documents requiring high protection</strong>: pay slips, debt collection extract, ID, residence permit, employment contract, bank details, household information.</li>
              <li><strong>Browsing data</strong>: IP address, device type, cookies, advertising identifiers (Google Ads, Meta Pixel, TikTok Pixel — see §11).</li>
              <li><strong>Communication data</strong>: emails, WhatsApp messages, in-app messaging.</li>
            </ul>
            <p className="mt-4">Some of these documents may contain or reveal sensitive personal data within the meaning of art. 5 let. c FADP, notably information related to debt enforcement, sanctions or intimate sphere. We therefore apply enhanced security to the entire tenant file.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Why we collect your documents</h2>
            <p>Swiss real estate agencies, owners and landlords require a complete file before allocating housing. Without these documents, your application is usually rejected. We collect them solely to build, verify and submit your file on your behalf.</p>
            <div className="overflow-x-auto mt-5 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Document</th>
                    <th className="p-3 font-semibold">Purpose</th>
                    <th className="p-3 font-semibold">Justification / GDPR basis if applicable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="p-3 align-top"><strong>Pay slips</strong></td><td className="p-3 align-top">Prove to agencies that your income meets standard solvency criteria (rent ≤ ~1/3 net household income).</td><td className="p-3 align-top">Necessary for mandate performance + explicit consent for transmission to agencies.</td></tr>
                  <tr><td className="p-3 align-top"><strong>Debt collection extract</strong></td><td className="p-3 align-top">Required by agencies/owners to assess solvency and any recovery proceedings.</td><td className="p-3 align-top">Necessary for mandate performance + landlord's overriding interest.</td></tr>
                  <tr><td className="p-3 align-top"><strong>ID / residence permit</strong></td><td className="p-3 align-top">Verify your identity and, where applicable, your residence situation, to build a file matching Swiss agencies' standard requirements.</td><td className="p-3 align-top">Necessary for mandate performance + explicit consent for transmission.</td></tr>
                  <tr><td className="p-3 align-top"><strong>Employment contract</strong></td><td className="p-3 align-top">Demonstrate job stability, activity rate, contract type.</td><td className="p-3 align-top">Necessary for mandate performance.</td></tr>
                  <tr><td className="p-3 align-top"><strong>Bank details</strong></td><td className="p-3 align-top">Collect the CHF 300 deposit, issue accounting documents and, where applicable, process refunds under the mandate.</td><td className="p-3 align-top">Necessary for contract performance.</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">You remain free not to share these documents. In that case, we may not be able to properly perform the search mandate, since we could not build a file matching Swiss agencies', owners' and landlords' usual requirements.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Recipients and processors</h2>
            <p>Your data may be accessed by:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>the Immo-rama.ch / Logisorama internal team;</li>
              <li>agents involved in your search;</li>
              <li>real estate agencies, owners or landlords to whom your file is forwarded with your consent;</li>
              <li>technical processors bound by confidentiality and security commitments.</li>
            </ul>
            <div className="overflow-x-auto mt-5 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted"><tr className="text-left"><th className="p-3 font-semibold">Processor</th><th className="p-3 font-semibold">Function</th><th className="p-3 font-semibold">Country / region</th><th className="p-3 font-semibold">Data concerned</th></tr></thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="p-3 align-top"><strong>Supabase</strong></td><td className="p-3 align-top">App hosting, database, auth, secure storage</td><td className="p-3 align-top">EU or other region per configuration</td><td className="p-3 align-top">Account data, client file, supporting documents, search statuses</td></tr>
                  <tr><td className="p-3 align-top"><strong>Resend</strong></td><td className="p-3 align-top">Transactional email and notifications</td><td className="p-3 align-top">To be verified per contract</td><td className="p-3 align-top">Email, name, notification content</td></tr>
                  <tr><td className="p-3 align-top"><strong>AbaNinja</strong></td><td className="p-3 align-top">Invoicing, accounting, payment tracking</td><td className="p-3 align-top">Switzerland</td><td className="p-3 align-top">Billing data, deposits, refunds, contractual info</td></tr>
                  <tr><td className="p-3 align-top"><strong>Meta</strong></td><td className="p-3 align-top">Advertising, conversion measurement, Meta Pixel, WhatsApp Business if applicable</td><td className="p-3 align-top">CH / EU / US per service</td><td className="p-3 align-top">Marketing data, advertising IDs, WhatsApp messages if used</td></tr>
                  <tr><td className="p-3 align-top"><strong>Google</strong></td><td className="p-3 align-top">Advertising, analytics, consent, productivity tools or storage per configuration</td><td className="p-3 align-top">CH / EU / US per service</td><td className="p-3 align-top">Browsing data, statistics, emails/documents if Google Workspace is used</td></tr>
                  <tr><td className="p-3 align-top"><strong>TikTok</strong></td><td className="p-3 align-top">Advertising pixel and campaign measurement</td><td className="p-3 align-top">EU / US / other</td><td className="p-3 align-top">Advertising IDs, browsing data, conversion events</td></tr>
                  <tr><td className="p-3 align-top"><strong>WhatsApp Business</strong></td><td className="p-3 align-top">Client communication, operational follow-up, exchanges related to the mandate</td><td className="p-3 align-top">CH / EU / US per Meta services</td><td className="p-3 align-top">Messages, phone number, content voluntarily provided by the client</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">We limit data access to what is strictly necessary and select processors offering appropriate guarantees on confidentiality, security and data protection.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. International data transfers</h2>
            <p>When data is transferred to the United States, we verify whether the processor is certified under the <strong>Swiss-U.S. Data Privacy Framework</strong> and/or the <strong>EU-U.S. Data Privacy Framework</strong> where the GDPR applies. Otherwise we rely on Standard Contractual Clauses recognised by the FDPIC, with additional technical measures where needed.</p>
            <p className="mt-3">Some technical or advertising processors may process data from countries without a level of protection equivalent to Switzerland or the EU. In such cases we put in place appropriate contractual, organisational and technical safeguards when required.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Retention</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Active client file</strong>: for the duration of the mandate.</li>
              <li><strong>Accounting and contractual data</strong>: 10 years per applicable accounting obligations.</li>
              <li><strong>Marketing data and cookies</strong>: limited duration per purposes and consent.</li>
            </ul>
            <p className="mt-3">Tenant supporting documents (pay slips, debt collection extract, ID, residence permit, employment contract) are deleted or anonymised at mandate closure, unless a legal retention obligation, ongoing dispute, contractual contest, evidentiary need or express request from the data subject (compatible with the law) applies.</p>
            <p className="mt-3">Technical backups may temporarily contain data for a limited period before automatic overwriting per our internal backup policy.</p>
            <p className="mt-3">We apply the data-minimisation principle: data is kept only as long as necessary for the purposes for which it was collected, subject to legal obligations or legitimate evidentiary needs.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Security</h2>
            <p>Pursuant to art. 8 FADP, we apply appropriate technical and organisational measures: in-transit encryption, at-rest encryption where available, role-based access control, private storage, access logging and staff awareness.</p>
            <p className="mt-3">Supporting documents are accessible only to strictly authorised persons. Access is role-based, logged and revoked as soon as it is no longer necessary. Documents are forwarded to agencies via secure link or protected space where technically possible.</p>
            <p className="mt-3">We avoid transmitting pay slips, ID or debt collection extracts via WhatsApp or unsecured messaging, except at the data subject's express request after risk disclosure.</p>
            <p className="mt-3">Since no security measure can guarantee zero risk, we regularly adapt our practices to reduce risks of unauthorised access, loss, alteration or accidental disclosure.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Data breaches</h2>
            <p>In case of a security breach likely to entail a high risk for the data subjects, we analyse the incident and, where the law so requires (art. 24 FADP), notify the Federal Data Protection and Information Commissioner (FDPIC) without undue delay, and the data subjects where necessary for their protection.</p>
            <p className="mt-3">We maintain internal documentation of security incidents to assess corrective actions and continuously improve data protection.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Your rights</h2>
            <p>Pursuant to art. 25–32 FADP, you have at any time the right of access, rectification, deletion, objection, portability, withdrawal of consent (without retroactive effect) and the right to lodge a complaint with the FDPIC.</p>
            <p className="mt-3">For data subjects located in the European Union, the GDPR may apply where our services are specifically offered to them or their behaviour is monitored. In that case we apply GDPR safeguards: access, rectification, erasure, objection, restriction, portability and the right not to be subject to a fully automated decision.</p>
            <p className="mt-3">To exercise these rights, email <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a> with proof of identity. We reply within 30 days.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Automated individual decisions</h2>
            <p>Pursuant to art. 21 FADP, our internal “AI-Relocation” tool performs automated pre-sorting of housing opportunities based on your criteria. No final contractual decision (sending a file, signing a lease) is made without human intervention.</p>
            <p className="mt-3">AI-Relocation is solely an aid for internal organisation, matching and pre-sorting. It does not automatically reject a client, does not decide alone to submit a file and does not replace human analysis by a Logisorama / Immo-rama.ch agent.</p>
            <p className="mt-3">You may request manual review of any situation or result concerning you at any time.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Cookies and advertising trackers</h2>
            <p>The site uses functional cookies necessary to operation and, subject to your consent, analytics and advertising cookies (Google Ads, Meta Pixel, TikTok Pixel).</p>
            <p className="mt-3">The consent system defaults to refusing non-essential cookies. The “Reject all” button must be as visible and accessible as “Accept all”. You can change your preferences at any time via the banner or the cookie-management link.</p>
            <p className="mt-3">A detailed cookie policy (cookie name, provider, purpose, duration, category, country) may be published in a future iteration.</p>
            <p className="mt-3">As of the last update of this policy, the Logisorama site does not use Google reCAPTCHA or Typo3. Any reference to these tools from previous legal pages is obsolete and shall not be relied upon.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Marketing profiling</h2>
            <p>Under art. 5 let. f FADP, we may segment prospects (e.g. searching, incomplete file, application submitted, active mandate, closed). This profiling solely aims at personalising communications, improving follow-up and avoiding irrelevant messages. It produces no legal effect concerning you and does not automatically exclude you from any service.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">13. Supervisory authority</h2>
            <p>If you consider your rights are not respected, you may contact the FDPIC, Feldeggweg 1, 3003 Bern — <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.edoeb.admin.ch</a>.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">14. Changes</h2>
            <p>This policy may be updated at any time to reflect legal, technical or organisational developments. The last-updated date appears at the top.</p>
            <p className="mt-3">In case of a material change, we may inform users by email, notification or a visible notice on the site.</p>
          </div>
        </section>

        <div className="mt-12 text-sm text-muted-foreground">
          <Link to="/en/legal-notice" className="text-primary hover:underline">See also the Legal Notice</Link>
        </div>
      </div>
    </main>
  );
}
