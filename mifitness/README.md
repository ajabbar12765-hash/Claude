# Mi Fitness → Claude

`cli-anything-mifitness` is a CLI-Anything harness that lets Claude read Xiaomi
Mi Fitness data (Mi Smart Band / Xiaomi Watch) from the official account export.

```bash
pip install -e mifitness/agent-harness
cli-anything-mifitness import ~/Downloads/export.zip --password '<from Xiaomi email>'
cli-anything-mifitness daily --from 7d
```

The Claude skill lives at `.claude/skills/cli-anything-mifitness/SKILL.md`, so Claude
Code sessions in this repo know how to use it. Full command list: see that file.

Tests: `python -m pytest mifitness/agent-harness/cli_anything/mifitness/tests`
(uses a generated, realistic AES-encrypted export; no real data in the repo).
