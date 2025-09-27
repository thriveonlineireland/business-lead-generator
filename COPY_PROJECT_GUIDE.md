# Complete Project Copy Guide

## 🚀 How to Copy Your ProspectlyPro Project to New Bolt Instance

Since this project was originally created on Lovable, you'll need to manually copy the files to a new Bolt project.

## 📋 Step-by-Step Process:

### 1. Create New Bolt Project
- Go to Bolt and create a new project
- Choose "React + TypeScript" template
- Wait for it to initialize

### 2. Copy Configuration Files (Copy these first)
```
package.json
tsconfig.json
tsconfig.app.json
tsconfig.node.json
vite.config.ts
tailwind.config.ts
postcss.config.js
components.json
eslint.config.js
```

### 3. Copy HTML & Public Files
```
index.html
public/robots.txt
```

### 4. Copy Source Code Structure
Create these folders in your new project and copy the contents:

#### Main Source Files:
```
src/main.tsx
src/App.tsx
src/index.css
src/App.css
src/vite-env.d.ts
src/lib/utils.ts
```

#### Pages (create src/pages/ folder):
```
src/pages/Auth.tsx
src/pages/Dashboard.tsx
src/pages/EmailConfirmation.tsx
src/pages/Index.tsx
src/pages/LandingPage.tsx
src/pages/MyLeads.tsx
src/pages/NotFound.tsx
src/pages/ResetPassword.tsx
src/pages/SearchHistory.tsx
src/pages/Settings.tsx
```

#### Components (create src/components/ folder):
```
src/components/layout/Navigation.tsx
src/components/crm/LeadManagement.tsx
src/components/crm/PipelineView.tsx
src/components/payment/UpgradeToMyLeads.tsx
src/components/pricing/UpgradeModal.tsx
src/components/profile/SecureApiKeyManager.tsx
```

#### Search Components (create src/components/search/ folder):
```
src/components/search/BusinessTypeSelector.tsx
src/components/search/ExpandSearchDialog.tsx
src/components/search/FreemiumResultsTable.tsx
src/components/search/LocationSelector.tsx
src/components/search/QualityGroupedResults.tsx
src/components/search/QuickActions.tsx
src/components/search/ResultsTable.tsx
src/components/search/SearchProgressModal.tsx
src/components/search/SecureSearchForm.tsx
```

#### UI Components (create src/components/ui/ folder):
Copy ALL files from the ui folder - there are many, including:
```
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/input.tsx
src/components/ui/enhanced-button.tsx
... (and all other ui components)
```

#### Utils (create src/utils/ folder):
```
src/utils/ExportService.ts
src/utils/FirecrawlService.ts
src/utils/FreeLeadEnrichmentService.ts
src/utils/GooglePlacesService.ts
src/utils/LeadEnrichmentService.ts
src/utils/LeadQualityService.ts
src/utils/StorageService.ts
src/utils/UsageTrackingService.ts
```

#### Contexts & Hooks:
```
src/contexts/AuthContext.tsx
src/hooks/use-mobile.tsx
src/hooks/use-toast.ts
```

#### Supabase Integration:
```
src/integrations/supabase/client.ts
src/integrations/supabase/types.ts
```

### 5. Copy Supabase Configuration
Create `supabase/` folder and copy:
```
supabase/config.toml
```

#### Migrations (create supabase/migrations/ folder):
Copy all migration files (13 files total)

#### Edge Functions (create supabase/functions/ folder):
```
supabase/functions/search-business-leads/index.ts
supabase/functions/create-checkout-session/index.ts
supabase/functions/create-lead-checkout/index.ts
supabase/functions/stripe-webhook/index.ts
```

## 🔧 After Copying All Files:

1. **Install dependencies**: `npm install`
2. **Connect Supabase**: Click Supabase button in Bolt settings
3. **Test the app**: `npm run dev`
4. **Deploy**: Should work from new Bolt project

## 💡 Pro Tip:
Copy files in the order listed above. Start with configuration files, then source code, then Supabase files. This ensures dependencies are resolved correctly.

## ⚠️ Important Notes:
- Make sure to copy the EXACT content of each file
- Preserve the folder structure exactly as shown
- Don't skip any files, especially the UI components
- The new project will have a clean deployment setup