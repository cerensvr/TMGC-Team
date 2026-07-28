alter table if exists user_products
    add column if not exists is_active boolean default true;

update user_products
set is_active = true
where is_active is null;
