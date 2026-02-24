import { getEnv } from './env.js';
import { createServiceSupabaseClient } from './supabase.js';
import { handleIngestUploadJob } from './jobs/ingestUpload.js';

type ProcessingJob = {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  status: string;
};

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const env = getEnv();
  const supabase = createServiceSupabaseClient();

  // eslint-disable-next-line no-console
  console.log(`[worker] starting: ${env.WORKER_ID}`);

  // Poll loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: job, error } = await supabase.rpc('dequeue_processing_job', {
      p_locked_by: env.WORKER_ID,
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[worker] dequeue error', error);
      await sleep(env.POLL_INTERVAL_MS);
      continue;
    }

    if (!job) {
      await sleep(env.POLL_INTERVAL_MS);
      continue;
    }

    const j = job as ProcessingJob;
    // eslint-disable-next-line no-console
    console.log(`[worker] claimed job ${j.id} type=${j.type}`);

    try {
      if (j.type === 'ingest_upload') {
        const result = await handleIngestUploadJob({ supabase, job: j });
        await supabase
          .from('processing_jobs')
          .update({ status: 'succeeded', last_error: null })
          .eq('id', j.id);

        // eslint-disable-next-line no-console
        console.log(
          `[worker] job ${j.id} succeeded rowsProcessed=${result.rowsProcessed}`
        );
      } else {
        throw new Error(`Unsupported job type: ${j.type}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error(`[worker] job ${j.id} failed`, msg);

      await supabase
        .from('processing_jobs')
        .update({ status: 'failed', last_error: msg })
        .eq('id', j.id);
    }
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('[worker] fatal', e);
  process.exit(1);
});

