#!/bin/sh
# Starts the server under Litestream when a backup bucket is set: restores the
# database from the bucket if the volume has none (a new or replaced volume),
# then replicates it for as long as the server runs. Without a bucket (local
# runs, or before backups are set up) it just starts the server.
set -e
if [ -n "$BUCKET_NAME" ]; then
  litestream restore -config /app/litestream.yml -if-db-not-exists -if-replica-exists "$DB_PATH"
  exec litestream replicate -config /app/litestream.yml -exec "node src/index.ts"
fi
exec node src/index.ts
