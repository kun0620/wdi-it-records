-- Imported machines with user "(To be assigned)" are spares, not in use.
update it.assets set status = 'In Stock', user_name = null where user_name = '(To be assigned)';
