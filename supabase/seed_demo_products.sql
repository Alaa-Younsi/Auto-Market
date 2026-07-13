-- DEMO DATA (optional): 8 sample products + placeholder images + reviews so the
-- storefront looks alive while you photograph real inventory.
-- Placeholder photos come from picsum.photos — replace with real product photos
-- via the admin panel before launch. Safe to re-run: skips rows that exist.

with cat as (
  select slug, id from categories
)
insert into products (slug, name_fr, name_ar, description_fr, description_ar,
  details_fr, details_ar, price, compare_at_price, category_id, stock,
  colors, sizes, featured, status, quantity_offers)
select * from (values
  (
    'phares-led-h7-6000k',
    'Ampoules LED H7 6000K (paire)',
    'مصابيح LED H7 6000K (زوج)',
    'Paire d''ampoules LED H7 ultra-lumineuses, blanc pur 6000K, installation plug & play.',
    'زوج مصابيح LED H7 فائقة السطوع، أبيض نقي 6000K، تركيب سهل ومباشر.',
    array['12 000 lumens la paire', 'Durée de vie 50 000 h', 'Ventilateur de refroidissement intégré'],
    array['12000 لومن للزوج', 'عمر افتراضي 50000 ساعة', 'مروحة تبريد مدمجة'],
    3500::numeric, 4500::numeric,
    (select id from cat where slug = 'eclairage'),
    40, '[]'::jsonb, '["H1","H4","H7"]'::jsonb, true, 'active',
    '[{"type":"free","buy":2,"get":1}]'::jsonb
  ),
  (
    'housses-sieges-universelles',
    'Housses de sièges universelles (kit complet)',
    'أغطية مقاعد شاملة (طقم كامل)',
    'Kit complet 9 pièces en similicuir respirant, compatible avec la plupart des berlines et SUV.',
    'طقم كامل من 9 قطع من الجلد الصناعي المسامي، متوافق مع معظم السيارات.',
    array['9 pièces', 'Similicuir lavable', 'Compatible airbags latéraux'],
    array['9 قطع', 'جلد صناعي قابل للغسل', 'متوافق مع الوسائد الهوائية الجانبية'],
    7900::numeric, 9500::numeric,
    (select id from cat where slug = 'interieur'),
    25, '["Noir","Beige","Rouge"]'::jsonb, '[]'::jsonb, true, 'active',
    '[]'::jsonb
  ),
  (
    'camera-recul-hd-vision-nocturne',
    'Caméra de recul HD vision nocturne',
    'كاميرا خلفية HD برؤية ليلية',
    'Caméra de recul étanche IP68 avec grand angle 170° et vision nocturne, écran non inclus.',
    'كاميرا خلفية مقاومة للماء IP68 بزاوية واسعة 170 درجة ورؤية ليلية.',
    array['Angle 170°', 'Étanche IP68', 'Lignes de guidage dynamiques'],
    array['زاوية 170 درجة', 'مقاومة للماء IP68', 'خطوط توجيه ديناميكية'],
    2800::numeric, null,
    (select id from cat where slug = 'securite'),
    60, '[]'::jsonb, '[]'::jsonb, true, 'active',
    '[{"type":"price","qty":2,"price":4900}]'::jsonb
  ),
  (
    'compresseur-air-portable-12v',
    'Compresseur d''air portable 12V',
    'ضاغط هواء محمول 12 فولت',
    'Gonfleur digital 12V avec arrêt automatique, gonfle un pneu 205/55 R16 en 3 minutes.',
    'منفاخ رقمي 12 فولت مع توقف تلقائي، ينفخ إطار 205/55R16 في 3 دقائق.',
    array['Écran digital', 'Arrêt automatique', 'Câble 3 m + sacoche'],
    array['شاشة رقمية', 'توقف تلقائي', 'كابل 3 أمتار + حقيبة'],
    5200::numeric, 6500::numeric,
    (select id from cat where slug = 'outillage'),
    30, '[]'::jsonb, '[]'::jsonb, true, 'active',
    '[]'::jsonb
  ),
  (
    'tapis-caoutchouc-3d',
    'Tapis 3D en caoutchouc (4 pièces)',
    'دواسات ثلاثية الأبعاد مطاطية (4 قطع)',
    'Tapis de sol 3D antidérapants à rebords hauts, découpables pour un ajustement parfait.',
    'دواسات أرضية ثلاثية الأبعاد مانعة للانزلاق بحواف عالية.',
    array['Rebords hauts anti-débordement', 'Caoutchouc sans odeur', 'Lavables à l''eau'],
    array['حواف عالية', 'مطاط بدون رائحة', 'قابلة للغسل بالماء'],
    3200::numeric, null,
    (select id from cat where slug = 'interieur'),
    50, '["Noir","Gris"]'::jsonb, '[]'::jsonb, false, 'active',
    '[{"type":"free","buy":3,"get":1}]'::jsonb
  ),
  (
    'chargeur-voiture-65w',
    'Chargeur voiture USB-C 65W',
    'شاحن سيارة USB-C بقوة 65 واط',
    'Chargeur allume-cigare double port (USB-C PD 65W + USB-A QC 3.0) en alliage d''aluminium.',
    'شاحن ولاعة السيارة بمنفذين (USB-C PD 65W و USB-A QC 3.0) من الألمنيوم.',
    array['USB-C PD 65W', 'USB-A Quick Charge 3.0', 'Corps aluminium'],
    array['USB-C PD بقوة 65 واط', 'USB-A بشحن سريع 3.0', 'هيكل من الألمنيوم'],
    1800::numeric, 2400::numeric,
    (select id from cat where slug = 'audio-multimedia'),
    100, '[]'::jsonb, '[]'::jsonb, false, 'active',
    '[{"type":"price","qty":2,"price":3000}]'::jsonb
  ),
  (
    'kit-polissage-phares',
    'Kit rénovation phares',
    'طقم تلميع المصابيح الأمامية',
    'Kit complet pour restaurer la transparence des optiques jaunis : ponçage, polish et protection UV.',
    'طقم كامل لاستعادة شفافية المصابيح الصفراء: صنفرة وتلميع وحماية من الأشعة.',
    array['Résultat en 20 minutes', 'Protection UV incluse', 'Pour 2 phares'],
    array['نتيجة في 20 دقيقة', 'حماية من الأشعة فوق البنفسجية', 'يكفي لمصباحين'],
    2400::numeric, null,
    (select id from cat where slug = 'entretien'),
    45, '[]'::jsonb, '[]'::jsonb, false, 'active',
    '[]'::jsonb
  ),
  (
    'barres-de-toit-aluminium',
    'Barres de toit aluminium verrouillables',
    'قضبان سقف من الألمنيوم قابلة للقفل',
    'Paire de barres de toit universelles en aluminium avec serrure antivol, charge max 75 kg.',
    'زوج قضبان سقف شاملة من الألمنيوم مع قفل ضد السرقة، حمولة قصوى 75 كغ.',
    array['Charge max 75 kg', 'Serrure antivol', 'Montage sans outils'],
    array['حمولة قصوى 75 كغ', 'قفل ضد السرقة', 'تركيب بدون أدوات'],
    8900::numeric, 11000::numeric,
    (select id from cat where slug = 'exterieur'),
    15, '[]'::jsonb, '["120 cm","135 cm"]'::jsonb, false, 'active',
    '[]'::jsonb
  )
) as v
where not exists (select 1 from products p where p.slug = (v.column1));

