-- Remove optional demo chapter (deprecated). Safe to run even if demo never existed.

DELETE FROM organizations WHERE id = '11111111-1111-1111-1111-111111111111';
