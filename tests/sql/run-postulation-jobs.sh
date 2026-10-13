#!/usr/bin/env bash
# Lance tests/sql/postulation-jobs.sql dans un PostgreSQL jetable.
set -euo pipefail
MIGRATION="${1:?chemin de la migration postulation_jobs}"
DIR="$(mktemp -d)"
trap 'pg_ctl -D "$DIR" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
initdb -D "$DIR" -U postgres >/dev/null
pg_ctl -D "$DIR" -o "-k $DIR -p 54329 -c listen_addresses=''" -w start >/dev/null
psql -h "$DIR" -p 54329 -U postgres -d postgres -v migration="$(realpath "$MIGRATION")" -f "$(dirname "$0")/postulation-jobs.sql"
