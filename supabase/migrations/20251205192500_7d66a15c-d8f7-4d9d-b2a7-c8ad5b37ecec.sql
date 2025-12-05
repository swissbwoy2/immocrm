-- Fix existing admin-agent conversations missing from conversation_agents
INSERT INTO conversation_agents (conversation_id, agent_id)
SELECT c.id, c.agent_id::uuid
FROM conversations c
LEFT JOIN conversation_agents ca ON ca.conversation_id = c.id AND ca.agent_id::text = c.agent_id
WHERE c.conversation_type = 'admin-agent'
AND c.agent_id IS NOT NULL
AND ca.id IS NULL;