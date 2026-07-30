-- =============================================================
-- Seed de desenvolvimento
-- =============================================================

insert into public.ranks (name, rank_order, required_points, maintenance_points, description) values
  ('Bronze',   0,      0,     0, 'Rank inicial de todo novo afiliado.'),
  ('Prata',    1,    500,   200, 'Primeira graduação: exige constância mensal.'),
  ('Ouro',     2,   2000,   600, 'Liderança consolidada na rede.'),
  ('Platina',  3,   6000,  1500, 'Equipe ativa em múltiplos níveis.'),
  ('Diamante', 4,  15000,  3500, 'Alta performance e rede madura.'),
  ('Black',    5,  40000,  8000, 'Topo da carreira.')
on conflict (name) do nothing;

insert into public.prizes (name, description, required_points, sort_order) values
  ('Kit de Boas-vindas',    'Kit físico com materiais impressos e brindes da marca.',   250, 1),
  ('Fone Bluetooth',        'Fone sem fio para uso no dia a dia.',                     1000, 2),
  ('Smartwatch',            'Relógio inteligente com monitor de atividades.',           3000, 3),
  ('Notebook',              'Notebook para escalar sua operação.',                     10000, 4),
  ('Viagem Internacional',  'Viagem com acompanhante para a convenção anual.',         30000, 5)
on conflict do nothing;

insert into public.marketing_materials (title, description, type, file_url, width, height, sort_order) values
  ('Banner Stories 1080x1920', 'Story vertical para Instagram e WhatsApp.', 'banner', '/materials/story-01.png', 1080, 1920, 1),
  ('Post Feed 1080x1080',      'Post quadrado para o feed.',                'banner', '/materials/feed-01.png',  1080, 1080, 2),
  ('Banner Horizontal 1200x628','Capa para Facebook e LinkedIn.',           'banner', '/materials/cover-01.png', 1200,  628, 3),
  ('Vídeo de Apresentação',    'Vídeo curto explicando a oportunidade.',    'video',  '/materials/pitch.mp4',    1080, 1920, 4)
on conflict do nothing;

-- Após criar o usuário no Auth, promova-o a admin:
-- update public.users set is_admin = true where username = 'seu_usuario';
