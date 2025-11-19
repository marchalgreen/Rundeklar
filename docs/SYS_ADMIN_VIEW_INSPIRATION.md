# Sys Admin View - Design Inspiration

Dette dokument beskriver inspiration til et nyt sys_admin view til overblik over alle aktive tenants, pakker, faktureringer og indtægter.

## Overordnet Formål

Et centraliseret dashboard hvor systemadministratoren kan:
- Se alle aktive tenants og deres status
- Administrere pakker og faktureringer
- Følge op på prøveperioder
- Tracke indtægter og vækst
- Håndtere support requests

## Hovedsektioner

### 1. Dashboard Overview
**Visuelt design:**
- KPI cards i top (totale tenants, månedlige indtægter, aktive prøveperioder, churn rate)
- Graf over vækst over tid (line chart)
- Seneste aktivitet feed

**Data:**
- Total antal tenants
- Månedlige/årlige indtægter (MRR/ARR)
- Aktive prøveperioder
- Konverteringsrate (prøveperiode → betalende)
- Churn rate

### 2. Tenants Liste
**Visuelt design:**
- Tabel med søgning og filtre
- Sortable kolonner
- Status badges (Aktiv, Prøveperiode, Suspenderet)
- Quick actions (view, edit, suspend)

**Kolonne:**
- Klubnavn
- Tenant ID / URL
- Pakke (Basispakke/Professionel/Enterprise)
- Status
- Oprettelsesdato
- Sidste aktivitet
- Actions

**Filtre:**
- Pakke type
- Status
- Oprettelsesdato range
- Søg efter navn/email

### 3. Tenant Detail View
**Visuelt design:**
- Side panel eller dedicated page
- Tabs: Overview, Billing, Activity, Support

**Overview tab:**
- Klub information
- Pakke detaljer
- Prøveperiode status og udløbsdato
- Aktive brugere
- Usage stats (logins, aktivitet)

**Billing tab:**
- Faktureringshistorik
- Næste faktureringsdato
- Betalingsmetode
- Faktura downloads
- Opgradering/nedgradering log

**Activity tab:**
- Login historik
- Feature usage
- Support tickets
- System events

**Support tab:**
- Support tickets
- Email kommunikation
- Notes

### 4. Prøveperioder Management
**Visuelt design:**
- Dedikeret sektion for aktive prøveperioder
- Countdown til udløb
- Quick actions (forlæng, konverter, opsig)

**Features:**
- Liste over alle aktive prøveperioder
- Dage tilbage indikeret visuelt
- Automatisk reminder når der er 3 dage tilbage
- One-click konvertering til betalende kunde

### 5. Billing & Revenue
**Visuelt design:**
- Revenue dashboard med grafer
- Faktureringskalender
- Payment status overview

**Data:**
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Revenue growth chart
- Revenue by package type
- Upcoming invoices
- Failed payments

### 6. Analytics & Reporting
**Visuelt design:**
- Graf visualiseringer
- Export funktionalitet

**Reports:**
- Tenant growth over time
- Conversion funnel (visitor → signup → trial → paid)
- Churn analysis
- Revenue forecasting
- Package distribution

## Tekniske Overvejelser

### Database Schema Extensions
```sql
-- Tenant metadata tabel
CREATE TABLE tenant_metadata (
  tenant_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL, -- 'basic', 'professional', 'enterprise'
  trial_start_date TIMESTAMP,
  trial_end_date TIMESTAMP,
  trial_converted BOOLEAN DEFAULT FALSE,
  subscription_status TEXT, -- 'trial', 'active', 'suspended', 'cancelled'
  billing_email TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Billing history tabel
CREATE TABLE billing_history (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'DKK',
  billing_period_start DATE,
  billing_period_end DATE,
  status TEXT, -- 'pending', 'paid', 'failed', 'refunded'
  invoice_number TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints
- `GET /api/admin/tenants` - Liste alle tenants med metadata
- `GET /api/admin/tenants/:id` - Tenant detaljer
- `PUT /api/admin/tenants/:id` - Opdater tenant (pakke, status, etc.)
- `GET /api/admin/billing` - Billing overview
- `GET /api/admin/analytics` - Analytics data
- `POST /api/admin/tenants/:id/convert-trial` - Konverter prøveperiode til betalende

### Notifikationer
- Email når ny tenant opretter prøveperiode (allerede implementeret)
- Email når prøveperiode udløber om 3 dage
- Email når prøveperiode konverteres til betalende
- Email ved failed payments

## UI/UX Best Practices

### Design Consistency
- Brug samme glass-morphism design som resten af appen
- Konsistent farvepalette (primary, success, danger)
- Samme PageCard og Button komponenter

### Responsive Design
- Mobile-first approach
- Tabel bliver til cards på mobile
- Collapsible sektioner

### Performance
- Pagination for store lister
- Lazy loading af data
- Caching af analytics data

### Accessibility
- Keyboard navigation
- Screen reader support
- High contrast mode

## Implementation Prioritet

### Phase 1 (MVP)
1. Tenant liste med basic info
2. Tenant detail view (overview tab)
3. Prøveperiode management
4. Basic billing overview

### Phase 2
1. Analytics dashboard
2. Billing detail view
3. Support integration
4. Advanced filtering

### Phase 3
1. Revenue forecasting
2. Advanced analytics
3. Automated workflows
4. Custom reports

## Design Inspiration

- **Stripe Dashboard**: Clean, data-dense, professional
- **Vercel Dashboard**: Modern, minimal, informative
- **Linear**: Excellent use of space, clear hierarchy
- **Notion**: Flexible, organized, intuitive

## Farver & Status

- **Aktiv**: Grøn (`--success`)
- **Prøveperiode**: Blå (`--primary`)
- **Suspenderet**: Gul/Orange (`--warning`)
- **Annulleret**: Rød (`--danger`)

## Komponenter der skal bruges

- PageCard (eksisterende)
- Button (eksisterende)
- Tabel komponent (ny)
- StatusBadge komponent (ny)
- Chart komponenter (fx. recharts eller chart.js)
- Modal/Dialog (ny eller eksisterende)
- DatePicker (ny)


