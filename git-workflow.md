# Git Merge Workflow

## Roles
- **Jules**: works on a feature branch (e.g. `dev/jules-*`)
- **Teammate**: works on `main`, reviews and squash merges PRs

## Workflow

1. **Sync before working**: merge `main` into your branch
   ```bash
   git fetch origin
   git checkout dev/jules-<branch>
   git merge origin/main
   # resolve any conflicts here, on YOUR branch
   ```
2. **Do your work**: make commits on your branch
3. **Push and open a PR** to `main`
4. **Teammate squash merges** the PR into `main`
5. **After squash merge**: sync again before starting new work
   ```bash
   git fetch origin
   git merge origin/main
   ```

## Key Rules
- Always merge `main` into your branch — never the other way around
- Resolve conflicts on your branch so `main` stays clean
- After a squash merge, your old commits still exist on your branch but `main` has one squashed commit — this is expected
- Always sync with `main` before starting new work to avoid stale conflicts
