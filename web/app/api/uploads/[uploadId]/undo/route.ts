import { createSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function validateBearerUserJwt(token: string): string | null {
  if (!token) return 'Missing Bearer token';
  if (/\s/.test(token)) {
    return 'Invalid Bearer token: contains whitespace/newlines. Send a Supabase user access token (JWT) from the browser session, not an API key.';
  }
  if (token.startsWith('sb_secret_') || token.startsWith('sb_publishable_')) {
    return 'Invalid Bearer token: looks like a Supabase API key (sb_*), not a user access token (JWT). In the browser, you must send `session.access_token` from Supabase Auth.';
  }
  if (!token.startsWith('eyJ')) {
    return 'Invalid Bearer token: expected a JWT (starts with "eyJ"). Ensure you are logged in via Supabase Auth and you are sending the user session access token.';
  }
  return null;
}

type UploadUndoRow = {
  id: string;
  user_id: string;
  status: string;
  storage_path: string;
  rows_reversed: number;
};

function canUndoStatus(status: string) {
  return status === 'succeeded' || status === 'reverse_failed';
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ uploadId: string }> },
) {
  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ')
    ? authz.slice('bearer '.length).trim()
    : '';

  const tokenErr = validateBearerUserJwt(token);
  if (tokenErr) return json(401, { error: tokenErr });

  const supabase = createSupabaseAdminClient();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr) return json(401, { error: userErr.message });
  const userId = userData.user?.id;
  if (!userId) return json(401, { error: 'Invalid token' });

  const { uploadId } = await ctx.params;
  if (!uploadId) return json(400, { error: 'Missing uploadId' });

  const { data: upload, error: uploadErr } = await supabase
    .from('uploads')
    .select('id,user_id,status,storage_path,rows_reversed')
    .eq('id', uploadId)
    .eq('user_id', userId)
    .single<UploadUndoRow>();

  if (uploadErr) return json(404, { error: 'Upload not found' });

  if (upload.status === 'reversed') {
    return json(200, {
      ok: true,
      uploadId,
      rowsReversed: upload.rows_reversed ?? 0,
      alreadyReversed: true,
    });
  }

  if (upload.status === 'reversing') {
    return json(409, { error: 'Upload is currently being reversed' });
  }

  if (!canUndoStatus(upload.status)) {
    return json(409, {
      error: `Upload is not undo-eligible from status "${upload.status}"`,
    });
  }

  const { error: markReversingErr } = await supabase
    .from('uploads')
    .update({ status: 'reversing', error: null })
    .eq('id', uploadId)
    .eq('user_id', userId);

  if (markReversingErr) return json(500, { error: markReversingErr.message });

  const markUndoFailed = async (message: string) => {
    await supabase
      .from('uploads')
      .update({ status: 'reverse_failed', error: message })
      .eq('id', uploadId)
      .eq('user_id', userId);
  };

  try {
    const { count, error: countErr } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('upload_id', uploadId);

    if (countErr) {
      await markUndoFailed(countErr.message);
      return json(500, { error: countErr.message });
    }

    const rowsToDelete = count ?? 0;
    const { error: deleteErr } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .eq('upload_id', uploadId);

    if (deleteErr) {
      await markUndoFailed(deleteErr.message);
      return json(500, { error: deleteErr.message });
    }

    if (upload.storage_path) {
      const { error: storageErr } = await supabase.storage
        .from('uploads')
        .remove([upload.storage_path]);
      if (storageErr) {
        await markUndoFailed(storageErr.message);
        return json(500, { error: storageErr.message });
      }
    }

    const { error: markReversedErr } = await supabase
      .from('uploads')
      .update({
        status: 'reversed',
        error: null,
        rows_reversed: rowsToDelete,
        reversed_at: new Date().toISOString(),
      })
      .eq('id', uploadId)
      .eq('user_id', userId);

    if (markReversedErr) return json(500, { error: markReversedErr.message });

    return json(200, { ok: true, uploadId, rowsReversed: rowsToDelete });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markUndoFailed(msg);
    return json(500, { error: msg });
  }
}
