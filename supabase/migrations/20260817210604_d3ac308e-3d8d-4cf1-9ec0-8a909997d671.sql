UPDATE public.notifications n
SET link = '/appel?call=' || COALESCE(n.metadata->>'conversationId', n.metadata->>'conversation_id')
           || '&conversationId=' || COALESCE(n.metadata->>'conversationId', n.metadata->>'conversation_id')
           || COALESCE('&mode=' || (n.metadata->>'mode'), '')
WHERE n.type IN ('call_incoming','call_invite')
  AND COALESCE(n.metadata->>'conversationId', n.metadata->>'conversation_id') IS NOT NULL
  AND (n.link IS NULL OR n.link NOT LIKE '/appel%');