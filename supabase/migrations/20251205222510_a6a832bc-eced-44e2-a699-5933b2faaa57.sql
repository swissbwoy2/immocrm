-- Augmenter les objectifs des agents
UPDATE default_agent_goals SET target_min = 5, target_max = 8 WHERE goal_type = 'offres';
UPDATE default_agent_goals SET target_min = 5, target_max = 8 WHERE goal_type = 'visites';
UPDATE default_agent_goals SET target_min = 7, target_max = 10 WHERE goal_type = 'candidatures';
UPDATE default_agent_goals SET target_min = 4, target_max = 6 WHERE goal_type = 'offres_par_client';
UPDATE default_agent_goals SET target_min = 2, target_max = 3 WHERE goal_type = 'visites_par_client';
UPDATE default_agent_goals SET target_min = 2, target_max = 4 WHERE goal_type = 'dossiers_par_client';
UPDATE default_agent_goals SET target_min = 2, target_max = 5 WHERE goal_type = 'transactions';