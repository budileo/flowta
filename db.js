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
    genId
};

// Make globally available
window.db = db;
