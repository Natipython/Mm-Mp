# Progress — Milestone 1 Worker

Last visited: 2026-10-20T21:58:45Z

## Status
Starting implementation of Milestone 1.

## Plan
1. [ ] Create directories: `database/migrations`, `database/socket`, `database/pgdata` in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp`.
2. [ ] Copy migrations 0001–0012 from `MenuMini_1/database/migrations` to `Mm-Mp/database/migrations`.
3. [ ] Verify SHA-256 checksums of the 12 migrations against Spec Miner 3 report.
4. [ ] Create `database/roles.sql` using Explorer 2's verified script.
5. [ ] Create `database/verify_clean.sql` using Explorer 2's verified script.
6. [ ] Create `database/init.sh` using Explorer 1's verified script, ensure executable.
7. [ ] Create `.env` in `/run/media/n-a-t/Local Disk_HDD/Mm-Mp/.env`.
8. [ ] Execute `database/init.sh init` to bootstrap cluster, apply migrations, provision roles, and verify zero sample data.
9. [ ] Run `database/init.sh check` and execute `verify_clean.sql`.
10. [ ] Verify TCP connection strings for all 4 roles and verify application handshake queries.
11. [ ] Generate `handoff.md` and message orchestrator.
