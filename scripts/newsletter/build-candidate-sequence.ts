import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CANDIDATE_NEWSLETTER_TEMPLATES, CANDIDATE_SEQUENCE_DAYS } from "../../src/features/newsletter/candidate-sequence.ts";

const output = resolve(process.argv[2] || "outputs/candidate-sequence");
await mkdir(output, { recursive: true });
const steps = CANDIDATE_NEWSLETTER_TEMPLATES.map(({ subject, preheader, html }) => ({ subject, preheader, html }));
await writeFile(resolve(output, "steps.json"), JSON.stringify(steps, null, 2));
for (const [index, template] of CANDIDATE_NEWSLETTER_TEMPLATES.entries()) {
  await writeFile(resolve(output, `${index + 1}.html`), template.html);
}
const sql = `-- Candidate conversion copy only: preserve cadence, audience, enrollment history and provider state.
-- Publish and verify /newsletter/candidats-2026-10 assets BEFORE applying this migration.
-- Do not reset pending/uncertain provider campaigns or re-enroll historical contacts.
update public.newsletter_sequences
set steps='${JSON.stringify(steps).replaceAll("'", "''")}'::jsonb, updated_at=now()
where category='renter';
`;
await writeFile(resolve("supabase/migrations/20261013120000_candidate_conversion_templates.sql"), sql);
await writeFile(resolve(output, "sequence.json"), JSON.stringify(CANDIDATE_NEWSLETTER_TEMPLATES.map((t, i) => ({ name: t.name, subject: t.subject, preheader: t.preheader, day: CANDIDATE_SEQUENCE_DAYS[i], image: t.image })), null, 2));
console.log(`6 emails, steps.json and migration generated. Preview files: ${output}`);
