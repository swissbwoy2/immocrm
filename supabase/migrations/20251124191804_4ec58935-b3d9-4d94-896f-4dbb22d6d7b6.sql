-- Ajouter une colonne offre_id dans messages pour lier à une offre
ALTER TABLE messages 
ADD COLUMN offre_id uuid REFERENCES offres(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX idx_messages_offre_id ON messages(offre_id);