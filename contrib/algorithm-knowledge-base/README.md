# Knowledge base contributions

**Canonical bundled notes** (embedded by AlgoMentor sync) live in:

```
backend/app/data/bundled_notes/
```

This folder mirrors those files for optional upstream PRs to
[algorithm-knowledge-base](https://github.com/BemnetMussa/algorithm-knowledge-base).

## Upstream PR (optional)

```bash
cp -r backend/app/data/bundled_notes/greedy ./greedy          # in your KB fork
cp -r backend/app/data/bundled_notes/bit-manipulation ./bit-manipulation
cp -r backend/app/data/bundled_notes/intervals ./intervals
```

## Local embed (no GitHub required)

Bundled patterns sync automatically when you run:

```bash
curl -X POST http://localhost:8000/api/community/sync -H "Authorization: Bearer <token>"
```

Or set `COMMUNITY_SYNC_ON_STARTUP=true` in `backend/.env`.

## Production storage (Supabase)

```env
USE_LOCAL_STORAGE=false
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
STORAGE_BUCKET=documents
```

Create a **private** `documents` bucket in Supabase Storage. The API stores
durable `supabase-storage://` URIs (no expiring signed URLs during Celery ingest).
