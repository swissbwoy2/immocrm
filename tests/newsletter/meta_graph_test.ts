import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { metaGraph, metaField } from "../../supabase/functions/_shared/meta-graph.ts";
Deno.test("Meta pagination authenticates without leaking token into URL",async()=>{
 let called=false;
 await metaGraph("https://graph.facebook.com/v21.0/123/leads?after=cursor&access_token=old-secret","new-secret",((u,init)=>{
   called=true; assertEquals(String(u),"https://graph.facebook.com/v21.0/123/leads?after=cursor");
   assertEquals(new Headers(init?.headers).get("Authorization"),"Bearer new-secret");
   return Promise.resolve(Response.json({data:[]}));
 }) as typeof fetch);
 assertEquals(called,true);
 await assertRejects(()=>metaGraph("https://example.com/leads","secret"));
});
Deno.test("Meta auth errors give recovery instruction and redact provider text",async()=>{
 const e=await assertRejects(()=>metaGraph("123?fields=name","secret",(()=>Promise.resolve(Response.json({error:{code:190,error_subcode:467,message:"private-token"}},{status:401}))) as typeof fetch));
 assertEquals(String(e).includes("réautoriser"),true); assertEquals(String(e).includes("private-token"),false);
});
Deno.test("Meta French contact aliases are imported",()=>{
 assertEquals(metaField([{name:"e-mail",values:["a@example.ch"]}],"email"),"a@example.ch");
 assertEquals(metaField([{name:"nom_complet",values:["Anne Test"]}],"full_name"),"Anne Test");
});
