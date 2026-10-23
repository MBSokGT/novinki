-- Откат «истории цен» и «подборки для клиента» (миграция 0019): эти функции
-- решили не оставлять. Миграцию 0019 не трогаем — она уже могла быть применена
-- на каких-то серверах, поэтому убираем её следы отдельным шагом.
DROP TABLE IF EXISTS price_changes;
DROP TABLE IF EXISTS selections;

ALTER TABLE products DROP COLUMN price_prev;
ALTER TABLE products DROP COLUMN price_changed_at;
ALTER TABLE deleted_products DROP COLUMN price_prev;
ALTER TABLE deleted_products DROP COLUMN price_changed_at;
ALTER TABLE archived_products DROP COLUMN price_prev;
ALTER TABLE archived_products DROP COLUMN price_changed_at;
