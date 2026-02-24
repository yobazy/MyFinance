-- MyFinance: queue RPC helpers for atomic job dequeue
-- Run after 001_init.sql

-- Atomically claim the next queued job for a worker.
-- Uses SKIP LOCKED so multiple workers can run safely.
create or replace function public.dequeue_processing_job(p_locked_by text)
returns public.processing_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.processing_jobs;
begin
  select *
    into v_job
  from public.processing_jobs
  where status = 'queued'
  order by created_at asc
  for update skip locked
  limit 1;

  if v_job.id is null then
    return null;
  end if;

  update public.processing_jobs
  set
    status = 'running',
    locked_at = now(),
    locked_by = p_locked_by,
    attempts = attempts + 1
  where id = v_job.id;

  select * into v_job from public.processing_jobs where id = v_job.id;
  return v_job;
end;
$$;

revoke all on function public.dequeue_processing_job(text) from public;
grant execute on function public.dequeue_processing_job(text) to service_role;

