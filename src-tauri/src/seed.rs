use rusqlite::{Connection, Result};

pub fn seed_all(conn: &Connection) -> Result<()> {
    seed_accounts(conn)?;
    seed_categories(conn)?;
    seed_transactions(conn)?;
    Ok(())
}

fn seed_accounts(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "INSERT OR IGNORE INTO accounts VALUES
          ('acc_corrente', 'Conta Corrente', 'Nubank',  'checking',   8742.35,  '#8B5CF6', 'wallet',      '4921'),
          ('acc_poupanca', 'Poupança',        'Caixa',   'savings',   14300.00,  '#0EA5E9', 'piggy-bank',  '7712'),
          ('acc_credito',  'Cartão de Crédito','Itaú',   'credit',    -1284.90,  '#F97316', 'credit-card', '2048');",
    )
}

fn seed_categories(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "INSERT OR IGNORE INTO categories VALUES
          ('cat_salario',    'Salário',      '#10B981', 'briefcase',   'income'),
          ('cat_freela',     'Freelance',    '#22C55E', 'sparkles',    'income'),
          ('cat_rendimentos','Rendimentos',  '#14B8A6', 'trending-up', 'income'),
          ('cat_moradia',    'Moradia',      '#6366F1', 'home',        'expense'),
          ('cat_alimentacao','Alimentação',  '#F59E0B', 'utensils',    'expense'),
          ('cat_transporte', 'Transporte',   '#EF4444', 'car',         'expense'),
          ('cat_lazer',      'Lazer',        '#EC4899', 'film',        'expense'),
          ('cat_saude',      'Saúde',        '#06B6D4', 'heart-pulse', 'expense'),
          ('cat_assinaturas','Assinaturas',  '#A855F7', 'repeat',      'expense');",
    )
}

fn seed_transactions(conn: &Connection) -> Result<()> {
    // Uses SQLite date() so relative offsets stay correct on every first launch
    conn.execute_batch(
        "INSERT OR IGNORE INTO transactions
           (id, title, amount, date, account_id, category_id, type, is_projected, notes, recurrence_id)
         VALUES
          ('txn_001','Salário — Abril',       7800.00, date('now','-12 days'),'acc_corrente','cat_salario',    'income', 0, NULL,'rec_salario'),
          ('txn_002','Aluguel',               2350.00, date('now','-10 days'),'acc_corrente','cat_moradia',    'expense',0, NULL,'rec_aluguel'),
          ('txn_003','Mercado Pão de Açúcar',  487.22, date('now','-6 days'), 'acc_credito', 'cat_alimentacao','expense',0, NULL, NULL),
          ('txn_004','Uber — Semana',          142.80, date('now','-4 days'), 'acc_credito', 'cat_transporte', 'expense',0, NULL, NULL),
          ('txn_005','Freelance — Landing Page',1200.00,date('now','-3 days'),'acc_corrente','cat_freela',     'income', 0, NULL, NULL),
          ('txn_006','Cinema Iguatemi',         96.50, date('now','-1 days'), 'acc_credito', 'cat_lazer',      'expense',0, NULL, NULL),
          ('txn_007','Almoço — Restaurante',    58.90, date('now'),           'acc_credito', 'cat_alimentacao','expense',0, NULL, NULL),
          ('txn_008','Netflix',                 55.90, date('now','+2 days'), 'acc_credito', 'cat_assinaturas','expense',1, NULL,'rec_netflix'),
          ('txn_009','Spotify Família',          34.90, date('now','+3 days'), 'acc_credito', 'cat_assinaturas','expense',1, NULL,'rec_spotify'),
          ('txn_010','Academia',               129.90, date('now','+5 days'), 'acc_corrente','cat_saude',      'expense',1, NULL,'rec_academia'),
          ('txn_011','Fatura do Cartão',       1284.90, date('now','+8 days'), 'acc_corrente','cat_moradia',   'expense',1, NULL, NULL),
          ('txn_012','Rendimento Poupança',      73.50, date('now','+14 days'),'acc_poupanca','cat_rendimentos','income', 1, NULL,'rec_rendimento'),
          ('txn_013','Salário — Maio',          7800.00,date('now','+18 days'),'acc_corrente','cat_salario',   'income', 1, NULL,'rec_salario'),
          ('txn_014','Aluguel',                2350.00,date('now','+20 days'),'acc_corrente','cat_moradia',    'expense',1, NULL,'rec_aluguel');",
    )
}
