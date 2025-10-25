# CyberDirectory

A community-driven directory of cybersecurity tools, platforms, and courses built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Requirements

- **Node.js:** v22.x (LTS)
- **npm:** v10.x or higher

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

See `.env.example` for a template.

### 3. Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

The app will auto-reload as you edit files in `src/`.

## Available Scripts

```bash
# Development
npm run dev          # Start dev server with Turbopack

# Production
npm run build        # Build for production
npm start            # Start production server

# Quality Checks
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
npm run check        # Run lint + typecheck + build

# Post-build
npm run postbuild    # Generate sitemap (runs automatically after build)
```

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Validation:** [Zod](https://zod.dev/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Deployment:** [Vercel](https://vercel.com/)

## Project Structure

```
cyberdirectory/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (account)/       # Account-related pages
│   │   ├── (public)/        # Public pages (user profiles)
│   │   ├── admin/           # Admin dashboard
│   │   ├── api/             # API routes
│   │   ├── resources/       # Resource pages
│   │   └── ...
│   ├── components/          # React components
│   ├── lib/                 # Utility functions & helpers
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── upgrade/                 # Upgrade documentation
├── .vscode/                 # VS Code workspace settings
├── .github/                 # GitHub Actions CI/CD
└── ...
```

## Key Features

- **Resource Directory:** Browse, search, and filter cybersecurity resources
- **Community Voting:** Upvote/downvote resources
- **Comments & Discussion:** Engage with the community
- **User Submissions:** Submit new resources for approval
- **Admin Moderation:** Review and approve submissions
- **User Profiles:** Public profiles with activity history
- **Categories & Tags:** Organize resources by topic
- **SEO Optimized:** Metadata, JSON-LD, sitemaps, and RSS
- **Responsive Design:** Mobile-first UI with Tailwind CSS

## Database

This project uses Supabase (PostgreSQL) for data storage and authentication.

### Schema Overview

- `resources` - Approved cybersecurity resources
- `submissions` - Pending resource submissions
- `categories` - Resource categories
- `tags` - Resource tags
- `comments` - User comments on resources
- `votes` - User votes on resources
- `saves` - User-saved resources
- `profiles` - User profile data

Row-Level Security (RLS) is enabled on all tables.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your site URL (for SEO, RSS, etc.) | Yes |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com/new)
3. Configure environment variables
4. Deploy

Vercel will automatically:
- Build the project
- Generate sitemaps
- Deploy to a global CDN

### Manual Deployment

```bash
npm run build
npm start
```

Ensure all environment variables are set in your hosting environment.

## Development Workflow

### Before Committing

Run the full check:

```bash
npm run check
```

This will:
1. Lint your code with ESLint
2. Type-check with TypeScript
3. Build the project

### VS Code Setup

Recommended extensions (see `.vscode/extensions.json`):
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Supabase
- Error Lens

Settings are pre-configured in `.vscode/settings.json`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run `npm run check` to ensure quality
5. Commit your changes
6. Push to your fork
7. Open a Pull Request

## Migration Notes

This project was recently upgraded to Next.js 16, React 19, and Tailwind CSS v4.

See:
- `MIGRATION.md` for detailed migration guide
- `CHANGELOG.md` for complete version history
- `upgrade/` directory for baseline reports

## License

MIT

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Note:** This project requires Node.js v22.x. Ensure you're using the correct version:

```bash
node --version  # Should output v22.x.x
```
