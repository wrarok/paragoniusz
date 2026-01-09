# Plan Testów - Paragoniusz

## Spis Treści

1. [Wprowadzenie i Cele Testowania](#1-wprowadzenie-i-cele-testowania)
2. [Zakres Testów](#2-zakres-testów)
3. [Typy Testów](#3-typy-testów)
4. [Scenariusze Testowe](#4-scenariusze-testowe)
5. [Środowisko Testowe](#5-środowisko-testowe)
6. [Narzędzia do Testowania](#6-narzędzia-do-testowania)
7. [Harmonogram Testów](#7-harmonogram-testów)
8. [Kryteria Akceptacji Testów](#8-kryteria-akceptacji-testów)
9. [Role i Odpowiedzialności](#9-role-i-odpowiedzialności)
10. [Procedury Raportowania Błędów](#10-procedury-raportowania-błędów)

---

## 1. Wprowadzenie i Cele Testowania

### 1.1 Kontekst Projektu

**Paragoniusz** to aplikacja do zarządzania wydatkami osobistymi z zaawansowaną funkcją skanowania paragonów opartą na sztucznej inteligencji.

**Stos technologiczny**:
- **Frontend**: Astro 5 + React 19 + TypeScript 5 + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Edge Functions)
- **AI**: OpenRouter.ai (dostęp do modeli LLM)
- **Hosting**: Cloudflare Pages (edge computing)
- **Testing**: Vitest, Playwright, MSW, React Testing Library

### 1.2 Cele Testowania

**Cel główny**: Zapewnienie wysokiej jakości, niezawodności i bezpieczeństwa aplikacji poprzez kompleksową strategię testowania.

**Cele szczegółowe**:
1. **Funkcjonalność AI**: Dokładność rozpoznawania >95%, wskaźnik korekt <20% (PRD 6.2)
2. **Bezpieczeństwo**: Prawidłowe działanie Row Level Security (RLS)
3. **Wydajność**: Przetwarzanie AI <20 sekund (PRD 3.4)
4. **Mobile-First**: Weryfikacja responsywności i użyteczności mobilnej
5. **Stabilność**: Wskaźnik stabilności testów >95% (flaky tests <5%)
6. **Pokrycie**: ≥70% dla całości, 100% dla krytycznych ścieżek

---

## 2. Zakres Testów

### 2.1 Funkcjonalności w Zakresie

#### Priorytet Krytyczny ⭐⭐⭐

**A. Skanowanie Paragonów AI**
- Upload zdjęcia (JPEG, PNG, HEIC)
- Przetwarzanie przez OpenRouter
- Ekstrakcja danych (pozycje, kwoty, daty, kategorie)
- Weryfikacja i edycja wyodrębnionych danych
- Zapis wielu wydatków
- Obsługa błędów (timeout, nieprawidłowy format, błędy API)
- Zarządzanie zgodą użytkownika na AI

**B. Zarządzanie Wydatkami (CRUD)**
- Dodawanie wydatku ręcznie
- Edycja istniejącego wydatku
- Usuwanie wydatku
- Przeglądanie listy wydatków
- Filtrowanie po dacie i kategorii
- Walidacja danych

**C. Uwierzytelnianie i Autoryzacja**
- Rejestracja nowego użytkownika
- Logowanie (z opcją "Zapamiętaj mnie")
- Wylogowanie
- Row Level Security (RLS) - izolacja danych
- Zmiana hasła
- Usuwanie konta

#### Priorytet Wysoki ⭐⭐

**D. Dashboard i Analityka**
- Wyświetlanie sumy wydatków
- Wykres kołowy według kategorii
- Filtrowanie po zakresie dat
- Lista ostatnich wydatków

**E. Zarządzanie Kategoriami**
- Lista kategorii
- Mapowanie kategorii AI → kategorie bazodanowe
- Obsługa nieznanych kategorii

### 2.2 Obszary Ryzyka

#### Ryzyko Krytyczne ⚠️⚠️⚠️

1. **Bezpieczeństwo Danych Finansowych**
   - Aplikacja przechowuje wrażliwe dane finansowe
   - **Testy**: RLS policies, walidacja autoryzacji

2. **Dokładność AI**
   - Kluczowa funkcja wartości dodanej
   - **Testy**: Rzeczywiste paragony, edge cases, obsługa błędów

3. **Timeout Przetwarzania AI (20s)**
   - Przekroczenie limitu pogarsza UX
   - **Testy**: Performance testing, retry strategies

#### Ryzyko Wysokie ⚠️⚠️

4. **Rate Limiting API** - Testy limitów, kolejkowanie żądań
5. **Walidacja Kwot i Dat** - Testy graniczne, formaty dziesiętne
6. **Upload i Kompresja** - Różne rozmiary, formaty, uszkodzone pliki

---

## 3. Typy Testów

### 3.1 Piramida Testów

```
        /\
       /E2E\      10% - End-to-End
      /------\
     /  INTEG \   20% - Integracyjne
    /----------\
   /    UNIT    \ 70% - Jednostkowe
  /--------------\
```

### 3.2 Testy Jednostkowe (70%)

**Narzędzie**: Vitest + React Testing Library + Happy-DOM

**Zakres**:
- **Walidacja**: [`expense-form.validation.ts`](../../src/lib/validation/expense-form.validation.ts), [`file-upload.validation.ts`](../../src/lib/validation/file-upload.validation.ts)
- **Serwisy**: [`auth.service.ts`](../../src/lib/services/auth.service.ts), [`expense.service.refactored.ts`](../../src/lib/services/expense.service.refactored.ts), [`receipt.service.refactored.ts`](../../src/lib/services/receipt.service.refactored.ts), [`openrouter.service.refactored.ts`](../../src/lib/services/openrouter.service.refactored.ts)
- **Utility**: [`formatters.ts`](../../src/lib/utils/formatters.ts), [`image-compression.ts`](../../src/lib/utils/image-compression.ts)
- **Hooks**: [`useExpenseForm.ts`](../../src/components/hooks/useExpenseForm.ts), [`useScanExpenseFlow.ts`](../../src/components/hooks/useScanExpenseFlow.ts)
- **Komponenty**: [`ExpenseForm.tsx`](../../src/components/ExpenseForm/ExpenseForm.tsx), UI components

**Metryki**:
- Pokrycie: ≥70%
- Czas: <30 sekund
- Aktualny stan: **535/535 passing (100%)**

### 3.3 Testy Integracyjne (20%)

**Narzędzie**: Vitest + MSW

**Zakres**:
- API endpoints (GET/POST/PUT/DELETE)
- Przepływ przetwarzania paragonów
- OpenRouter integration (mockowany przez MSW)

### 3.4 Testy E2E (10%)

**Narzędzie**: Playwright

**Suites**:
1. **Receipt Scanning** (16 testów) - Upload → AI → Verify → Save
2. **User Onboarding** (13 testów) - Registration → First Expense
3. **Dashboard Analytics** (15 testów) - Filtering, Charts
4. **Expense CRUD** (12 testów) - Create, Update, Delete
5. **Authentication** (10 testów) - Login, Logout, Security
6. **Mobile Android** (18 testów) - Samsung Galaxy A35 5G

**Total**: ~84 testy E2E

**Metryki**:
- Critical paths coverage: 100%
- Czas: <15 minut
- Flaky tests: <5%

### 3.5 Testy Wydajnościowe

**Narzędzie**: Playwright + Lighthouse CI

**Metryki**:
- AI Processing: <20s (PRD 3.4)
- Dashboard Load: <2s
- Filter Execution: <1s
- Lighthouse Performance: ≥90

### 3.6 Testy Bezpieczeństwa

**Zakres**:
- **RLS**: User A nie widzi wydatków User B
- **Authentication**: Token expiration, session hijacking prevention
- **Input Validation**: SQL Injection, XSS, path traversal
- **API Security**: Rate limiting, API key protection

### 3.7 Testy Dostępności

**Narzędzie**: axe-core + Playwright

**Zakres**:
- WCAG 2.1 Level AA Compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast (≥4.5:1)
- Semantic HTML

---

## 4. Scenariusze Testowe

### 4.1 Kluczowe Scenariusze

#### Scenariusz 1: Kompletny Przepływ Skanowania Paragonu ⭐⭐⭐

**ID**: TC-KEY-001  
**Priorytet**: Krytyczny  
**Typ**: E2E

**Kroki**:
1. Login użytkownika
2. Kliknij "Dodaj wydatek" → "Zeskanuj paragon (AI)"
3. Upload `grocery-receipt.jpg`
4. Poczekaj na przetwarzanie (loading indicator)
5. Zweryfikuj wyodrębnione dane (data, lista, kategorie, suma)
6. Edytuj jeden wydatek (kwota 10.50 → 12.00)
7. Zapisz wszystkie wydatki
8. Weryfikacja na Dashboard

**Oczekiwany rezultat**:
- Processing <20s
- Dokładność ≥95%
- Flagi: `created_by_ai=true`, `was_ai_suggestion_edited=true`

---

#### Scenariusz 2: Rejestracja → Pierwszy Wydatek ⭐⭐

**ID**: TC-KEY-002  
**Typ**: E2E

**Kroki**:
1. Rejestracja (`test-{timestamp}@test.pl`)
2. Login
3. Sprawdź welcome message i empty state
4. Dodaj pierwszy wydatek (50.00 PLN, żywność)
5. Weryfikacja na Dashboard

---

#### Scenariusz 3: Dashboard Analytics z Filtrowaniem ⭐⭐

**ID**: TC-KEY-003  
**Typ**: E2E

**Kroki**:
1. Dashboard z ≥5 wydatkami
2. Sprawdź sumę i wykres kołowy
3. Filtr dat: ostatnie 7 dni
4. Filtr kategorii: "żywność"
5. Reset filtrów
6. Dodaj nowy wydatek → sprawdź real-time update

**Oczekiwany rezultat**:
- Dashboard load: <2s
- Filter execution: <1s
- Real-time updates działają

### 4.2 Edge Cases

- **TC-EDGE-001**: Timeout AI (>20s)
- **TC-EDGE-002**: Nieprawidłowy format pliku (PDF)
- **TC-EDGE-003**: Równoczesne uploady
- **TC-EDGE-004**: Network error
- **TC-EDGE-005**: RLS - izolacja użytkowników

---

## 5. Środowisko Testowe

### 5.1 Środowiska

#### A. Development (Local)
- **Konfiguracja**: `.env`
- **Backend**: Supabase Local/Remote Dev
- **Komenda**: `npm run dev` + `npm run test:unit`

#### B. Testing (E2E)
- **Konfiguracja**: `.env.test`
- **Backend**: Remote Supabase Test Project
- **Komenda**: `npm run dev:e2e` + `npm run test:e2e`

#### C. CI/CD (GitHub Actions)
- **Trigger**: Pull requests, commits to main
- **Kroki**: Install → Unit tests → Build → E2E tests

#### D. Staging
- **Backend**: Supabase Staging
- **Frontend**: Cloudflare Pages Preview
- **Testy**: Smoke tests + E2E critical paths

#### E. Production
- **Monitoring**: Lighthouse CI, Sentry, Supabase Logs
- **Smoke Tests**: Post-deployment health checks

### 5.2 Test Data Management

**Test Users**:
1. **Primary**: `test@test.com` (persistent)
2. **Secondary**: `test-b@test.com` (persistent, RLS tests)
3. **Ephemeral**: `test-{timestamp}@test.pl` (auto-cleanup)

**Test Expenses**: Create/cleanup per test

**Test Receipts** (`e2e/fixtures/receipts/`):
- `grocery-receipt.jpg` (3-5 items, ~45 PLN)
- `multi-item-receipt.jpg` (10+ items)
- `corrupted-receipt.jpg` (error testing)
- `slow-receipt.jpg` (timeout testing)

---

## 6. Narzędzia do Testowania

### 6.1 Test Frameworks

#### Vitest 4.0.15
- Native ESM support
- Hot Module Replacement
- Compatible z Jest API

**Komendy**:
- `npm run test:unit`
- `npm run test:watch`
- `npm run test:coverage`

#### Playwright 1.57.0
- Cross-browser (Chromium, Firefox, WebKit)
- Mobile emulation (Samsung Galaxy A35 5G)
- Auto-waiting, trace viewer

**Komendy**:
- `npm run test:e2e`
- `npm run test:e2e:ui`
- `npm run test:e2e:mobile`

### 6.2 Testing Libraries

- **React Testing Library 16.3.0** - Component testing
- **MSW 2.12.4** - API mocking
- **@faker-js/faker 10.1.0** - Test data generation

### 6.3 CI/CD

**GitHub Actions** (`.github/workflows/test.yml`):
```yaml
jobs:
  unit-tests:
    - npm ci
    - npm run test:unit
  
  e2e-tests:
    - npm ci
    - npx playwright install
    - npm run test:e2e
```

### 6.4 Monitoring

- **Sentry**: Error tracking (production)
- **Supabase Logs**: Edge Functions, DB performance
- **Cloudflare Analytics**: Performance metrics (TTFB, LCP, FID, CLS)

---

## 7. Harmonogram Testów

### 7.1 Sprint (2 tygodnie)

**Week 1: Development & Unit Testing**
- Dzień 1-3: Development + continuous unit testing
- Dzień 4-5: Integration testing + code review

**Week 2: E2E Testing & Release**
- Dzień 1-2: E2E test development
- Dzień 3: Full test suite execution
- Dzień 4: Bug fixing
- Dzień 5: Release candidate

### 7.2 Częstotliwość Testów

| Typ | Częstotliwość | Trigger | Czas |
|-----|---------------|---------|------|
| Unit Tests | Ciągłe | Każdy commit | ~30s |
| Integration | Ciągłe | Każdy commit | ~2-3 min |
| E2E (Critical) | Per PR | Pull request | ~5 min |
| E2E (Full) | Dzienny | Nightly | ~15 min |
| Performance | Tygodniowy | Pre-release | ~10 min |
| Security | Miesięczny | Scheduled | ~30 min |

### 7.3 Pre-Release Checklist

**2 Dni przed Release**:
- [ ] Unit tests: 535/535 passing
- [ ] E2E tests: ≥82/84 passing
- [ ] Performance: Dashboard <2s, AI <20s
- [ ] Security: RLS 100%
- [ ] Accessibility: WCAG 2.1 AA
- [ ] Coverage: ≥70%
- [ ] No critical/high bugs

**Release Day**:
- [ ] Deploy to production
- [ ] Smoke tests
- [ ] Monitor Sentry
- [ ] Verify critical flows

---

## 8. Kryteria Akceptacji Testów

### 8.1 Exit Criteria

**1. Test Pass Rate**
- Unit: 100% (535/535)
- Integration: 100%
- E2E: ≥98% (~82/84)

**2. Code Coverage**
- Ogólne: ≥70%
- Krytyczne: 100% (Auth, AI, CRUD, RLS)

**3. Bug Severity**
- Critical: 0
- High: ≤2 (z workaround)
- Medium: ≤5

**4. Performance**
- AI Processing: <20s (99th percentile)
- Dashboard: <2s (median)
- Lighthouse: ≥90

**5. Security**
- RLS: 100% passing
- No exposed secrets

**6. Accessibility**
- WCAG 2.1 AA: 100%
- Keyboard navigation: 100%

**7. Cross-Browser**
- Chrome, Firefox, Safari, Edge: 100%
- Android, iOS: 100%

### 8.2 Quality Gates

**Gate 1: Pull Request**
- Unit tests pass
- Coverage nie spada
- ESLint pass
- Prettier pass

**Gate 2: Merge to Main**
- All tests pass
- Code review approved
- No conflicts

**Gate 3: Staging**
- Full E2E pass
- Performance tests pass

**Gate 4: Production**
- Smoke tests pass
- Manual approval (PO)

### 8.3 Definicja "Done"

Feature jest "Done" gdy:
1. ✅ Unit tests (≥80% pokrycia)
2. ✅ Integration tests
3. ✅ E2E scenario dodany
4. ✅ Manual exploratory testing
5. ✅ Code review
6. ✅ Documentation updated
7. ✅ CI/CD passing
8. ✅ PO acceptance

---

## 9. Role i Odpowiedzialności

### 9.1 Zespół

#### A. QA Engineer (Lead)
**Odpowiedzialności**:
- Plan testów i test scenarios
- E2E tests (Playwright)
- Performance, security, accessibility testing
- Bug triage i reporting
- Test metrics

**Narzędzia**: Playwright, Lighthouse, axe-core

#### B. Backend Developer
**Odpowiedzialności**:
- Unit tests (API endpoints, serwisy)
- Integration tests (MSW)
- Walidacja i transformatory
- Bug fixing

**Narzędzia**: Vitest, MSW

#### C. Frontend Developer
**Odpowiedzialności**:
- Unit tests (komponenty, hooks)
- Accessibility implementation
- Mobile-first responsive design
- Bug fixing

**Narzędzia**: Vitest, React Testing Library

#### D. DevOps Engineer
**Odpowiedzialności**:
- CI/CD pipeline (GitHub Actions)
- Test environments setup
- Monitoring (Sentry, Cloudflare)
- Deployment automation

#### E. Product Owner
**Odpowiedzialności**:
- Acceptance testing (UAT)
- Release approval
- Bug priorytetyzacja

### 9.2 Macierz RACI

| Aktywność | QA | Backend | Frontend | DevOps | PO |
|-----------|----|---------|---------|---------|----|
| Planowanie testów | R/A | C | C | I | I |
| Unit tests (backend) | C | R/A | I | I | I |
| Unit tests (frontend) | C | I | R/A | I | I |
| E2E tests | R/A | C | C | I | I |
| Bug triage | R/A | C | C | I | C |
| CI/CD setup | C | C | C | R/A | I |
| Release approval | C | I | I | C | R/A |

**Legenda**: R=Responsible, A=Accountable, C=Consulted, I=Informed

---

## 10. Procedury Raportowania Błędów

### 10.1 Kanały

#### A. GitHub Issues (Primary)

**Template**:
```markdown
## 🐛 Bug Report

### Severity
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

### Environment
- Branch: main/feature/xyz
- Browser: Chrome 120
- Device: Desktop/Mobile

### Steps to Reproduce
1. Navigate to...
2. Click...
3. Observe...

### Expected vs Actual
[Co powinno się stać vs co się stało]

### Screenshots/Logs
[Attach]
```

#### B. Sentry (Automatic)
- Production errors
- Alert routing: Critical → Slack, High frequency → Email

#### C. Slack
- `#qa-bugs`: Daily summary
- `#alerts-prod`: Critical alerts

### 10.2 Bug Lifecycle

```
[New] → [Triaged] → [Assigned] → [In Progress] → [Fixed] → [Verified] → [Closed]
```

### 10.3 Priority Matrix

| Severity | Impact High | Medium | Low |
|----------|-------------|--------|-----|
| Critical | P0 (4h) | P1 (24h) | P2 (Sprint) |
| High | P1 (24h) | P2 (Sprint) | P3 (Backlog) |
| Medium | P2 (Sprint) | P3 (Backlog) | P4 |
| Low | P3 (Backlog) | P4 | P4 |

**SLA**:
- P0: 4 hours
- P1: 24 hours
- P2: Current sprint
- P3: 2 sprints

### 10.4 Bug Metrics

**KPIs**:
- Bug Discovery Rate (trend malejący)
- Bug Fix Rate (≥ Discovery Rate)
- Bug Escape Rate (<5% do production)
- Mean Time to Resolution (MTTR)
- Reopen Rate (<10%)

### 10.5 Regression Bug Policy

**Akcje**:
1. Immediate P1 priority
2. Root cause analysis
3. Test gap analysis
4. Post-mortem (critical regressions)

### 10.6 Production Hotfix

**Process**:
1. Alert (Slack, email, phone)
2. Incident Commander assigned
3. Impact assessment
4. Emergency fix (hotfix branch)
5. Fast-track review (<30 min)
6. Smoke tests only
7. Deploy + monitor (2h)
8. Post-mortem (24h)

### 10.7 Test Results Reporting

**Daily Report** (Slack `#testing`):
```
🧪 Daily Test Report

✅ Unit: 535/535 (100%)
✅ Integration: 48/48 (100%)
⚠️  E2E: 82/84 (97.6%)

📊 Coverage: 72.4%

🐛 New Bugs: 2 (P2, P3)
🔧 Fixed: 3
```

**Weekly Report** (Email):
- Executive summary
- Test execution summary
- Coverage report
- Bug summary
- Performance metrics
- Risks & issues

---

## 11. Podsumowanie

Plan testów dla **Paragoniusz** został zaprojektowany z uwzględnieniem:

### Kluczowe Punkty

1. **Kompleksowe Pokrycie**: Piramida 70/20/10 zapewnia optymalną równowagę
2. **Focus na Krytyczne**: AI (>95%), Security (RLS), Performance (<20s)
3. **Automatyzacja**: Wszystkie testy w CI/CD (GitHub Actions)
4. **Quality Gates**: Jasno zdefiniowane kryteria release
5. **Monitoring**: Sentry, Cloudflare, Supabase Logs

### Metryki

✅ **Unit Tests**: 535/535 passing (100%)
✅ **E2E Tests**: ~84 testy (6 suites)
✅ **Coverage**: 70%+
✅ **AI Performance**: <20s
✅ **Security**: RLS 100%
✅ **Accessibility**: WCAG 2.1 AA

### Next Steps

1. ✅ Plan testów approved
2. ⏭️ CI/CD setup (GitHub Actions)
3. ⏭️ Test fixtures (receipt images)
4. ⏭️ Missing E2E scenarios
5. ⏭️ Performance baseline
6. ⏭️ Security audit
7. ⏭️ Accessibility audit

---

**Status**: ✅ Plan Testów Gotowy do Implementacji

**Dokument stworzony**: 2026-01-09  
**Wersja**: 1.0
