import { supabase } from '@/api/supabaseClient';

const ENTITY_TABLES = {
  ClassGroup: 'class_groups',
  ClassLearner: 'class_learners',
  ClassObservation: 'class_observations',
  LearnerObservation: 'learner_observations',
  NeedGroup: 'need_groups',
  ClassMapResult: 'class_map_results',
  ClassReport: 'class_reports',
  SubjectTemplate: 'subject_templates',
  CustomSubject: 'custom_subjects',
};

function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  const column = desc ? sort.slice(1) : sort;
  return query.order(column, { ascending: !desc });
}

function queryEntity(table) {
  return {
    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    async bulkCreate(items) {
      const { data, error } = await supabase.from(table).insert(items).select();
      if (error) throw error;
      return data ?? [];
    },
    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },
    async list(sort, limit = 100) {
      let query = supabase.from(table).select('*');
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    async filter(filters = {}, sort, limit) {
      let query = supabase.from(table).select('*');
      Object.entries(filters || {}).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  };
}

const entities = Object.fromEntries(
  Object.entries(ENTITY_TABLES).map(([name, table]) => [name, queryEntity(table)])
);

const auth = {
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Not authenticated');
    return data.user;
  },
  async loginViaEmailPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return true;
  },
  async register({ email, password }) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return true;
  },
  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' });
    if (error) throw error;
    return { access_token: data.session?.access_token ?? null };
  },
  setToken() {
    return true;
  },
  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
    return true;
  },
  loginWithProvider(provider, redirectPath = '/') {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return true;
  },
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  },
  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },
  redirectToLogin(returnTo = '/') {
    window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
  },
};

const integrations = {
  Core: {
    async InvokeLLM({ prompt }) {
      try {
        const { data, error } = await supabase.functions.invoke('invoke-llm', { body: { prompt } });
        if (error) throw error;
        return data;
      } catch {
        return { text: 'LLM response unavailable. Please configure the invoke-llm function in Supabase.' };
      }
    },
  },
};

export const base44 = { entities, auth, integrations };
