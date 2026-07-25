-- `products.colors` used to be a plain jsonb array of strings (e.g. "Noir").
-- The product page now supports a per-color photo + hex swatch, so each
-- entry becomes an object: { label_fr, label_ar, hex, image_url }.
-- Convert any existing string entries in place; object entries are left
-- untouched (safe to re-run).
update products
set colors = (
  select jsonb_agg(
    case
      when jsonb_typeof(elem) = 'string' then
        jsonb_build_object(
          'label_fr', elem #>> '{}',
          'label_ar', elem #>> '{}',
          'hex', '#a3a3a3',
          'image_url', null
        )
      else elem
    end
  )
  from jsonb_array_elements(colors) as elem
)
where jsonb_typeof(colors) = 'array'
  and exists (
    select 1 from jsonb_array_elements(colors) as elem where jsonb_typeof(elem) = 'string'
  );
