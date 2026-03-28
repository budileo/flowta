/**
 * auth.js
 * Script otentikasi global. Harus dimasukkan ke setiap file HTML sebelum </body>.
 * Berisi helper login, session check, token validasi, dan hide/show role-based UI.
 */

(function initAuthSystem() {
    const CURRENT_USER_KEY = 'flowta_currentUser';
    const USERS_KEY        = 'flowta_users';
    const DEPARTMENTS_KEY  = 'flowta_departments';
    const ACTIVE_DEPT_KEY  = 'flowta_active_dept';

    // 1. DATA BOOTSTRAP (PT NUSANTARA MANDIRI)
    let depts = JSON.parse(localStorage.getItem(DEPARTMENTS_KEY)) || [];
    let defaultDeptId = 'dept_nsmandiri';
    
    if (!depts.find(d => d.id === defaultDeptId)) {
        depts.push({
            id: defaultDeptId,
            name: 'PT NUSANTARA MANDIRI',
            phone: '', wa: '', email: '',
            token: '999', address: '', desc: 'Departemen Utama Default', logo: ''
        });
        localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(depts));
        
        // Migrate existing Data
        const keysToMigrate = [USERS_KEY, 'flowta_kanban_cards', 'flowta_history', 'flowta_qc', 'flowta_phases'];
        keysToMigrate.forEach(k => {
            let data = JSON.parse(localStorage.getItem(k)) || [];
            let changed = false;
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (!item.deptId) {
                        item.deptId = defaultDeptId;
                        changed = true;
                    }
                });
                if (changed) localStorage.setItem(k, JSON.stringify(data));
            }
        });
    }

    // Load users after migration
    let users = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    
    // Inisialisasi Akun Default jika tidak ada yg bernama 'budileo'
    if (!users.find(u => u.username === 'budileo')) {
        users.push({
            id: 'admin_default_01',
            name: 'Budi Leo',
            username: 'budileo',
            password: '12345',
            role: 'Pemilik Sistem',
            deptId: defaultDeptId 
        });
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    const curPath = window.location.pathname.split('/').pop();
    const isLoginPath = curPath === 'login.html' || curPath === '';

    const activeUserId = localStorage.getItem(CURRENT_USER_KEY);
    let currentUser = activeUserId ? users.find(u => u.id === activeUserId) : null;

    if (!currentUser && !isLoginPath) {
        window.location.href = 'login.html';
        return;
    }

    if (currentUser && (isLoginPath || curPath === '')) {
        window.location.href = 'index.html';
        return;
    }

    // 2. ACTIVE DEPARTMENT CONTEXT
    let activeDeptId = localStorage.getItem(ACTIVE_DEPT_KEY);
    if (currentUser) {
        if (currentUser.role === 'Pemilik Sistem') {
            if (!activeDeptId || !depts.find(d => d.id === activeDeptId)) {
                activeDeptId = depts.length > 0 ? depts[0].id : defaultDeptId;
                localStorage.setItem(ACTIVE_DEPT_KEY, activeDeptId);
            }
        } else {
            // Force strict department for Supervisor/Staf
            activeDeptId = currentUser.deptId || defaultDeptId;
            localStorage.setItem(ACTIVE_DEPT_KEY, activeDeptId);
        }
    }
    window.flowtaActiveDept = activeDeptId;

    // 3. LOCALSTORAGE HOOKS (ISOLATION)
    const origGet = localStorage.getItem.bind(localStorage);
    const origSet = localStorage.setItem.bind(localStorage);
    const HOOKED_KEYS = ['flowta_kanban_cards', 'flowta_history', 'flowta_qc', 'flowta_phases', 'flowta_token_history'];
    
    localStorage.getItem = function(key) {
        const val = origGet(key);
        if (!val || !HOOKED_KEYS.includes(key) || !window.flowtaActiveDept) return val;
        try {
            let data = JSON.parse(val);
            if (Array.isArray(data)) {
                return JSON.stringify(data.filter(d => !d.deptId || d.deptId === window.flowtaActiveDept));
            }
        } catch(e) {}
        return val;
    };
    
    localStorage.setItem = function(key, value) {
        if (HOOKED_KEYS.includes(key) && window.flowtaActiveDept) {
            try {
                let newData = JSON.parse(value);
                if (Array.isArray(newData)) {
                    newData.forEach(d => { if (!d.deptId) d.deptId = window.flowtaActiveDept; });
                    let fullDataStr = origGet(key);
                    let fullData = fullDataStr ? JSON.parse(fullDataStr) : [];
                    let otherDeptsData = fullData.filter(d => d.deptId && d.deptId !== window.flowtaActiveDept);
                    let merged = [...otherDeptsData, ...newData];
                    return origSet(key, JSON.stringify(merged));
                }
            } catch(e) {}
        }
        return origSet(key, value);
    };

    // 4. TOKEN BILLING SYSTEM
    const TOKEN_RATES_KEY = 'flowta_token_rates';
    let currentRates = JSON.parse(origGet(TOKEN_RATES_KEY));
    if (!currentRates) currentRates = {};
    
    const defaultRates = {
        'Login': 1,
        'Drag Kanban': 2,
        'Simpan Produk SPK': 5,
        'Komentar': 1,
        'Simpan QC': 2,
        'Pencarian Data': 2,
        'Produksi Selesai': 5,
        'Batal SPK': 2,
        'Print Label': 1,
        'Edit Produk': 3,
        'Download Excel': 3,
        'Download PDF': 3
    };
    
    let needSave = false;
    for (const [k, v] of Object.entries(defaultRates)) {
        if (currentRates[k] === undefined) {
            currentRates[k] = v;
            needSave = true;
        }
    }
    
    if (needSave) {
        origSet(TOKEN_RATES_KEY, JSON.stringify(currentRates));
    }

    window.consumeToken = function(activityCode, spkInfo = null) {
        if (!window.flowtaUser) return false;
        
        const rates = JSON.parse(origGet(TOKEN_RATES_KEY)) || {};
        const cost = parseFloat(rates[activityCode] || 0);
        if (cost <= 0) return true; // free
        
        let depts = JSON.parse(origGet(DEPARTMENTS_KEY)) || [];
        let deptIdx = depts.findIndex(d => d.id === window.flowtaActiveDept);
        if (deptIdx === -1) return true; // safe fallback
        
        let currentToken = parseFloat(depts[deptIdx].token || 0);
        if (currentToken < cost) {
            alert(`Akses Ditolak: Token Departemen tidak mencukupi untuk '${activityCode}' (Tarif: ${cost} Token). Hubungi Pemilik Sistem untuk Top Up.`);
            return false;
        }
        
        // Deduct
        depts[deptIdx].token = currentToken - cost;
        origSet(DEPARTMENTS_KEY, JSON.stringify(depts));
        
        // Log History (Menggunakan standar setItem agar masuk ke hook pemisahan departemen)
        let histories = JSON.parse(localStorage.getItem('flowta_token_history')) || [];
        histories.unshift({
            id: 'TOK-' + Date.now() + Math.round(Math.random() * 1000),
            userId: window.flowtaUser.id,
            userName: window.flowtaUser.name,
            activity: activityCode,
            spkInfo: spkInfo,
            nominal: cost,
            type: 'usage',
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('flowta_token_history', JSON.stringify(histories));
        
        return true;
    };

    // Assign globally
    window.flowtaUser = currentUser;
    window.logout = function() {
        localStorage.removeItem(CURRENT_USER_KEY);
        window.location.href = 'login.html';
    };

    // Saat DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        if (!currentUser) return; // if in login page

        // Update name in sidebar profile if exists
        const profileNames = document.querySelectorAll('.text-sm.font-semibold.truncate');
        const profileRoles = document.querySelectorAll('.text-xs.text-slate-400.truncate');
        
        if (profileNames.length > 0) profileNames.forEach(el => el.textContent = currentUser.name);
        if (profileRoles.length > 0) profileRoles.forEach(el => el.textContent = currentUser.role);

        // Sidebar Logout injection
        const asideEls = document.querySelectorAll('.p-4.mt-auto.border-t');
        asideEls.forEach(container => {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition';
            logoutBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">logout</span> Logout';
            logoutBtn.onclick = window.logout;
            container.appendChild(logoutBtn);
        });

        // 4. INJECT DROPDOWN CONTEXT (Only for Pemilik Sistem)
        if (currentUser.role === 'Pemilik Sistem') {
            const headerActions = document.querySelector('.flex.items-center.gap-3:not(.hidden)');
            if (headerActions) {
                const selectEl = document.createElement('select');
                selectEl.className = 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-xs rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm ml-2 outline-none';
                
                // Get fresh depts with origGet to avoid loop issues
                let currentDepts = JSON.parse(origGet(DEPARTMENTS_KEY)) || [];
                currentDepts.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = `🏢 ` + d.name;
                    if (d.id === activeDeptId) opt.selected = true;
                    selectEl.appendChild(opt);
                });
                
                selectEl.onchange = function(e) {
                    origSet(ACTIVE_DEPT_KEY, e.target.value);
                    window.location.reload();
                };
                
                headerActions.prepend(selectEl);
            }
        }

        // ------------------
        // ROLE AUTHORIZATION
        // ------------------
        const isPemilikContext = currentUser.role === 'Pemilik Sistem';
        const isSupervisorContext = currentUser.role === 'Supervisor';
        const isStafContext = currentUser.role === 'Staf';

        // 1. Menu Fase (Hide from Supervisor & Staf)
        if (!isPemilikContext) {
            const phaseLink = Array.from(document.querySelectorAll('a')).find(el => el.href.includes('phase.html') || el.innerHTML.includes('phase.html'));
            if (phaseLink) phaseLink.style.display = 'none';
        }

        // Cek Sisa Token Departemen - Jika bukan Pemilik
        if (!isPemilikContext && currentUser.deptId) {
            const depts = JSON.parse(localStorage.getItem(DEPARTMENTS_KEY)) || [];
            const myDept = depts.find(d => d.id === currentUser.deptId);
            if (myDept) {
                const tokenSisa = parseInt(myDept.token || 0);
                if (tokenSisa <= 0) {
                    alert('Akses Ditolak: Sisa Token Departemen (' + myDept.name + ') Anda telah habis. Harap hubungi Pemilik Sistem.');
                    window.logout();
                }
            }
        }
        
        // 2. Hide QC & Batal SPK for Staf
        if (isStafContext) {
            const style = document.createElement('style');
            style.textContent = `
                button[onclick*="handleCancelSpk"],
                #cancel-spk-container,
                button[onclick*="openQcModal"] {
                    display: none !important;
                }
            `;
            document.head.appendChild(style);
        }
    });

})();
