/**
 * auth.js — Flowta Auth System (Supabase Edition)
 * Harus dimasukkan SETELAH supabase CDN dan db.js di setiap HTML.
 */

(async function initAuthSystem() {
    const CURRENT_USER_KEY = 'flowta_currentUser';
    const ACTIVE_DEPT_KEY  = 'flowta_active_dept';

    const curPath = window.location.pathname.split('/').pop() || 'index.html';
    const isLoginPath = curPath === 'login.html';
    const isTrackerPath = curPath === 'tracker.html';

    // Tracker page doesn't need auth
    if (isTrackerPath) return;

    // Wait for db.js to be ready
    if (typeof window.db === 'undefined') {
        console.error('db.js not loaded before auth.js');
        return;
    }

    const activeUserId = localStorage.getItem(CURRENT_USER_KEY);
    let currentUser = null;

    // ──────────────── LOGIN PAGE LOGIC ────────────────
    if (isLoginPath) {
        // If user already has a valid session, redirect to index
        if (activeUserId) {
            try {
                currentUser = await window.db.getUserById(activeUserId);
            } catch (err) {
                console.error('Auth check failed:', err);
                currentUser = null;
            }
            if (currentUser) {
                window.location.href = 'index.html';
                return;
            } else {
                // Invalid/stale token — clean up
                localStorage.removeItem(CURRENT_USER_KEY);
            }
        }
        // On login page with no valid session: just stop here
        // The login form handler in login.html will handle the login itself
        window.flowtaSyncReady = true;
        window.dispatchEvent(new Event('flowta-sync-ready'));
        return;
    }

    // ──────────────── PROTECTED PAGES LOGIC ────────────────
    // Fast synchronous fail if no token stored at all
    if (!activeUserId) {
        window.location.href = 'login.html';
        return;
    }

    // Hide page content while verifying to prevent flashes / unauthorized interaction
    document.documentElement.style.visibility = 'hidden';
    document.documentElement.style.opacity = '0';

    // Verify the stored user ID against Supabase
    try {
        currentUser = await window.db.getUserById(activeUserId);
    } catch (err) {
        console.error('Auth verification failed:', err);
        currentUser = null;
    }

    if (!currentUser) {
        // Token is invalid or user was deleted — force re-login
        localStorage.removeItem(CURRENT_USER_KEY);
        window.location.href = 'login.html';
        return;
    }

    // ── User verified! Reveal page ──
    document.documentElement.style.visibility = '';
    document.documentElement.style.opacity = '1';

    // ACTIVE DEPARTMENT CONTEXT
    let depts = [];
    try {
        depts = await window.db.getDepartments();
    } catch (err) {
        console.error('Failed to load departments:', err);
        depts = [];
    }

    let activeDeptId = localStorage.getItem(ACTIVE_DEPT_KEY);

    if (currentUser.role === 'Pemilik Sistem') {
        if (!activeDeptId || !depts.find(d => d.id === activeDeptId)) {
            activeDeptId = depts.length > 0 ? depts[0].id : 'dept_nsmandiri';
            localStorage.setItem(ACTIVE_DEPT_KEY, activeDeptId);
        }
    } else {
        activeDeptId = currentUser.deptId || 'dept_nsmandiri';
        localStorage.setItem(ACTIVE_DEPT_KEY, activeDeptId);
    }

    window.flowtaActiveDept = activeDeptId;

    // ══ SYNC LAYER: Pull from Supabase → localStorage ══
    window.db.hookLocalStorageWrites(activeDeptId);
    await window.db.syncFromSupabase(activeDeptId);
    window.flowtaSyncReady = true;
    window.dispatchEvent(new Event('flowta-sync-ready'));

    // TOKEN BILLING — hybrid sync/async approach
    window.consumeToken = async function(activityCode, spkInfo = null) {
        if (!window.flowtaUser) return false;
        
        const rates = JSON.parse(localStorage.getItem('flowta_token_rates') || '{}');
        const cost = parseFloat(rates[activityCode] || 0);
        if (cost <= 0) return true;
        
        const rawGet = localStorage.getItem.bind(localStorage);
        let depts = JSON.parse(rawGet('flowta_departments') || '[]');
        const deptIdx = depts.findIndex(d => d.id === window.flowtaActiveDept);
        if (deptIdx === -1) return true;
        
        const currentToken = parseFloat(depts[deptIdx].token || 0);
        if (currentToken < cost) {
            alert(`Akses Ditolak: Token Departemen tidak mencukupi untuk '${activityCode}' (Tarif: ${cost} Token). Hubungi Pemilik Sistem untuk Top Up.`);
            return false;
        }
        
        depts[deptIdx].token = currentToken - cost;
        localStorage.setItem('flowta_departments', JSON.stringify(depts));
        
        let tokenHist = JSON.parse(localStorage.getItem('flowta_token_history') || '[]');
        tokenHist.unshift({
            id: 'TOK-' + Date.now() + Math.round(Math.random() * 1000),
            userId: window.flowtaUser.id,
            userName: window.flowtaUser.name,
            activity: activityCode,
            spkInfo: spkInfo,
            nominal: cost,
            type: 'usage',
            timestamp: new Date().toISOString(),
            deptId: window.flowtaActiveDept
        });
        localStorage.setItem('flowta_token_history', JSON.stringify(tokenHist));
        
        return true;
    };

    // Assign globally
    window.flowtaUser = currentUser;
    window.logout = function() {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(ACTIVE_DEPT_KEY);
        window.location.href = 'login.html';
    };

    // DOM Ready
    document.addEventListener('DOMContentLoaded', async () => {
        if (!currentUser) return;

        // Update sidebar profile
        const profileNames = document.querySelectorAll('.text-sm.font-semibold.truncate');
        const profileRoles = document.querySelectorAll('.text-xs.text-slate-400.truncate');
        if (profileNames.length > 0) profileNames.forEach(el => el.textContent = currentUser.name);
        if (profileRoles.length > 0) profileRoles.forEach(el => el.textContent = currentUser.role);

        // Logout button injection
        const asideEls = document.querySelectorAll('.p-4.mt-auto.border-t');
        asideEls.forEach(container => {
            // Prevent double-injection
            if (container.querySelector('[data-flowta-logout]')) return;
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition';
            logoutBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">logout</span> Logout';
            logoutBtn.setAttribute('data-flowta-logout', 'true');
            logoutBtn.onclick = window.logout;
            container.appendChild(logoutBtn);
        });

        // Department switcher (Pemilik Sistem only)
        if (currentUser.role === 'Pemilik Sistem' && depts.length > 0) {
            // Find the header action bar (the one in <header>)
            const header = document.querySelector('header');
            const headerActions = header ? header.querySelector('.flex.items-center.gap-3') : null;
            if (headerActions && !headerActions.querySelector('[data-flowta-dept-switcher]')) {
                const selectEl = document.createElement('select');
                selectEl.className = 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-xs rounded-lg px-2 py-1.5 focus:ring-primary focus:border-primary font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm ml-2 outline-none';
                selectEl.setAttribute('data-flowta-dept-switcher', 'true');

                depts.forEach(d => {
                    const opt = document.createElement('option');
                    opt.value = d.id;
                    opt.textContent = '🏢 ' + d.name;
                    if (d.id === activeDeptId) opt.selected = true;
                    selectEl.appendChild(opt);
                });

                selectEl.onchange = function(e) {
                    localStorage.setItem(ACTIVE_DEPT_KEY, e.target.value);
                    window.location.reload();
                };

                headerActions.prepend(selectEl);
            }
        }

        // ROLE AUTHORIZATION
        const isPemilik = currentUser.role === 'Pemilik Sistem';
        const isStaf = currentUser.role === 'Staf';

        // Hide Fase menu from non-Pemilik
        if (!isPemilik) {
            const phaseLink = Array.from(document.querySelectorAll('a')).find(el => el.href.includes('phase.html'));
            if (phaseLink) phaseLink.style.display = 'none';
        }

        // Token check for non-Pemilik
        if (!isPemilik && currentUser.deptId) {
            try {
                const freshDepts = await window.db.getDepartments();
                const myDept = freshDepts.find(d => d.id === currentUser.deptId);
                if (myDept && parseInt(myDept.token || 0) <= 0) {
                    alert('Akses Ditolak: Sisa Token Departemen (' + myDept.name + ') Anda telah habis. Harap hubungi Pemilik Sistem.');
                    window.logout();
                }
            } catch (err) {
                console.error('Token check failed:', err);
            }
        }

        // Hide QC & Batal for Staf
        if (isStaf) {
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