-- Placeholder images (one per product) — replace via the admin panel.
insert into product_images (product_id, url, sort_order)
select p.id, 'https://picsum.photos/seed/' || p.slug || '/800/800', 0
from products p
where p.slug in (
  'phares-led-h7-6000k','housses-sieges-universelles','camera-recul-hd-vision-nocturne',
  'compresseur-air-portable-12v','tapis-caoutchouc-3d','chargeur-voiture-65w',
  'kit-polissage-phares','barres-de-toit-aluminium'
)
and not exists (select 1 from product_images pi where pi.product_id = p.id);

-- A few demo reviews for the landing marquee (skips ones already present)
insert into client_reviews (client_name, stars, review_text, active)
select * from (values
  ('Yacine B.', 5, 'Livraison rapide à Alger, produit conforme. Je recommande.', true),
  ('Amine K.', 5, 'Très bonne qualité, le paiement à la livraison est rassurant.', true),
  ('Sofiane M.', 4, 'Bon rapport qualité/prix, livré en 48h à Oran.', true),
  ('محمد ل.', 5, 'خدمة ممتازة والتوصيل سريع، المنتج أصلي.', true)
) as v(client_name, stars, review_text, active)
where not exists (
  select 1 from client_reviews cr where cr.client_name = v.client_name and cr.review_text = v.review_text
);
