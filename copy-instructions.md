# How to Copy Your Project to a New Bolt Instance

## Method 1: Download Archive (Recommended)
1. Download the `project-backup.tar.gz` file from this project
2. Create a new Bolt project (start with a blank React/TypeScript template)
3. Extract the archive and copy all files to the new project

## Method 2: Manual File Copy
Copy these files and folders to your new Bolt project:

### Core Configuration Files:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tsconfig.app.json` - App-specific TypeScript config
- `tsconfig.node.json` - Node-specific TypeScript config
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `components.json` - shadcn/ui configuration
- `eslint.config.js` - ESLint configuration

### HTML & Assets:
- `index.html` - Main HTML file
- `public/robots.txt` - SEO robots file

### Source Code (src/ folder):
- `src/main.tsx` - App entry point
- `src/App.tsx` - Main App component
- `src/index.css` - Global styles
- `src/App.css` - App-specific styles
- `src/vite-env.d.ts` - Vite type definitions
- `src/lib/utils.ts` - Utility functions

### Pages (src/pages/):
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/EmailConfirmation.tsx`
- `src/pages/Index.tsx`
- `src/pages/LandingPage.tsx`
- `src/pages/MyLeads.tsx`
- `src/pages/NotFound.tsx`
- `src/pages/ResetPassword.tsx`
- `src/pages/SearchHistory.tsx`
- `src/pages/Settings.tsx`

### Components (src/components/):
- All files in `src/components/ui/` (shadcn/ui components)
- `src/components/layout/Navigation.tsx`
- `src/components/crm/LeadManagement.tsx`
- `src/components/crm/PipelineView.tsx`
- `src/components/payment/UpgradeToMyLeads.tsx`
- `src/components/pricing/UpgradeModal.tsx`
- `src/components/profile/SecureApiKeyManager.tsx`
- `src/components/search/BusinessTypeSelector.tsx`
- `src/components/search/ExpandSearchDialog.tsx`
- `src/components/search/FreemiumResultsTable.tsx`
- `src/components/search/LocationSelector.tsx`
- `src/components/search/QualityGroupedResults.tsx`
- `src/components/search/QuickActions.tsx`
- `src/components/search/ResultsTable.tsx`
- `src/components/search/SearchProgressModal.tsx`
- `src/components/search/SecureSearchForm.tsx`

### Utilities (src/utils/):
- `src/utils/ExportService.ts`
- `src/utils/FirecrawlService.ts`
- `src/utils/FreeLeadEnrichmentService.ts`
- `src/utils/GooglePlacesService.ts`
- `src/utils/LeadEnrichmentService.ts`
- `src/utils/LeadQualityService.ts`
- `src/utils/StorageService.ts`
- `src/utils/UsageTrackingService.ts`

### Contexts & Hooks:
- `src/contexts/AuthContext.tsx`
- `src/hooks/use-mobile.tsx`
- `src/hooks/use-toast.ts`

### Supabase Integration:
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

### Supabase Configuration:
- `supabase/config.toml`
- All migration files in `supabase/migrations/`
- All edge functions in `supabase/functions/`

## Method 3: GitHub Repository
If you have access to the GitHub repository:
1. Clone the repository locally
2. Create a new Bolt project
3. Copy all files except `.git`, `node_modules`, and `dist`

## After Copying:
1. Run `npm install` to install dependencies
2. Set up your Supabase connection (click the Supabase button in Bolt settings)
3. Test the application with `npm run dev`
4. Deploy from the new Bolt project

The archive method is the easiest - just download the `project-backup.tar.gz` file and extract it into your new Bolt project!