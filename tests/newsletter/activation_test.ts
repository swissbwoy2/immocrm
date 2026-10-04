import { assertEquals } from "jsr:@std/assert@1";
import { canActivateMandate } from "../../supabase/functions/_shared/mandate-activation.ts";
Deno.test("Activation : un compte existant ne dispense ni de signature ni d’activation", () => {
  const signed = {
    signature_data: "signature",
    cgv_acceptees: true,
    statut: "nouvelle",
  };
  assertEquals(canActivateMandate(null, false, false), false);
  assertEquals(canActivateMandate(signed, false, false), false);
  assertEquals(
    canActivateMandate({ ...signed, statut: "paye" }, false, false),
    false,
  );
  assertEquals(
    canActivateMandate(
      { ...signed, statut: "paye", date_paiement: "2026-10-04" },
      false,
      false,
    ),
    true,
  );
  assertEquals(
    canActivateMandate(
      {
        ...signed,
        statut: "paye",
        date_paiement: "2026-10-04",
        signature_data: "",
      },
      false,
      false,
    ),
    false,
  );
  assertEquals(canActivateMandate(signed, true, false), true);
  assertEquals(canActivateMandate(signed, true, true), false);
});
