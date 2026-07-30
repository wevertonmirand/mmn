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
on conflict (name) do nothing;

insert into public.marketing_materials (title, description, type, file_url, width, height, sort_order) values
  ('Banner Stories 1080x1920', 'Story vertical para Instagram e WhatsApp.', 'banner', '/materials/story-01.png', 1080, 1920, 1),
  ('Post Feed 1080x1080',      'Post quadrado para o feed.',                'banner', '/materials/feed-01.png',  1080, 1080, 2),
  ('Banner Horizontal 1200x628','Capa para Facebook e LinkedIn.',           'banner', '/materials/cover-01.png', 1200,  628, 3),
  ('Vídeo de Apresentação',    'Vídeo curto explicando a oportunidade.',    'video',  '/materials/pitch.mp4',    1080, 1920, 4)
on conflict (title) do nothing;

-- Catálogo da loja. points_value é o que a venda injeta na rede
-- quando o admin fecha o pedido.
insert into public.products (name, description, sku, price_cents, points_value, sort_order) values
  ('Whey Protein 900g',  'Proteína isolada, sabor baunilha.',     'WP-900', 15990, 30, 1),
  ('Creatina 300g',      'Creatina monohidratada pura.',          'CR-300',  8990, 15, 2),
  ('Multivitamínico',    'Complexo vitamínico com 60 cápsulas.',  'MV-060',  4990,  8, 3),
  ('Kit Iniciante',      'Whey + creatina + coqueteleira.',       'KIT-01', 22990, 45, 4),
  ('Coqueteleira 700ml', 'Coqueteleira com misturador.',          'CQ-700',  3490,  5, 5)
on conflict (sku) do nothing;

-- Após criar o usuário no Auth, promova-o a admin:
-- update public.users set is_admin = true where username = 'seu_usuario';
