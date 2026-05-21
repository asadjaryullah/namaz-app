-- ride_requests: passengers wanting a ride even when no driver available yet
create table if not exists public.ride_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  prayer_id text not null,
  request_date date not null,
  status text not null default 'waiting' check (status in ('waiting', 'matched', 'expired')),
  created_at timestamptz default now(),
  unique(user_id, prayer_id, request_date)
);

-- driver_maybe: drivers expressing soft intent to drive
create table if not exists public.driver_maybe (
  id uuid default gen_random_uuid() primary key,
  driver_id uuid references auth.users(id) on delete cascade not null,
  prayer_id text not null,
  maybe_date date not null,
  created_at timestamptz default now(),
  unique(driver_id, prayer_id, maybe_date)
);

alter table public.ride_requests enable row level security;
alter table public.driver_maybe enable row level security;

create policy "own_requests" on public.ride_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read_requests" on public.ride_requests for select using (true);

create policy "own_maybe" on public.driver_maybe for all using (auth.uid() = driver_id) with check (auth.uid() = driver_id);
create policy "read_maybe" on public.driver_maybe for select using (true);
