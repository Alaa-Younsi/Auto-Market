-- Turn off free shipping entirely.
-- Paste this whole file into the Supabase SQL Editor and run it once.
--
-- The 5000 DA threshold was the scaffold default, not a decision — with this
-- catalogue's prices it silently made most orders ship free. NULL means "no
-- free-shipping offer": place_order's check
--   (v_subtotal - v_discount) >= v_settings.free_ship_threshold
-- evaluates to NULL (falsy in plpgsql IF) so the wilaya fee always applies,
-- and the checkout UI's resolveShipping() treats a null threshold the same
-- way. Re-enable later by setting a number again — no code change needed.

alter table store_settings alter column free_ship_threshold drop not null;

update store_settings set free_ship_threshold = null where id = 1;
