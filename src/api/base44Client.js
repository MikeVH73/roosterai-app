import { db, auth, storage } from './firebaseClient';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

/**
 * Generic Firestore entity factory.
 * Implements the Base44 API surface so existing pages work without changes.
 */
function createEntity(collectionName) {
  const col = () => collection(db, collectionName);

  return {
    async list() {
      const snap = await getDocs(col());
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async filter(filters = {}) {
      // Special case: Firestore document IDs are not stored as fields.
      // When filtering by `id`, use getDoc instead of a where-query.
      if (filters.id) {
        const { id, ...rest } = filters;
        const snap = await getDoc(doc(db, collectionName, id));
        if (!snap.exists()) return [];
        const item = { id: snap.id, ...snap.data() };
        // Apply any remaining field filters
        const passes = Object.entries(rest).every(([k, v]) => item[k] === v);
        return passes ? [item] : [];
      }
      const constraints = Object.entries(filters).map(([k, v]) => where(k, '==', v));
      const q = constraints.length > 0 ? query(col(), ...constraints) : col();
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async get(id) {
      const snap = await getDoc(doc(db, collectionName, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    async create(data) {
      const payload = { ...data, created_date: serverTimestamp(), updated_date: serverTimestamp() };
      const ref = await addDoc(col(), payload);
      return { id: ref.id, ...data };
    },

    async update(id, data) {
      const payload = { ...data, updated_date: serverTimestamp() };
      await updateDoc(doc(db, collectionName, id), payload);
      return { id, ...data };
    },

    async delete(id) {
      await deleteDoc(doc(db, collectionName, id));
    },

    async bulkCreate(items) {
      return Promise.all(items.map((item) => this.create(item)));
    },
  };
}

export const base44 = {
  entities: {
    AISuggestion:        createEntity('ai_suggestions'),
    Company:             createEntity('companies'),
    CompanyMember:       createEntity('company_members'),
    CompanySettings:     createEntity('company_settings'),
    Department:          createEntity('departments'),
    DepartmentDaypart:   createEntity('department_dayparts'),
    EmployeeProfile:     createEntity('employee_profiles'),
    Function:            createEntity('functions'),
    Invitation:          createEntity('invitations'),
    LegalDocument:       createEntity('legal_documents'),
    Location:            createEntity('locations'),
    LocationType:        createEntity('location_types'),
    PasswordReset:       createEntity('password_resets'),
    Schedule:            createEntity('schedules'),
    Shift:               createEntity('shifts'),
    Skill:               createEntity('skills'),
    StaffingRequirement: createEntity('staffing_requirements'),
    SwapRequest:         createEntity('swap_requests'),
    VacationRequest:     createEntity('vacation_requests'),
    WhatsAppMessageLog:  createEntity('whatsapp_message_logs'),
  },

  auth: {
    me() {
      const u = auth.currentUser;
      return u ? { id: u.uid, email: u.email, name: u.displayName || u.email, avatar: u.photoURL } : null;
    },
    isAuthenticated() {
      return Promise.resolve(!!auth.currentUser);
    },
    redirectToLogin() {
      window.location.href = '/';
    },
    logout() {
      return signOut(auth);
    },
  },

  // Stub: logging (was Base44 platform feature, silently ignored)
  appLogs: {
    logUserInApp: () => Promise.resolve(),
  },

  functions: {
    invoke: async (name, payload) => {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      return { data };
    },
  },

  // Stub: LLM/AI integrations (will be replaced with Firebase Extension or Cloud Function)
  integrations: {
    Core: {
      InvokeLLM: (payload) => {
        console.warn('base44.integrations.Core.InvokeLLM called — not yet implemented');
        return Promise.resolve({ content: '' });
      },
    },
  },

  // Stub: AI Agents (was Base44 platform feature — to be replaced with Firebase/Claude API)
  agents: {
    getWhatsAppConnectURL: (agentName) => {
      console.warn(`base44.agents.getWhatsAppConnectURL('${agentName}') — not yet implemented`);
      return '#';
    },
    listConversations: () => Promise.resolve([]),
    getConversation: () => Promise.resolve(null),
    createConversation: (data) => Promise.resolve({ id: 'stub-' + Date.now(), messages: [], ...data }),
    addMessage: () => Promise.resolve(),
    updateConversation: () => Promise.resolve(),
    subscribeToConversation: (id, callback) => {
      // Return a no-op unsubscribe function
      return () => {};
    },
  },

  // Stub: File storage (to be replaced with Firebase Storage)
  storage: {
    upload: () => Promise.resolve({ url: '' }),
  },
};

export { db, auth, storage };
