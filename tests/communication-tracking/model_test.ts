import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  emailLinks,
  trackableUrl,
  trackedHtml,
} from "../../supabase/functions/_shared/communication-html.ts";
import {
  elapsed,
  rate,
  type TrackingRow,
  trackingStatus,
} from "../../src/features/newsletter/tracking-model.ts";
import { activityRows } from "../../supabase/functions/_shared/communication-sync.ts";
Deno.test("tracking preserves URLs, apostrophes, encoded parameters, safety links and fragment actions", () => {
  const html =
    `<body><a href="https://logisorama.ch/login?a=1&amp;b=2#x">Compte</a><a href='https://example.org/hello'>Externe</a><a href="mailto:a@example.test">Contact</a><a href="https://logisorama.ch/unsubscribe?token=123">Stop</a><a href="https://logisorama.ch/sign?token=456">Signer</a><a href="#intro">Intro</a></body>`;
  const links = emailLinks(html);
  assertEquals(links, [
    "https://logisorama.ch/login?a=1&b=2#x",
    "https://example.org/hello",
  ]);
  const result = trackedHtml(
    html,
    "https://tracking.example.test",
    "123",
    new Map(links.map((v, i) => [v, `opaque-${i}`])),
  );
  assert(result.includes("track-email-click?link=opaque-0"));
  assert(result.includes("sign?token=456"));
  assert(result.includes("unsubscribe?token=123"));
  assertEquals((result.match(/track-email-open/g) || []).length, 1);
  assertEquals(
    trackedHtml(result, "https://tracking.example.test", "123", new Map()),
    result,
  );
  assertEquals(trackableUrl("javascript:alert(1)"), null);
  assertEquals(trackableUrl("https://user:pass@example.org"), null);
});
Deno.test("email status never infers reading or delivery from openings", () => {
  const r = {
    status: "sent",
    sent_at: "2026-10-03T07:00:00Z",
    opens_count: 2,
    clicks_count: 0,
    channel: "email",
  } as TrackingRow;
  assertEquals(trackingStatus(r), "Ouvert");
  assertEquals(trackingStatus({ ...r, bounced_at: r.sent_at }), "Rejeté");
  assertEquals(trackingStatus({ ...r, opens_count: 0 }), "Envoyé");
  assertEquals(
    trackingStatus({
      ...r,
      opens_count: 0,
      channel: "notification",
      is_read: true,
    }),
    "Marquée lue",
  );
  assertEquals(rate(0, 0), "Non mesuré");
  assertEquals(elapsed(null, r.sent_at), "Non disponible");
  assertEquals(elapsed(r.sent_at, "2026-10-03T07:05:01Z"), "5 min");
  assertEquals(elapsed(r.sent_at, "2026-10-02T07:05:01Z"), "Non disponible");
});
Deno.test("Infomaniak counters reject incomplete reports instead of inventing zero values", () => {
  assertEquals(
    activityRows([{
      email: "Example@EXAMPLE.TEST",
      open_count: "2",
      click_count: 1,
    }]),
    [{ email: "example@example.test", open_count: 2, click_count: 1 }],
  );
  assertThrows(() =>
    activityRows([{
      email: "test@example.test",
      open_count: null,
      click_count: 0,
    }])
  );
  assertThrows(() =>
    activityRows([{
      email: "test@example.test",
      open_count: 0,
      click_count: -1,
    }])
  );
  assertThrows(() => activityRows({ data: [] }));
});

Deno.test('Infomaniak campaigns enable open and click tracking without broadening recipients',async()=>{
 const {Infomaniak}=await import('../../supabase/functions/_shared/newsletter-infomaniak.ts');
 const provider=new Infomaniak({api_key:'test-only',domain_id:1,sender_name:'Logisorama',sender_email:'support@logisorama.ch'});
 const payload=provider.campaignBody('Test','<p>Bonjour</p>','support@logisorama.ch');
 assertEquals(payload.tracking_link,true);assertEquals(payload.tracking_opening,true);
 assert(!('recipients' in payload));
});
