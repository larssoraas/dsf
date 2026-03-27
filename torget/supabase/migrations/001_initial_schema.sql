-- Aktiver extensions
create extension if not exists "uuid-ossp";
create extension if not exists "earthdistance" cascade;

-- Enums
create type listing_category as enum ('electronics','clothing','furniture','sports','books','other');
create type listing_condition as enum ('new','like_new','good','used','for_parts');
create type listing_type as enum ('sale','wanted','free');
create type listing_status as enum ('active','sold','expired','deleted');

-- Profiler (utvider auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  city text,
  avg_rating numeric(2,1) default 0,
  review_count int default 0,
  created_at timestamptz default now()
);

-- Annonser
create table listings (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  price int,
  category listing_category not null,
  condition listing_condition not null,
  listing_type listing_type not null,
  status listing_status not null default 'active',
  location point,
  city text,
  search_vector tsvector generated always as (
    to_tsvector('norwegian', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  view_count int not null default 0,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '30 days'
);

create index listings_search_idx on listings using gin(search_vector);
create index listings_location_idx on listings using gist(location);
create index listings_status_idx on listings(status);
create index listings_seller_idx on listings(seller_id);

-- Bilder
create table listing_images (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz default now()
);

-- Anmeldelser
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewed_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  constraint no_self_review check (reviewer_id != reviewed_id)
);

-- Trigger: opprett profil ved ny bruker
create or replace function handle_new_user()
returns trigger
security definer set search_path = public
as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table reviews enable row level security;

-- Profiles: alle kan lese, kun eier kan endre
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Listings: alle kan lese aktive, kun eier kan opprette/endre/slette
create policy "listings_read" on listings for select using (status = 'active' or seller_id = auth.uid());
create policy "listings_insert" on listings for insert with check (seller_id = auth.uid());
create policy "listings_update" on listings for update using (seller_id = auth.uid());
create policy "listings_delete" on listings for delete using (seller_id = auth.uid());

-- Listing images: følger listing-eierskap
create policy "images_read" on listing_images for select using (true);
create policy "images_insert" on listing_images for insert with check (
  exists (select 1 from listings where id = listing_id and seller_id = auth.uid())
);
create policy "images_delete" on listing_images for delete using (
  exists (select 1 from listings where id = listing_id and seller_id = auth.uid())
);

-- Reviews: autentiserte brukere kan lese/opprette, ingen egenvurdering
create policy "reviews_read" on reviews for select using (true);
create policy "reviews_insert" on reviews for insert with check (
  auth.uid() = reviewer_id and reviewer_id != reviewed_id
);
