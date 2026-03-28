-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FLOWTA — Supabase Database Schema                         ║
-- ║  Jalankan di Supabase SQL Editor (Settings → SQL Editor)   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    wa TEXT DEFAULT '',
    email TEXT DEFAULT '',
    token NUMERIC DEFAULT 999,
    address TEXT DEFAULT '',
    description TEXT DEFAULT '',
    logo TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staf',
    dept_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PHASES
CREATE TABLE IF NOT EXISTS phases (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT 'build',
    color_class TEXT DEFAULT 'primary',
    status TEXT DEFAULT 'BELUM MULAI',
    status_color TEXT DEFAULT 'slate',
    sort_order INT DEFAULT 0,
    dept_id TEXT REFERENCES departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. KANBAN CARDS (SPK)
CREATE TABLE IF NOT EXISTS kanban_cards (
    id TEXT PRIMARY KEY,
    phase_id BIGINT REFERENCES phases(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT DEFAULT '',
    client TEXT DEFAULT '',
    spk_number TEXT DEFAULT '',
    project_type TEXT DEFAULT 'NORMAL',
    tag_desc TEXT DEFAULT '',
    tag_color TEXT DEFAULT 'indigo',
    due_date_desc TEXT DEFAULT '',
    due_color TEXT DEFAULT 'slate',
    due_date TEXT DEFAULT '',
    priority TEXT DEFAULT 'Normal',
    priority_icon TEXT DEFAULT 'drag_handle',
    status TEXT DEFAULT 'PROSES',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    dept_id TEXT REFERENCES departments(id) ON DELETE CASCADE
);

-- 5. ACTIVITY HISTORY
CREATE TABLE IF NOT EXISTS activity_history (
    id TEXT PRIMARY KEY,
    card_id TEXT,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    username TEXT DEFAULT 'Sistem',
    description TEXT DEFAULT '',
    dept_id TEXT REFERENCES departments(id) ON DELETE CASCADE
);

-- 6. QC RECORDS
CREATE TABLE IF NOT EXISTS qc_records (
    id TEXT PRIMARY KEY,
    card_id TEXT,
    phase_id BIGINT,
    type TEXT DEFAULT '',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    username TEXT DEFAULT 'Sistem',
    description TEXT DEFAULT '',
    result TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    dept_id TEXT REFERENCES departments(id) ON DELETE CASCADE
);

-- 7. REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    card_id TEXT,
    rating INT DEFAULT 5,
    comment TEXT DEFAULT '',
    reviewer_name TEXT DEFAULT 'Anonim',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    dept_id TEXT
);

-- 8. TOKEN HISTORY
CREATE TABLE IF NOT EXISTS token_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT DEFAULT '',
    activity TEXT DEFAULT '',
    spk_info JSONB DEFAULT '{}',
    nominal NUMERIC DEFAULT 0,
    type TEXT DEFAULT 'usage',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    dept_id TEXT REFERENCES departments(id) ON DELETE CASCADE
);

-- 9. TOKEN RATES (config)
CREATE TABLE IF NOT EXISTS token_rates (
    id SERIAL PRIMARY KEY,
    activity_code TEXT UNIQUE NOT NULL,
    cost NUMERIC DEFAULT 0
);

-- ═══════════ DEFAULT DATA ═══════════

-- Default Department
INSERT INTO departments (id, name, token, description)
VALUES ('dept_nsmandiri', 'PT NUSANTARA MANDIRI', 999, 'Departemen Utama Default')
ON CONFLICT (id) DO NOTHING;

-- Default Admin User
INSERT INTO users (id, name, username, password, role, dept_id)
VALUES ('admin_default_01', 'Budi Leo', 'budileo', '12345', 'Pemilik Sistem', 'dept_nsmandiri')
ON CONFLICT (id) DO NOTHING;

-- Default Phases
INSERT INTO phases (id, title, description, icon, color_class, status, status_color, sort_order, dept_id) VALUES
(1, 'Desain & Pra-Cetak', 'Pembuatan konsep desain dan persiapan file cetak', 'brush', 'indigo', 'AKTIF', 'emerald', 0, 'dept_nsmandiri'),
(2, 'Cetak Produksi', 'Proses mesin cetak large format (MMT, Stiker, Indoor)', 'print', 'amber', 'TERTUNDA', 'amber', 1, 'dept_nsmandiri'),
(3, 'Las & Rangka', 'Pembuatan struktur billboard dan neon box', 'precision_manufacturing', 'indigo', 'BELUM MULAI', 'slate', 2, 'dept_nsmandiri'),
(4, 'Quality Control & Finishing', 'Pengecekan kualitas akhir dan penempelan', 'verified', 'purple', 'BELUM MULAI', 'slate', 3, 'dept_nsmandiri')
ON CONFLICT (id) DO NOTHING;

-- Default Token Rates
INSERT INTO token_rates (activity_code, cost) VALUES
('Login', 1), ('Drag Kanban', 2), ('Simpan Produk SPK', 5),
('Komentar', 1), ('Simpan QC', 2), ('Pencarian Data', 2),
('Produksi Selesai', 5), ('Batal SPK', 2), ('Print Label', 1),
('Edit Produk', 3), ('Download Excel', 3), ('Download PDF', 3)
ON CONFLICT (activity_code) DO NOTHING;

-- ═══════════ ROW LEVEL SECURITY ═══════════

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_rates ENABLE ROW LEVEL SECURITY;

-- Allow anon access (public read/write for client-side app)
CREATE POLICY "Allow all for anon" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON phases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON kanban_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON activity_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON qc_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON token_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON token_rates FOR ALL USING (true) WITH CHECK (true);

-- ═══════════ INDEXES ═══════════
CREATE INDEX IF NOT EXISTS idx_cards_dept ON kanban_cards(dept_id);
CREATE INDEX IF NOT EXISTS idx_cards_phase ON kanban_cards(phase_id);
CREATE INDEX IF NOT EXISTS idx_history_card ON activity_history(card_id);
CREATE INDEX IF NOT EXISTS idx_history_dept ON activity_history(dept_id);
CREATE INDEX IF NOT EXISTS idx_qc_card ON qc_records(card_id);
CREATE INDEX IF NOT EXISTS idx_qc_dept ON qc_records(dept_id);
CREATE INDEX IF NOT EXISTS idx_reviews_card ON reviews(card_id);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(dept_id);
CREATE INDEX IF NOT EXISTS idx_phases_dept ON phases(dept_id);
