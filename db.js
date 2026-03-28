/**
 * db.js — Flowta Data Access Layer (Supabase)
 * Menyediakan fungsi async CRUD untuk semua tabel.
 * Include setelah supabase CDN di setiap HTML.
 */

const SUPABASE_URL = 'https://bmljbfqmrslqctaibayl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtbGpiZnFtcnNscWN0YWliYXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NjE3ODEsImV4cCI6MjA5MDIzNzc4MX0.FZ2cdmcmXfHAlCtQ6m0mTqSKLB4VsnaFz4-rXQrf8C0';

// Initialize the client — will be set after supabase lib loads
let _supabase = null;

function getSupabase() {
    if (!_supabase) {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            console.error('Supabase JS library not loaded. Make sure to include the CDN script before db.js');
            return null;
        }
    }
    return _supabase;
}

// ═══════════ HELPER ═══════════
function genId(prefix = 'ID') {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

// ═══════════ DEPARTMENTS ═══════════
const db = {
    // --- Departments ---
    async getDepartments() {
        const { data, error } = await getSupabase().from('departments').select('*').order('created_at');
        if (error) { console.error('getDepartments:', error); return []; }
        // Map to localStorage format
        return data.map(d => ({
            id: d.id, name: d.name, phone: d.phone || '', wa: d.wa || '',
            email: d.email || '', token: d.token ?? 999, address: d.address || '',
            desc: d.description || '', logo: d.logo || ''
        }));
    },

    async saveDepartment(dept) {
        const row = {
            id: dept.id, name: dept.name, phone: dept.phone || '', wa: dept.wa || '',
            email: dept.email || '', token: dept.token ?? 999, address: dept.address || '',
            description: dept.desc || '', logo: dept.logo || ''
        };
        const { error } = await getSupabase().from('departments').upsert(row, { onConflict: 'id' });
        if (error) console.error('saveDepartment:', error);
        return !error;
    },

    async deleteDepartment(id) {
        const { error } = await getSupabase().from('departments').delete().eq('id', id);
        if (error) console.error('deleteDepartment:', error);
        return !error;
    },

    async updateDeptToken(deptId, newToken) {
        const { error } = await getSupabase().from('departments').update({ token: newToken }).eq('id', deptId);
        if (error) console.error('updateDeptToken:', error);
        return !error;
    },

    // --- Users ---
    async getUsers(deptId = null) {
        let q = getSupabase().from('users').select('*').order('created_at');
        if (deptId) q = q.eq('dept_id', deptId);
        const { data, error } = await q;
        if (error) { console.error('getUsers:', error); return []; }
        return data.map(u => ({
            id: u.id, name: u.name, username: u.username, password: u.password,
            role: u.role, deptId: u.dept_id
        }));
    },

    async saveUser(user) {
        const row = {
            id: user.id, name: user.name, username: user.username,
            password: user.password, role: user.role, dept_id: user.deptId || null
        };
        const { error } = await getSupabase().from('users').upsert(row, { onConflict: 'id' });
        if (error) console.error('saveUser:', error);
        return !error;
    },

    async deleteUser(id) {
        const { error } = await getSupabase().from('users').delete().eq('id', id);
        if (error) console.error('deleteUser:', error);
        return !error;
    },

    async login(username, password) {
        const { data, error } = await getSupabase().from('users').select('*')
            .eq('username', username).eq('password', password).maybeSingle();
        if (error) { console.error('login:', error); return null; }
        if (!data) return null;
        return { id: data.id, name: data.name, username: data.username, password: data.password, role: data.role, deptId: data.dept_id };
    },

    async getUserById(id) {
        const { data, error } = await getSupabase().from('users').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return { id: data.id, name: data.name, username: data.username, password: data.password, role: data.role, deptId: data.dept_id };
    },

    // --- Phases ---
    async getPhases(deptId = null) {
        let q = getSupabase().from('phases').select('*').order('sort_order');
        if (deptId) q = q.eq('dept_id', deptId);
        const { data, error } = await q;
        if (error) { console.error('getPhases:', error); return []; }
        return data.map(p => ({
            id: p.id, title: p.title, desc: p.description || '', icon: p.icon || 'build',
            colorClass: p.color_class || 'primary', status: p.status || 'BELUM MULAI',
            statusColor: p.status_color || 'slate', deptId: p.dept_id
        }));
    },

    async savePhase(phase) {
        const row = {
            id: phase.id, title: phase.title, description: phase.desc || '',
            icon: phase.icon || 'build', color_class: phase.colorClass || 'primary',
            status: phase.status || 'BELUM MULAI', status_color: phase.statusColor || 'slate',
            sort_order: phase.sortOrder ?? 0, dept_id: phase.deptId || null
        };
        const { error } = await getSupabase().from('phases').upsert(row, { onConflict: 'id' });
        if (error) console.error('savePhase:', error);
        return !error;
    },

    async updatePhaseOrder(phases) {
        // Bulk update sort_order
        for (let i = 0; i < phases.length; i++) {
            await getSupabase().from('phases').update({ sort_order: i }).eq('id', phases[i].id);
        }
    },

    async deletePhase(id) {
        const { error } = await getSupabase().from('phases').delete().eq('id', id);
        if (error) console.error('deletePhase:', error);
        return !error;
    },

    // --- Kanban Cards ---
    async getCards(deptId = null) {
        let q = getSupabase().from('kanban_cards').select('*').order('created_at', { ascending: false });
        if (deptId) q = q.eq('dept_id', deptId);
        const { data, error } = await q;
        if (error) { console.error('getCards:', error); return []; }
        return data.map(c => ({
            id: c.id, phaseId: c.phase_id, title: c.title, type: c.type || '',
            client: c.client || '', spkNumber: c.spk_number || '',
            projectType: c.project_type || 'NORMAL', tagDesc: c.tag_desc || '',
            tagColor: c.tag_color || 'indigo', dueDateDesc: c.due_date_desc || '',
            dueColor: c.due_color || 'slate', dueDate: c.due_date || '',
            priority: c.priority || 'Normal', priorityIcon: c.priority_icon || 'drag_handle',
            status: c.status || 'PROSES', description: c.description || '',
            createdAt: c.created_at, deptId: c.dept_id
        }));
    },

    async getCardById(id) {
        const { data, error } = await getSupabase().from('kanban_cards').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        const c = data;
        return {
            id: c.id, phaseId: c.phase_id, title: c.title, type: c.type || '',
            client: c.client || '', spkNumber: c.spk_number || '',
            projectType: c.project_type || 'NORMAL', tagDesc: c.tag_desc || '',
            tagColor: c.tag_color || 'indigo', dueDateDesc: c.due_date_desc || '',
            dueColor: c.due_color || 'slate', dueDate: c.due_date || '',
            priority: c.priority || 'Normal', priorityIcon: c.priority_icon || 'drag_handle',
            status: c.status || 'PROSES', description: c.description || '',
            createdAt: c.created_at, deptId: c.dept_id
        };
    },

    async saveCard(card) {
        const row = {
            id: card.id, phase_id: card.phaseId, title: card.title, type: card.type || '',
            client: card.client || '', spk_number: card.spkNumber || '',
            project_type: card.projectType || 'NORMAL', tag_desc: card.tagDesc || '',
            tag_color: card.tagColor || 'indigo', due_date_desc: card.dueDateDesc || '',
            due_color: card.dueColor || 'slate', due_date: card.dueDate || '',
            priority: card.priority || 'Normal', priority_icon: card.priorityIcon || 'drag_handle',
            status: card.status || 'PROSES', description: card.description || '',
            dept_id: card.deptId || null
        };
        const { error } = await getSupabase().from('kanban_cards').upsert(row, { onConflict: 'id' });
        if (error) console.error('saveCard:', error);
        return !error;
    },

    async updateCard(id, updates) {
        const colMap = {
            phaseId: 'phase_id', title: 'title', type: 'type', client: 'client',
            spkNumber: 'spk_number', projectType: 'project_type', tagDesc: 'tag_desc',
            tagColor: 'tag_color', dueDateDesc: 'due_date_desc', dueColor: 'due_color',
            dueDate: 'due_date', priority: 'priority', priorityIcon: 'priority_icon',
            status: 'status', description: 'description'
        };
        const row = {};
        for (const [k, v] of Object.entries(updates)) {
            if (colMap[k]) row[colMap[k]] = v;
        }
        const { error } = await getSupabase().from('kanban_cards').update(row).eq('id', id);
        if (error) console.error('updateCard:', error);
        return !error;
    },

    async deleteCard(id) {
        // Also delete related history, qc, reviews
        await getSupabase().from('activity_history').delete().eq('card_id', id);
        await getSupabase().from('qc_records').delete().eq('card_id', id);
        await getSupabase().from('reviews').delete().eq('card_id', id);
        const { error } = await getSupabase().from('kanban_cards').delete().eq('id', id);
        if (error) console.error('deleteCard:', error);
        return !error;
    },

    // --- Activity History ---
    async getHistory(deptId = null) {
        let q = getSupabase().from('activity_history').select('*').order('timestamp', { ascending: false });
        if (deptId) q = q.eq('dept_id', deptId);
        const { data, error } = await q;
        if (error) { console.error('getHistory:', error); return []; }
        return data.map(h => ({
            id: h.id, cardId: h.card_id, type: h.type,
            timestamp: h.timestamp, user: h.username, desc: h.description,
            deptId: h.dept_id
        }));
    },

    async getHistoryByCard(cardId) {
        const { data, error } = await getSupabase().from('activity_history').select('*')
            .eq('card_id', cardId).order('timestamp', { ascending: false });
        if (error) { console.error('getHistoryByCard:', error); return []; }
        return data.map(h => ({
            id: h.id, cardId: h.card_id, type: h.type,
            timestamp: h.timestamp, user: h.username, desc: h.description, deptId: h.dept_id
        }));
    },

    async addHistory(entry) {
        const row = {
            id: entry.id || genId('HIST'), card_id: entry.cardId, type: entry.type,
            timestamp: entry.timestamp || new Date().toISOString(),
            username: entry.user || 'Sistem', description: entry.desc || '',
            dept_id: entry.deptId || null
        };
        const { error } = await getSupabase().from('activity_history').insert(row);
        if (error) console.error('addHistory:', error);
        return !error;
    },

    // --- QC Records ---
    async getQcRecords(deptId = null) {
        let q = getSupabase().from('qc_records').select('*').order('timestamp', { ascending: false });
        if (deptId) q = q.eq('dept_id', deptId);
        const { data, error } = await q;
        if (error) { console.error('getQcRecords:', error); return []; }
        return data.map(r => ({
            id: r.id, cardId: r.card_id, phaseId: r.phase_id, type: r.type,
            timestamp: r.timestamp, user: r.username, desc: r.description,
            result: r.result || '', notes: r.notes || '', deptId: r.dept_id
        }));
    },

    async getQcByCard(cardId) {
        const { data, error } = await getSupabase().from('qc_records').select('*')
            .eq('card_id', cardId).order('timestamp', { ascending: false });
        if (error) { console.error('getQcByCard:', error); return []; }
        return data.map(r => ({
            id: r.id, cardId: r.card_id, phaseId: r.phase_id, type: r.type,
            timestamp: r.timestamp, user: r.username, desc: r.description,
            result: r.result || '', notes: r.notes || '', deptId: r.dept_id
        }));
    },

    async addQcRecord(record) {
        const row = {
            id: record.id || genId('QC'), card_id: record.cardId, phase_id: record.phaseId,
            type: record.type || '', timestamp: record.timestamp || new Date().toISOString(),
            username: record.user || 'Sistem', description: record.desc || '',
            result: record.result || '', notes: record.notes || '',
            dept_id: record.deptId || null
        };
        const { error } = await getSupabase().from('qc_records').insert(row);
        if (error) console.error('addQcRecord:', error);
        return !error;
    },

    // --- Reviews ---
    async getReviews(deptId = null) {
        let q = getSupabase().from('reviews').select('*').order('timestamp', { ascending: false });
        if (deptId) q = q.eq('dept_id', deptId);
        const { data, error } = await q;
        if (error) { console.error('getReviews:', error); return []; }
        return data.map(r => ({
            id: r.id, cardId: r.card_id, rating: r.rating, comment: r.comment,
            reviewerName: r.reviewer_name, timestamp: r.timestamp, deptId: r.dept_id
        }));
    },

    async getReviewsByCard(cardId) {
        const { data, error } = await getSupabase().from('reviews').select('*')
            .eq('card_id', cardId).order('timestamp', { ascending: false });
        if (error) { console.error('getReviewsByCard:', error); return []; }
        return data.map(r => ({
            id: r.id, cardId: r.card_id, rating: r.rating, comment: r.comment,
            reviewerName: r.reviewer_name, timestamp: r.timestamp, deptId: r.dept_id
        }));
    },

    async addReview(review) {
        const row = {
            id: review.id || genId('REV'), card_id: review.cardId, rating: review.rating || 5,
            comment: review.comment || '', reviewer_name: review.reviewerName || 'Anonim',
            timestamp: review.timestamp || new Date().toISOString(), dept_id: review.deptId || null
        };
        const { error } = await getSupabase().from('reviews').insert(row);
        if (error) console.error('addReview:', error);
        return !error;
    },

    // --- Token History ---
    async getTokenHistory(deptId = null) {
        let q = getSupabase().from('token_history').select('*').order('timestamp', { ascending: false });
        if (deptId) q = q.eq('dept_id', deptId);
        const { data, error } = await q;
        if (error) { console.error('getTokenHistory:', error); return []; }
        return data.map(t => ({
            id: t.id, userId: t.user_id, userName: t.user_name, activity: t.activity,
            spkInfo: t.spk_info, nominal: t.nominal, type: t.type,
            timestamp: t.timestamp, deptId: t.dept_id
        }));
    },

    async addTokenHistory(entry) {
        const row = {
            id: entry.id || genId('TOK'), user_id: entry.userId, user_name: entry.userName || '',
            activity: entry.activity || '', spk_info: entry.spkInfo || {},
            nominal: entry.nominal || 0, type: entry.type || 'usage',
            timestamp: entry.timestamp || new Date().toISOString(), dept_id: entry.deptId || null
        };
        const { error } = await getSupabase().from('token_history').insert(row);
        if (error) console.error('addTokenHistory:', error);
        return !error;
    },

    // --- Token Rates ---
    async getTokenRates() {
        const { data, error } = await getSupabase().from('token_rates').select('*');
        if (error) { console.error('getTokenRates:', error); return {}; }
        const rates = {};
        data.forEach(r => { rates[r.activity_code] = r.cost; });
        return rates;
    },

    async saveTokenRate(activityCode, cost) {
        const { error } = await getSupabase().from('token_rates')
            .upsert({ activity_code: activityCode, cost: cost }, { onConflict: 'activity_code' });
        if (error) console.error('saveTokenRate:', error);
        return !error;
    },

    // --- Token Consumption (combined) ---
    async consumeToken(deptId, activityCode, userId, userName, spkInfo = null) {
        const rates = await this.getTokenRates();
        const cost = parseFloat(rates[activityCode] || 0);
        if (cost <= 0) return true;

        // Get current dept token
        const { data: dept, error: dErr } = await getSupabase().from('departments')
            .select('token').eq('id', deptId).maybeSingle();
        if (dErr || !dept) return true;

        const currentToken = parseFloat(dept.token || 0);
        if (currentToken < cost) {
            alert(`Akses Ditolak: Token Departemen tidak mencukupi untuk '${activityCode}' (Tarif: ${cost} Token). Hubungi Pemilik Sistem untuk Top Up.`);
            return false;
        }

        // Deduct
        await this.updateDeptToken(deptId, currentToken - cost);

        // Log
        await this.addTokenHistory({
            userId, userName, activity: activityCode, spkInfo, nominal: cost,
            type: 'usage', deptId
        });
        return true;
    },

    // --- Utility ---
    genId,

    // ═══════════════════════════════════════════════════════════════
    // SYNC LAYER: Bridges localStorage ↔ Supabase
    // ═══════════════════════════════════════════════════════════════

    /**
     * Pull ALL data from Supabase into localStorage for the active department.
     * Called once on page load by auth.js.
     */
    async syncFromSupabase(deptId) {
        try {
            const [cards, history, qc, phases, reviews, tokenHistory, users, departments, rates] = await Promise.all([
                this.getCards(deptId),
                this.getHistory(deptId),
                this.getQcRecords(deptId),
                this.getPhases(deptId),
                this.getReviews(deptId),
                this.getTokenHistory(deptId),
                this.getUsers(),
                this.getDepartments(),
                this.getTokenRates()
            ]);

            // Store to localStorage using raw setter (bypass hooks)
            const rawSet = localStorage._origSetItem || localStorage.setItem.bind(localStorage);
            rawSet.call(localStorage, 'flowta_kanban_cards', JSON.stringify(cards));
            rawSet.call(localStorage, 'flowta_history', JSON.stringify(history));
            rawSet.call(localStorage, 'flowta_qc', JSON.stringify(qc));
            rawSet.call(localStorage, 'flowta_phases', JSON.stringify(phases));
            rawSet.call(localStorage, 'flowta_reviews', JSON.stringify(reviews));
            rawSet.call(localStorage, 'flowta_token_history', JSON.stringify(tokenHistory));
            rawSet.call(localStorage, 'flowta_users', JSON.stringify(users));
            rawSet.call(localStorage, 'flowta_departments', JSON.stringify(departments));
            rawSet.call(localStorage, 'flowta_token_rates', JSON.stringify(rates));

            console.log('[Flowta Sync] ✓ Data loaded from Supabase');
            return true;
        } catch (err) {
            console.error('[Flowta Sync] Failed to sync from Supabase:', err);
            return false;
        }
    },

    /**
     * Hook localStorage.setItem to auto-push changes to Supabase in background.
     * This means ALL existing page code (that writes to localStorage) will
     * automatically sync to the database without modifications.
     */
    hookLocalStorageWrites(deptId) {
        const self = this;
        const origSet = localStorage._origSetItem || localStorage.setItem.bind(localStorage);
        // Save original for raw access
        localStorage._origSetItem = origSet;

        const SYNCED_KEYS = {
            'flowta_kanban_cards': 'cards',
            'flowta_history': 'history',
            'flowta_qc': 'qc',
            'flowta_phases': 'phases',
            'flowta_reviews': 'reviews',
            'flowta_token_history': 'tokenHistory',
            'flowta_users': 'users',
            'flowta_departments': 'departments'
        };

        // Debounce map to avoid rapid-fire writes
        const debounceTimers = {};

        localStorage.setItem = function(key, value) {
            // Always write to localStorage first (instant)
            origSet.call(localStorage, key, value);

            // If it's a synced key, push to Supabase in background
            if (SYNCED_KEYS[key]) {
                clearTimeout(debounceTimers[key]);
                debounceTimers[key] = setTimeout(() => {
                    self._pushToSupabase(key, value, deptId).catch(err => {
                        console.error(`[Flowta Sync] Push failed for ${key}:`, err);
                    });
                }, 300); // 300ms debounce
            }
        };
        console.log('[Flowta Sync] ✓ localStorage write hooks installed');
    },

    /**
     * Push a single localStorage key's data to Supabase.
     * Handles the mapping between localStorage format and Supabase tables.
     */
    async _pushToSupabase(key, value, deptId) {
        let items;
        try { items = JSON.parse(value); } catch { return; }
        if (!Array.isArray(items)) return;

        const sb = getSupabase();
        if (!sb) return;

        switch (key) {
            case 'flowta_kanban_cards': {
                // Upsert all cards for this dept
                const rows = items.filter(c => !c.deptId || c.deptId === deptId).map(c => ({
                    id: c.id, phase_id: c.phaseId, title: c.title, type: c.type || '',
                    client: c.client || '', spk_number: c.spkNumber || '',
                    project_type: c.projectType || c.tagDesc || 'NORMAL',
                    tag_desc: c.tagDesc || '', tag_color: c.tagColor || 'indigo',
                    due_date_desc: c.dueDateDesc || '', due_color: c.dueColor || 'slate',
                    due_date: c.dueDate || '', priority: c.priority || 'Normal',
                    priority_icon: c.priorityIcon || 'drag_handle',
                    status: c.status || 'PROSES', description: c.description || '',
                    dept_id: c.deptId || deptId
                }));
                if (rows.length > 0) {
                    const { error } = await sb.from('kanban_cards').upsert(rows, { onConflict: 'id' });
                    if (error) console.error('[Sync] kanban_cards push error:', error);
                }
                break;
            }
            case 'flowta_history': {
                const rows = items.filter(h => !h.deptId || h.deptId === deptId).map(h => ({
                    id: h.id, card_id: h.cardId, type: h.type,
                    timestamp: h.timestamp, username: h.user || 'Sistem',
                    description: h.desc || '', dept_id: h.deptId || deptId
                }));
                if (rows.length > 0) {
                    const { error } = await sb.from('activity_history').upsert(rows, { onConflict: 'id' });
                    if (error) console.error('[Sync] history push error:', error);
                }
                break;
            }
            case 'flowta_qc': {
                const rows = items.filter(r => !r.deptId || r.deptId === deptId).map(r => ({
                    id: r.id, card_id: r.cardId, phase_id: r.phaseId, type: r.type || '',
                    timestamp: r.timestamp, username: r.user || 'Sistem',
                    description: r.desc || '', result: r.result || '', notes: r.notes || '',
                    dept_id: r.deptId || deptId
                }));
                if (rows.length > 0) {
                    const { error } = await sb.from('qc_records').upsert(rows, { onConflict: 'id' });
                    if (error) console.error('[Sync] qc push error:', error);
                }
                break;
            }
            case 'flowta_phases': {
                const rows = items.filter(p => !p.deptId || p.deptId === deptId).map((p, i) => ({
                    id: p.id, title: p.title, description: p.desc || '',
                    icon: p.icon || 'build', color_class: p.colorClass || 'primary',
                    status: p.status || 'BELUM MULAI', status_color: p.statusColor || 'slate',
                    sort_order: i, dept_id: p.deptId || deptId
                }));
                if (rows.length > 0) {
                    const { error } = await sb.from('phases').upsert(rows, { onConflict: 'id' });
                    if (error) console.error('[Sync] phases push error:', error);
                }
                break;
            }
            case 'flowta_reviews': {
                const rows = items.map(r => ({
                    id: r.id || genId('REV'), card_id: r.cardId, rating: r.rating || 5,
                    comment: r.comment || '', reviewer_name: r.reviewerName || r.name || 'Anonim',
                    timestamp: r.timestamp, dept_id: r.deptId || deptId
                }));
                if (rows.length > 0) {
                    const { error } = await sb.from('reviews').upsert(rows, { onConflict: 'id' });
                    if (error) console.error('[Sync] reviews push error:', error);
                }
                break;
            }
            case 'flowta_token_history': {
                const rows = items.filter(t => !t.deptId || t.deptId === deptId).map(t => ({
                    id: t.id, user_id: t.userId, user_name: t.userName || '',
                    activity: t.activity || '', spk_info: t.spkInfo || {},
                    nominal: t.nominal || 0, type: t.type || 'usage',
                    timestamp: t.timestamp, dept_id: t.deptId || deptId
                }));
                if (rows.length > 0) {
                    const { error } = await sb.from('token_history').upsert(rows, { onConflict: 'id' });
                    if (error) console.error('[Sync] token_history push error:', error);
                }
                break;
            }
            case 'flowta_users': {
                const rows = items.map(u => ({
                    id: u.id, name: u.name, username: u.username,
                    password: u.password, role: u.role, dept_id: u.deptId || null
                }));
                if (rows.length > 0) {
                    const { error } = await sb.from('users').upsert(rows, { onConflict: 'id' });
                    if (error) console.error('[Sync] users push error:', error);
                }
                break;
            }
            case 'flowta_departments': {
                const rows = items.map(d => ({
                    id: d.id, name: d.name, phone: d.phone || '', wa: d.wa || '',
                    email: d.email || '', token: d.token ?? 999, address: d.address || '',
                    description: d.desc || '', logo: d.logo || ''
                }));
                if (rows.length > 0) {
                    const { error } = await sb.from('departments').upsert(rows, { onConflict: 'id' });
                    if (error) console.error('[Sync] departments push error:', error);
                }
                break;
            }
        }
    },

    /**
     * Handle card deletion sync - when a card is removed from localStorage,
     * also remove from Supabase
     */
    async syncDeleteCard(cardId) {
        await this.deleteCard(cardId);
    }
};

// Make globally available
window.db = db;

/**
 * Helper: wait for Supabase sync to complete.
 * Usage in page scripts: await window.waitForSync();
 * If sync already done, resolves immediately.
 */
window.waitForSync = function() {
    return new Promise(resolve => {
        if (window.flowtaSyncReady) return resolve();
        window.addEventListener('flowta-sync-ready', () => resolve(), { once: true });
        // Fallback timeout — if auth.js didn't run (e.g. login page), resolve after 3s
        setTimeout(resolve, 3000);
    });
};
