// Gestion du localStorage pour ImmoCRM

import { 
  initialUsers, 
  initialAgents, 
  initialClients, 
  initialOffres,
  initialTransactions,
  initialMessages,
  initialConversations,
  User,
  Agent,
  Client,
  Offre,
  Transaction,
  Message,
  Conversation
} from '@/data/mockData';

// Initialiser les données si nécessaire
export function initializeLocalStorage() {
  if (!localStorage.getItem('immocrm-users')) {
    localStorage.setItem('immocrm-users', JSON.stringify(initialUsers));
  }
  if (!localStorage.getItem('immocrm-agents')) {
    localStorage.setItem('immocrm-agents', JSON.stringify(initialAgents));
  }
  if (!localStorage.getItem('immocrm-clients')) {
    localStorage.setItem('immocrm-clients', JSON.stringify(initialClients));
  }
  if (!localStorage.getItem('immocrm-offres')) {
    localStorage.setItem('immocrm-offres', JSON.stringify(initialOffres));
  }
  if (!localStorage.getItem('immocrm-transactions')) {
    localStorage.setItem('immocrm-transactions', JSON.stringify(initialTransactions));
  }
  if (!localStorage.getItem('immocrm-messages')) {
    localStorage.setItem('immocrm-messages', JSON.stringify(initialMessages));
  }
  if (!localStorage.getItem('immocrm-conversations')) {
    localStorage.setItem('immocrm-conversations', JSON.stringify(initialConversations));
  }
}

// Users
export function getUsers(): User[] {
  const data = localStorage.getItem('immocrm-users');
  return data ? JSON.parse(data) : [];
}

export function saveUsers(users: User[]) {
  localStorage.setItem('immocrm-users', JSON.stringify(users));
}

// Agents
export function getAgents(): Agent[] {
  const data = localStorage.getItem('immocrm-agents');
  return data ? JSON.parse(data) : [];
}

export function saveAgents(agents: Agent[]) {
  localStorage.setItem('immocrm-agents', JSON.stringify(agents));
}

// Clients
export function getClients(): Client[] {
  const data = localStorage.getItem('immocrm-clients');
  return data ? JSON.parse(data) : [];
}

export function saveClients(clients: Client[]) {
  localStorage.setItem('immocrm-clients', JSON.stringify(clients));
}

// Offres
export function getOffres(): Offre[] {
  const data = localStorage.getItem('immocrm-offres');
  return data ? JSON.parse(data) : [];
}

export function saveOffres(offres: Offre[]) {
  localStorage.setItem('immocrm-offres', JSON.stringify(offres));
}

// Transactions
export function getTransactions(): Transaction[] {
  const data = localStorage.getItem('immocrm-transactions');
  return data ? JSON.parse(data) : [];
}

export function saveTransactions(transactions: Transaction[]) {
  localStorage.setItem('immocrm-transactions', JSON.stringify(transactions));
}

// Messages
export function getMessages(): Message[] {
  const data = localStorage.getItem('immocrm-messages');
  return data ? JSON.parse(data) : [];
}

export function saveMessages(messages: Message[]) {
  localStorage.setItem('immocrm-messages', JSON.stringify(messages));
}

// Conversations
export function getConversations(): Conversation[] {
  const data = localStorage.getItem('immocrm-conversations');
  return data ? JSON.parse(data) : [];
}

export function saveConversations(conversations: Conversation[]) {
  localStorage.setItem('immocrm-conversations', JSON.stringify(conversations));
}

// Current User
export function getCurrentUser(): User | null {
  const data = localStorage.getItem('immocrm-current-user');
  return data ? JSON.parse(data) : null;
}

export function saveCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem('immocrm-current-user', JSON.stringify(user));
  } else {
    localStorage.removeItem('immocrm-current-user');
  }
}
