/**
 * FLOWTA Sidebar Component - sidebar.js
 * Handles: loading sidebar.html, collapsible sidebar, mobile off-canvas, active page highlight
 * 
 * Usage: Add to every page's <head>:
 *   <script src="sidebar.js"></script>
 * 
 * Then place <div id="sidebar-container"></div> where the sidebar should go (inside the flex container).
 * Also add a hamburger button in the header for mobile:
 *   <button onclick="window.FlowtaSidebar.open()" class="lg:hidden ..."><span class="material-symbols-outlined">menu</span></button>
 */

(function () {
    'use strict';

    // ─── Configuration ───────────────────────────────────────────
    const STORAGE_KEY = 'flowta_sidebar_collapsed';
    const COLLAPSED_WIDTH = '5rem';    // 80px - icon only
    const EXPANDED_WIDTH = '18rem';    // 288px = w-72

    // ─── State ───────────────────────────────────────────────────
    let isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
    let isMobileOpen = false;
    let sidebarLoaded = false;

    // ─── Inject CSS ──────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        /* Sidebar collapsed state */
        #sidebar-aside[data-collapsed="true"] {
            width: ${COLLAPSED_WIDTH} !important;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-label {
            width: 0;
            opacity: 0;
            margin: 0;
            padding: 0;
            pointer-events: none;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-section-label {
            width: 0;
            opacity: 0;
            height: 0;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-header {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
            justify-content: center;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-header a {
            justify-content: center;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-header a img {
            margin: 0;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-nav {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-link {
            justify-content: center;
            padding-left: 0;
            padding-right: 0;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-user-card .glass-panel {
            justify-content: center;
            padding: 0.5rem;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-user-card {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
        }
        #sidebar-aside[data-collapsed="true"] #sidebar-toggle-icon {
            transform: rotate(180deg);
        }
        #sidebar-aside[data-collapsed="true"] #sidebar-toggle-btn {
            position: absolute;
            right: 0.5rem;
            top: 50%;
            transform: translateY(-50%);
        }
        
        /* Tooltip on collapsed links */
        #sidebar-aside[data-collapsed="true"] .sidebar-link {
            position: relative;
        }
        #sidebar-aside[data-collapsed="true"] .sidebar-link:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            left: calc(100% + 8px);
            top: 50%;
            transform: translateY(-50%);
            background: rgba(15, 23, 42, 0.95);
            color: #e2e8f0;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            z-index: 9999;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            pointer-events: none;
            animation: sidebarTooltipIn 0.15s ease forwards;
        }

        @keyframes sidebarTooltipIn {
            from { opacity: 0; transform: translateY(-50%) translateX(-4px); }
            to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }

        /* Active link styles */
        .sidebar-link-active {
            background: rgba(99, 102, 241, 0.15) !important;
            color: #818cf8 !important;
            box-shadow: 0 0 12px rgba(99, 102, 241, 0.1);
        }
        .sidebar-link-inactive {
            color: #94a3b8;
        }
        .sidebar-link-inactive:hover {
            background: rgba(30, 41, 59, 0.5);
            color: #e2e8f0;
        }

        /* Mobile slide animation */
        @media (max-width: 1023px) {
            #sidebar-aside {
                position: fixed !important;
                box-shadow: 8px 0 32px rgba(0,0,0,0.5);
            }
            #sidebar-aside[data-collapsed="true"] {
                width: ${EXPANDED_WIDTH} !important;
            }
            #sidebar-aside[data-collapsed="true"] .sidebar-label {
                width: auto;
                opacity: 1;
                pointer-events: auto;
            }
            #sidebar-aside[data-collapsed="true"] .sidebar-section-label {
                width: auto;
                opacity: 1;
                height: auto;
                margin-bottom: 0.5rem;
                padding: 0 1rem;
            }
            #sidebar-aside[data-collapsed="true"] .sidebar-link {
                justify-content: flex-start;
                padding-left: 1rem;
                padding-right: 1rem;
            }
            #sidebar-aside[data-collapsed="true"] .sidebar-nav {
                padding-left: 0.75rem;
                padding-right: 0.75rem;
            }
            #sidebar-aside[data-collapsed="true"] .sidebar-header {
                padding-left: 1rem;
                padding-right: 1rem;
                justify-content: flex-start;
            }
            #sidebar-aside[data-collapsed="true"] .sidebar-header a {
                justify-content: flex-start;
            }
            #sidebar-aside[data-collapsed="true"] .sidebar-user-card {
                padding-left: 1rem;
                padding-right: 1rem;
            }
            #sidebar-aside[data-collapsed="true"] .sidebar-user-card .glass-panel {
                justify-content: flex-start;
                padding: 0.75rem;
            }
            #sidebar-aside[data-collapsed="true"] #sidebar-toggle-icon {
                transform: none;
            }
        }

        /* Smooth main content transition */
        .sidebar-main-transition {
            transition: margin-left 0.3s ease-in-out;
        }
    `;
    document.head.appendChild(style);

    // ─── Load sidebar HTML ───────────────────────────────────────
    function loadSidebar() {
        const container = document.getElementById('sidebar-container');
        if (!container) {
            console.warn('[FlowtaSidebar] #sidebar-container not found. Sidebar will not be injected.');
            return;
        }

        fetch('sidebar.html')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load sidebar.html');
                return res.text();
            })
            .then(html => {
                container.innerHTML = html;
                sidebarLoaded = true;
                initSidebar();
            })
            .catch(err => {
                console.error('[FlowtaSidebar] Error loading sidebar:', err);
            });
    }

    // ─── Initialize sidebar logic ────────────────────────────────
    function initSidebar() {
        const aside = document.getElementById('sidebar-aside');
        if (!aside) return;

        // Set tooltips on links
        aside.querySelectorAll('.sidebar-link').forEach(link => {
            const labelEl = link.querySelector('.sidebar-label');
            if (labelEl) {
                link.setAttribute('data-tooltip', labelEl.textContent.trim());
            }
        });

        // Highlight active page
        highlightActivePage();

        // Apply saved collapsed state (desktop only)
        if (window.innerWidth >= 1024) {
            applyCollapsed(isCollapsed, false);
        }
    }

    // ─── Active page ─────────────────────────────────────────────
    function highlightActivePage() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        document.querySelectorAll('.sidebar-link').forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === currentPage) {
                link.classList.add('sidebar-link-active');
                link.classList.remove('sidebar-link-inactive');
            } else {
                link.classList.add('sidebar-link-inactive');
                link.classList.remove('sidebar-link-active');
            }
        });
    }

    // ─── Collapse / Expand ───────────────────────────────────────
    function applyCollapsed(collapsed, animate = true) {
        const aside = document.getElementById('sidebar-aside');
        if (!aside) return;

        isCollapsed = collapsed;
        aside.setAttribute('data-collapsed', collapsed ? 'true' : 'false');
        localStorage.setItem(STORAGE_KEY, collapsed ? 'true' : 'false');
    }

    function toggleSidebar() {
        if (window.innerWidth < 1024) {
            // On mobile, close the sidebar
            closeMobile();
            return;
        }
        applyCollapsed(!isCollapsed);
    }

    // ─── Mobile Off-Canvas ───────────────────────────────────────
    function openMobile() {
        const aside = document.getElementById('sidebar-aside');
        const overlay = document.getElementById('sidebar-overlay');
        if (!aside || !overlay) return;

        isMobileOpen = true;
        aside.classList.remove('-translate-x-full');
        aside.classList.add('translate-x-0');
        overlay.classList.remove('hidden');
        // Trigger reflow for transition
        requestAnimationFrame(() => {
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');
        });
        document.body.style.overflow = 'hidden';
    }

    function closeMobile() {
        const aside = document.getElementById('sidebar-aside');
        const overlay = document.getElementById('sidebar-overlay');
        if (!aside || !overlay) return;

        isMobileOpen = false;
        aside.classList.add('-translate-x-full');
        aside.classList.remove('translate-x-0');
        overlay.classList.add('opacity-0');
        overlay.classList.remove('opacity-100');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
        document.body.style.overflow = '';
    }

    // ─── Handle window resize ────────────────────────────────────
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (window.innerWidth >= 1024 && isMobileOpen) {
                closeMobile();
            }
        }, 150);
    });

    // ─── Handle Escape key ───────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMobileOpen) {
            closeMobile();
        }
    });

    // ─── Public API ──────────────────────────────────────────────
    window.FlowtaSidebar = {
        open: openMobile,
        close: closeMobile,
        toggle: toggleSidebar,
        isCollapsed: () => isCollapsed,
        isMobileOpen: () => isMobileOpen,
    };

    // ─── Auto-load ───────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadSidebar);
    } else {
        loadSidebar();
    }
})();
