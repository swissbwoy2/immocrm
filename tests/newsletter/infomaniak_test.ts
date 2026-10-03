import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "jsr:@std/assert@1";
import {
  groupRecipients,
  Infomaniak,
  infomaniakHtml,
  immediateScheduleStart,
  sameAudience,
} from "../../supabase/functions/_shared/newsletter-infomaniak.ts";
const config = {
  api_key: "private-test-key",
  domain_id: 123,
  sender_email: "support@example.ch",
  sender_name: "Logisorama",
};
const response = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
Deno.test('Infomaniak : la programmation reste future après le délai réseau', () => {
  const now = 1791051400999;
  const start = immediateScheduleStart(now);
  assertEquals(Number.isInteger(start), true);
  assertEquals(start, Math.floor(now / 1000) + 120);
  assertEquals(start > Math.ceil((now + 30000) / 1000), true);
});
Deno.test('Infomaniak : erreurs de validation exposent les champs sans leurs valeurs', async () => {
  const api = new Infomaniak(config, (() => Promise.resolve(new Response(JSON.stringify({
    result: 'error', error: {code:'validation_failed', errors:[{context:{attribute:'started_at', value:config.api_key},description:config.api_key}]}
  }), {status:422}))) as typeof fetch, 0);
  const error=await assertRejects(()=>api.call('/campaigns/42/schedule','PUT',{}));
  assertStringIncludes(String(error), 'started_at');
  assertEquals(String(error).includes(config.api_key), false);
});
Deno.test("Infomaniak : les lectures avec expansions ne déclarent pas de corps JSON", async () => {
  const requests: { method?: string; headers: Headers; body: unknown }[] = [];
  const api = new Infomaniak(config, ((_input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ method: init?.method, headers: new Headers(init?.headers), body: init?.body });
    return Promise.resolve(response({ result: "success", data: {} }));
  }) as typeof fetch, 0);
  await api.call('/campaigns/42?with=content,recipients');
  await api.call('/campaigns/42', 'PUT', { subject: 'Visite annulée' });
  assertEquals(requests[0].method, 'GET');
  assertEquals(requests[0].headers.get('Content-Type'), null);
  assertEquals(requests[0].headers.get('Accept'), 'application/json');
  assertEquals(requests[0].body, undefined);
  assertEquals(requests[1].headers.get('Content-Type'), 'application/json');
  assertEquals(requests[1].body, JSON.stringify({ subject: 'Visite annulée' }));
});
Deno.test("Infomaniak : attente DNS et mauvais expéditeur bloquent l’envoi", async () => {
  for (
    const domain of [{
      name: "example.ch",
      status: "waiting",
      can_use_other_domains: false,
    }, { name: "other.ch", status: "enabled", can_use_other_domains: false }]
  ) {
    const api = new Infomaniak(
      config,
      (() =>
        Promise.resolve(
          response({ result: "success", data: domain }),
        )) as typeof fetch,
      0,
    );
    await assertRejects(() => api.assertReady());
  }
});
Deno.test("Infomaniak : pagination complète, états conservés, erreur sans secret", async () => {
  let page = 0;
  const api = new Infomaniak(
    config,
    ((input: RequestInfo | URL, init?: RequestInit) => {
      assertStringIncludes(String(input), "filter%5Bstatus%5D=all");
      assertEquals(
        (init?.headers as Record<string, string>).Authorization,
        "Bearer private-test-key",
      );
      page++;
      return Promise.resolve(
        response({
          result: "success",
          data: [{
            id: page,
            email: `CONTACT${page}@example.ch`,
            status: page === 1 ? "unsubscribed" : "active",
          }],
          page,
          pages: 2,
          total: 2,
        }),
      );
    }) as typeof fetch,
    0,
  );
  assertEquals((await api.subscribers()).map((x) => [x.email, x.status]), [[
    "contact1@example.ch",
    "unsubscribed",
  ], ["contact2@example.ch", "active"]]);
  const broken = new Infomaniak(
    config,
    (() =>
      Promise.resolve(
        response({ result: "success", data: [] }),
      )) as typeof fetch,
    0,
  );
  await assertRejects(() => broken.subscribers());
  const denied = new Infomaniak(
    config,
    (() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            result: "error",
            error: { code: "not_authorized", description: config.api_key },
          }),
          { status: 401 },
        ),
      )) as typeof fetch,
    0,
  );
  const error = await assertRejects(() => denied.call(""));
  assertEquals(String(error).includes(config.api_key), false);
});
Deno.test("Ciblage Infomaniak : groupe unique, aucune audience globale, lien fournisseur", () => {
  assertEquals(groupRecipients(42), {
    all_subscribers: false,
    groups: { include: [42], exclude: [] },
    segments: { include: [], exclude: [] },
    expert: { id: 0, conditions: null },
  });
  assertEquals(sameAudience(["a", "b"], ["b", "a"]), true);
  for (const actual of [[], ["a"], ["a", "a"], ["a", "b", "c"]]) {
    assertEquals(sameAudience(["a", "b"], actual), false);
  }
  assertEquals(
    infomaniakHtml(
      '<p>Bonjour</p><a href="{{unsubscribe_url}}">Quitter</a><a href="https://logisorama.ch/nouveau-mandat">CTA</a>',
    ),
    '<p>Bonjour</p><a href="https://logisorama.ch/nouveau-mandat">CTA</a>',
  );
});
