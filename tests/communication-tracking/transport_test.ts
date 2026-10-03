import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { trackedResendFetch, Resend } from '../../supabase/functions/_shared/tracked-resend.ts';
Deno.test('Resend instrumentation preserves recipients, attachments and headers; tracking failures do not block sending',async()=>{
 const original=globalThis.fetch;
 Deno.env.set('SUPABASE_URL','https://tracking-db.example.test');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-only');
 let sends:Record<string,unknown>[]=[];let dbFails=false;let inserts:Record<string,unknown>[]=[];
 globalThis.fetch=async(input,init)=>{
  const u=String(input);const payload=typeof init?.body==='string'?JSON.parse(init.body):null;
  if(u==='https://api.resend.com/emails'){sends.push(payload);return Response.json({id:'provider-test-id'});}
  if(!u.startsWith('https://tracking-db.example.test/'))throw new Error('Unexpected network request blocked');
  if(dbFails)return Response.json({message:'Test unavailable'},{status:503});
  if(u.includes('/lead_email_logs')&&init?.method==='POST'){inserts.push(payload);return Response.json({id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});}
  if(u.includes('/communication_links'))return Response.json(payload.map((r:Record<string,unknown>)=>({...r,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'})));
  return new Response(null,{status:204});
 };
 try {
  const send=trackedResendFetch('test');
  const payload={from:'support@logisorama.ch',to:['one@example.test'],subject:'Test',html:'<body><a href="https://logisorama.ch/login">Compte</a></body>',attachments:[{filename:'test.pdf',content:'dGVzdA=='}]};
  await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify(payload)});
  assert(String(sends[0].html).includes('track-email-open'));
  assert(String(sends[0].html).includes('?link=bbbbbbbb'));
  assertEquals(sends[0].attachments,payload.attachments);assertEquals(sends[0].to,payload.to);
  await send('https://api.resend.com/emails',{method:'POST',body:JSON.stringify({...payload,bcc:['copy@example.test']})});
  assertEquals(sends[1].html,payload.html);assertEquals(sends[1].bcc,['copy@example.test']);
  assertEquals(inserts.slice(1).map(x=>x.tracking_enabled),[false,false]);
  dbFails=true;
  await send('https://api.resend.com/emails',{method:'POST',body:JSON.stringify(payload)});
  assertEquals(sends[2].html,payload.html);
  dbFails=false;
  const sdk=new Resend('test-key','sdk-test');
  const response=await sdk.emails.send({...payload,headers:{'X-Custom':'keep'}});
  assertEquals(response.data?.id,'provider-test-id');assert(String(sends[3].html).includes('track-email-open'));
  assertEquals(sends[3].headers,{'X-Custom':'keep'});
 }finally{globalThis.fetch=original;Deno.env.delete('SUPABASE_URL');Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');}
});
