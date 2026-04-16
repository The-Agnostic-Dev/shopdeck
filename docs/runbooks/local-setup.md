# Runbook: local Postgres without Docker

If you cannot run Docker, a throwaway cluster works fine:

```bash
initdb -D ~/.shopdeck-pg -U shopdeck --auth=trust
pg_ctl -D ~/.shopdeck-pg -o "-p 55426 -k /tmp" -l ~/.shopdeck-pg/log start
createdb -h localhost -p 55426 -U shopdeck shopdeck
```

The default `DATABASE_URL` points at that. The API migrates and seeds on start.

To look at data: `psql -h localhost -p 55426 -U shopdeck shopdeck`.

Stop it with `pg_ctl -D ~/.shopdeck-pg stop`.
