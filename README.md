# ClassMap Studio

ClassMap Studio helps teachers, tutors, coaches and trainers create a pedagogical map for any subject — not just FLE.

Built on the ClassmapFLE codebase, extended with dynamic subjects, competencies and observation scales. Runs on Supabase (shared TeachingApps project).

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Apply migrations (optional, app works with in-app templates as fallback):

```bash
supabase login
supabase link --project-ref dqsspskdsfdiaaymrngi
supabase db push
```

5. Start dev server: `npm run dev`

## vs ClassmapFLE

| ClassmapFLE | ClassMap Studio |
|-------------|-----------------|
| FLE-only competencies | Multi-subject templates |
| Hardcoded `fle-engine.js` | Dynamic `map-engine.js` |
| Fixed observation grid | Subject-driven competencies |

Both apps can share the same Supabase project; migrations are additive.

## Demo data

In Settings, use **Charger les démos** to create sample groups (FLE, Maths, Informatique, Chant).

## Notes

- Keep secrets in `.env.local` only.
- Supabase project ref: `dqsspskdsfdiaaymrngi`
