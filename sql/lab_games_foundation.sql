begin;

-- =========================
-- Lab Games: foundation
-- =========================
-- Estrutura inicial para jogos em laboratório e publicação controlada.

create table if not exists public.games (
  id text primary key,
  slug text not null unique,
  title text not null,
  subtitle text null,
  description text null,
  signature boolean not null default false,
  status text not null check (status in ('development', 'internal_test', 'published', 'paused')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.games is 'Catálogo de jogos da plataforma, incluindo jogos em laboratório.';
comment on column public.games.status is 'Estado operacional do jogo: development | internal_test | published | paused.';

create table if not exists public.game_configs (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  version text not null default 'v1',
  attempts_per_day int not null default 3,
  cooldown_minutes int not null default 10,
  daily_xp_cap int not null default 25,
  xp_base_by_hits jsonb not null default '{"0":2,"1":5,"2":10,"3":15,"4":20}'::jsonb,
  streak_bonus jsonb not null default '{"streak3":2,"streak5":3,"streak10":5}'::jsonb,
  timers_by_band jsonb not null default '{}'::jsonb,
  progression_rules jsonb not null default '[]'::jsonb,
  event_flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, version)
);

comment on table public.game_configs is 'Configurações parametrizáveis de gameplay, XP e progressão por versão.';

create table if not exists public.game_publications (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade unique,
  published boolean not null default false,
  published_at timestamptz null,
  published_by uuid null references auth.users(id) on delete set null,
  paused_at timestamptz null,
  paused_by uuid null references auth.users(id) on delete set null,
  visibility_rule text not null default 'admin_only' check (visibility_rule in ('admin_only', 'eligible_students')),
  updated_at timestamptz not null default now()
);

comment on table public.game_publications is 'Controle de liberação para alunos e histórico de publicação/pausa.';

create table if not exists public.game_attempts (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_date date not null default (now()::date),
  attempt_number int not null check (attempt_number between 1 and 3),
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  status text not null default 'started' check (status in ('started', 'completed', 'abandoned')),
  hits int not null default 0 check (hits between 0 and 4),
  total_questions int not null default 4,
  xp_base int not null default 0,
  xp_streak_bonus int not null default 0,
  xp_awarded int not null default 0,
  percentile numeric(5,2) null,
  percentile_window text null default 'daily',
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.game_attempts is 'Tentativas diárias por usuário, com acertos e XP concedido.';

create index if not exists idx_game_attempts_user_date on public.game_attempts (user_id, attempt_date desc);
create index if not exists idx_game_attempts_game_date on public.game_attempts (game_id, attempt_date desc);

create table if not exists public.game_daily_results (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  result_date date not null default (now()::date),
  attempts_used int not null default 0,
  best_hits int not null default 0 check (best_hits between 0 and 4),
  xp_awarded int not null default 0,
  streak_days int not null default 0,
  avg_hits_rolling numeric(4,2) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, user_id, result_date)
);

comment on table public.game_daily_results is 'Resumo diário do melhor desempenho e streak por jogador.';

create table if not exists public.game_questions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  source text not null default 'mock' check (source in ('mock', 'ai', 'manual')),
  phase_category text not null check (phase_category in ('reflexo', 'logica', 'conhecimento', 'lideranca')),
  grade text not null,
  band text not null check (band in ('exploradores', 'cacadores', 'estrategistas')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  prompt text not null,
  options jsonb not null,
  correct_option_index int not null check (correct_option_index between 0 and 3),
  explanation text not null,
  tags text[] not null default '{}',
  estimated_read_time int not null default 10,
  is_safe boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.game_questions is 'Banco de questões aprovadas para execução do jogo.';

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  event_type text not null check (event_type in ('weekly', 'monthly', 'surprise')),
  title text not null,
  description text null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default false,
  bonus_rule jsonb not null default '{}'::jsonb,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.game_events is 'Eventos temporários que ajustam bônus e regras do jogo.';

create table if not exists public.game_progress (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null,
  total_xp int not null default 0,
  tests_completed int not null default 0,
  average_hits numeric(4,2) not null default 0,
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (game_id, user_id)
);

comment on table public.game_progress is 'Progressão na Trilha do Lobo (nível, XP e consistência).';

create table if not exists public.game_percentiles (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  grade text not null,
  window_date date not null default (now()::date),
  percentile numeric(5,2) not null,
  sample_size int not null default 0,
  computed_at timestamptz not null default now(),
  unique (game_id, grade, window_date, percentile)
);

comment on table public.game_percentiles is 'Distribuições de desempenho para cálculo de percentil anônimo por série.';

create table if not exists public.game_ai_generations (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  requested_by uuid null references auth.users(id) on delete set null,
  grade text not null,
  band text not null,
  category text not null,
  difficulty text not null,
  model text null,
  prompt_snapshot text not null,
  response_snapshot jsonb null,
  status text not null check (status in ('success', 'fallback_mock', 'failed')),
  error_message text null,
  latency_ms int null,
  created_at timestamptz not null default now()
);

comment on table public.game_ai_generations is 'Auditoria das gerações IA e uso de fallback para previsibilidade.';

-- Seed inicial: Teste dos Lobos
insert into public.games (id, slug, title, subtitle, description, signature, status, is_active)
values (
  'game_teste_dos_lobos',
  'teste-dos-lobos',
  'Teste dos Lobos',
  'Jogo assinatura da Trilha do Lobo',
  'Desafio diário com 4 fases fixas, adaptação por série e competição anônima por percentil.',
  true,
  'internal_test',
  true
)
on conflict (id) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  description = excluded.description,
  updated_at = now();

insert into public.game_configs (game_id, version, attempts_per_day, cooldown_minutes, daily_xp_cap, timers_by_band, progression_rules)
values (
  'game_teste_dos_lobos',
  'v1',
  3,
  10,
  25,
  jsonb_build_object(
    'exploradores', jsonb_build_object('reflexo', 10, 'logica', 22, 'conhecimento', 18, 'lideranca', 22),
    'cacadores', jsonb_build_object('reflexo', 8, 'logica', 18, 'conhecimento', 15, 'lideranca', 18),
    'estrategistas', jsonb_build_object('reflexo', 7, 'logica', 15, 'conhecimento', 12, 'lideranca', 15)
  ),
  jsonb_build_array(
    jsonb_build_object('level', 'Filhote', 'minXp', 0, 'minTests', 0, 'minAverageHits', 0),
    jsonb_build_object('level', 'Explorador', 'minXp', 80, 'minTests', 5, 'minAverageHits', 2),
    jsonb_build_object('level', 'Caçador', 'minXp', 200, 'minTests', 12, 'minAverageHits', 2.5),
    jsonb_build_object('level', 'Estrategista', 'minXp', 400, 'minTests', 25, 'minAverageHits', 3),
    jsonb_build_object('level', 'Guardião', 'minXp', 700, 'minTests', 40, 'minAverageHits', 3.2),
    jsonb_build_object('level', 'Mestre da Trilha', 'minXp', 1000, 'minTests', 60, 'minAverageHits', 3.5)
  )
)
on conflict (game_id, version) do nothing;

insert into public.game_publications (game_id, published, visibility_rule)
values ('game_teste_dos_lobos', false, 'admin_only')
on conflict (game_id) do nothing;

commit;

