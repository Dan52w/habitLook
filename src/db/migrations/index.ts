export const MIGRATIONS = [
  {
    name: '001_init',
    statements: [
      `CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,

      `CREATE TABLE time_blocks (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        day_of_week INTEGER,
        is_recurring INTEGER NOT NULL DEFAULT 0
      );`,
      `CREATE INDEX idx_time_blocks_category ON time_blocks(category_id);`,

      `CREATE TABLE goals (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        target_type TEXT NOT NULL CHECK (target_type IN ('duration','count','boolean')),
        target_value REAL NOT NULL,
        period TEXT NOT NULL CHECK (period IN ('daily','weekly'))
      );`,
      `CREATE INDEX idx_goals_category ON goals(category_id);`,

      `CREATE TABLE goal_progress (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        value REAL NOT NULL DEFAULT 0,
        completed INTEGER NOT NULL DEFAULT 0,
        UNIQUE(goal_id, date)
      );`,
      `CREATE INDEX idx_goal_progress_goal_date ON goal_progress(goal_id, date);`,

      `CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        time_block_id TEXT REFERENCES time_blocks(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,

      `CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );`,

      `CREATE TABLE sync_meta (
        device_id TEXT PRIMARY KEY,
        last_synced_at TEXT,
        pending_changes INTEGER NOT NULL DEFAULT 0
      );`,

      `CREATE TABLE expenses (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income','expense')),
        category TEXT,
        note TEXT,
        date TEXT NOT NULL
      );`,
      `CREATE INDEX idx_expenses_date ON expenses(date);`,

      `CREATE TABLE app_usage_daily (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        app_name TEXT NOT NULL,
        date TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        source TEXT NOT NULL CHECK (source IN ('android_usagestats','ios_screentime')),
        UNIQUE(package_name, date)
      );`,
      `CREATE INDEX idx_app_usage_date ON app_usage_daily(date);`,
    ],
  },
  {
    name: '002_accounting',
    statements: [
      `CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('bank','cash','other')),
        color TEXT,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,

      `CREATE TABLE expense_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT,
        icon TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,

      `ALTER TABLE expenses ADD COLUMN category_id TEXT REFERENCES expense_categories(id) ON DELETE SET NULL;`,
      `ALTER TABLE expenses ADD COLUMN account_id TEXT REFERENCES accounts(id) ON DELETE RESTRICT;`,
      `ALTER TABLE expenses DROP COLUMN category;`,

      `CREATE INDEX idx_expenses_account ON expenses(account_id);`,
      `CREATE INDEX idx_expenses_category ON expenses(category_id);`,
    ],
  },
  {
    name: '003_schedule_dates',
    statements: [
      `ALTER TABLE time_blocks ADD COLUMN schedule_date TEXT;`,
      `CREATE INDEX idx_time_blocks_schedule_date ON time_blocks(schedule_date);`,
    ],
  },
  {
    name: '004_account_transfers',
    statements: [
      `CREATE TABLE transfers (
        id TEXT PRIMARY KEY,
        from_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        to_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        amount REAL NOT NULL CHECK (amount > 0),
        note TEXT,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );`,
      `CREATE INDEX idx_transfers_date ON transfers(date);`,
      `CREATE INDEX idx_transfers_from ON transfers(from_account_id);`,
      `CREATE INDEX idx_transfers_to ON transfers(to_account_id);`,
    ],
  },
  {
    name: '005_expense_splits',
    statements: [
      `CREATE TABLE expense_splits (
        id TEXT PRIMARY KEY,
        expense_id TEXT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        amount REAL NOT NULL CHECK (amount > 0)
      );`,
      `CREATE INDEX idx_expense_splits_expense ON expense_splits(expense_id);`,
      `CREATE INDEX idx_expense_splits_account ON expense_splits(account_id);`,
    ],
  },
  {
    name: '006_notes_dates_and_category_icons',
    statements: [
      `ALTER TABLE categories ADD COLUMN emoji TEXT;`,
      `ALTER TABLE notes ADD COLUMN note_date TEXT;`,
      `CREATE INDEX idx_notes_note_date ON notes(note_date);`,
    ],
  },
  {
    // Una excepción oculta una ocurrencia de una serie sin modificarla.
    name: '007_time_block_exceptions',
    statements: [
      `CREATE TABLE time_block_exceptions (
        time_block_id TEXT NOT NULL REFERENCES time_blocks(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        PRIMARY KEY (time_block_id, date)
      );`,
      `CREATE INDEX idx_time_block_exceptions_date ON time_block_exceptions(date);`,
    ],
  },
  {
    name: '008_time_block_status',
    statements: [
      `CREATE TABLE time_block_status (
        time_block_id TEXT NOT NULL REFERENCES time_blocks(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        PRIMARY KEY (time_block_id, date)
      );`,
      `CREATE INDEX idx_time_block_status_date ON time_block_status(date);`,
    ],
  },
  {
    // Categorías de gasto iniciales para que un usuario nuevo pueda registrar
    // movimientos sin configurar nada. Cada fila se inserta solo si no existe.
    name: '009_expense_category_seeds',
    statements: [
      `INSERT INTO expense_categories (id, name, color, icon) SELECT 'seed-cat-comida', 'Comida', '#F5B86B', '🍽️' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE id = 'seed-cat-comida');`,
      `INSERT INTO expense_categories (id, name, color, icon) SELECT 'seed-cat-transporte', 'Transporte', '#58BDEB', '🚌' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE id = 'seed-cat-transporte');`,
      `INSERT INTO expense_categories (id, name, color, icon) SELECT 'seed-cat-salud', 'Salud', '#64D9A0', '🩺' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE id = 'seed-cat-salud');`,
      `INSERT INTO expense_categories (id, name, color, icon) SELECT 'seed-cat-hogar', 'Hogar', '#A78BFA', '🏠' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE id = 'seed-cat-hogar');`,
      `INSERT INTO expense_categories (id, name, color, icon) SELECT 'seed-cat-ocio', 'Ocio', '#F08CA0', '🎮' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE id = 'seed-cat-ocio');`,
      `INSERT INTO expense_categories (id, name, color, icon) SELECT 'seed-cat-educacion', 'Educación', '#7CC7FF', '📚' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE id = 'seed-cat-educacion');`,
      `INSERT INTO expense_categories (id, name, color, icon) SELECT 'seed-cat-compras', 'Compras', '#E8C15A', '🛒' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE id = 'seed-cat-compras');`,
      `INSERT INTO expense_categories (id, name, color, icon) SELECT 'seed-cat-otros', 'Otros', '#9AA0B0', '📦' WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE id = 'seed-cat-otros');`,
    ],
  },
];
