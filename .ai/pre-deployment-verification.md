# Plan Weryfikacji Przed Deploymentem

Ten dokument zawiera szczegółowy plan weryfikacji aplikacji przed wdrożeniem.

## 📋 Spis treści

1. [Przygotowanie środowiska](#1-przygotowanie-środowiska)
2. [Weryfikacja lintera](#2-weryfikacja-lintera)
3. [Testy jednostkowe](#3-testy-jednostkowe)
4. [Testy integracyjne](#4-testy-integracyjne)
5. [Testy E2E](#5-testy-e2e)
6. [Kompleksowa weryfikacja](#6-kompleksowa-weryfikacja)
7. [Checklist przed deploymentem](#7-checklist-przed-deploymentem)

---

## 1. Przygotowanie środowiska

### 1.1. Weryfikacja plików konfiguracyjnych

**Sprawdź czy istnieją wymagane pliki:**

```bash
# Sprawdź czy .env istnieje
dir .env

# Sprawdź czy .env.test istnieje
dir .env.test
```

### 1.2. Konfiguracja .env

**Jeśli plik `.env` nie istnieje:**

```bash
# Skopiuj przykładowy plik
copy .env.example .env
```

**Uzupełnij następujące wartości w `.env`:**

```env
# Client-side (React components)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side (API routes, middleware)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Admin operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Receipt Processing
OPENROUTER_API_KEY=your-openrouter-key
```

### 1.3. Konfiguracja .env.test

**Jeśli plik `.env.test` nie istnieje:**

```bash
# Skopiuj przykładowy plik
copy .env.test.example .env.test
```

**Uzupełnij następujące wartości w `.env.test`:**

```env
# Supabase Connection (MUSZĄ być takie same jak w .env!)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test User Credentials
E2E_USERNAME=test@test.com
E2E_PASSWORD=TestPassword123!
E2E_USERNAME_ID=123e4567-e89b-12d3-a456-426614174000
```

### 1.4. Utworzenie użytkownika testowego

**Opcja A: Przez Supabase Dashboard**

1. Otwórz https://supabase.com/dashboard
2. Przejdź do Authentication → Users
3. Kliknij "Add User"
4. Email: `test@test.com`
5. Password: `TestPassword123!`
6. Zaznacz: "Auto Confirm User" ✅
7. Kliknij "Create User"
8. Skopiuj User ID (UUID) do `.env.test` jako `E2E_USERNAME_ID`

**Opcja B: Przez aplikację**

1. Uruchom: `npm run dev`
2. Otwórz: http://localhost:3000/register
3. Zarejestruj użytkownika: `test@test.com` / `TestPassword123!`
4. Pobierz User ID z Supabase Dashboard

### 1.5. Instalacja zależności

```bash
# Upewnij się że wszystkie zależności są zainstalowane
npm ci
```

**✅ Checkpoint:** Wszystkie pliki `.env` i `.env.test` są skonfigurowane i użytkownik testowy istnieje.

---

## 2. Weryfikacja lintera

### 2.1. Uruchomienie lintera

```bash
npm run lint
```

### 2.2. Interpretacja wyników

**Sukces:**
```
✔ No ESLint warnings or errors
```

**Błędy:**
- Linter zwraca listę problemów z kodem
- Każdy błąd zawiera: plik, linię, regułę i opis

### 2.3. Naprawa błędów

**Automatyczna naprawa:**

```bash
npm run lint:fix
```

**Manualna naprawa:**
- Przeanalizuj każdy błąd
- Popraw kod zgodnie z zasadami ESLint
- Uruchom ponownie `npm run lint`

### 2.4. Formatowanie kodu

```bash
npm run format
```

**✅ Checkpoint:** Linter nie zgłasza żadnych błędów.

---

## 3. Testy jednostkowe

### 3.1. Uruchomienie testów jednostkowych

```bash
npm run test:unit
```

### 3.2. Interpretacja wyników

Vitest wyświetla:
- Liczbę przeszłych testów (✓ passed)
- Liczbę nieprzeszłych testów (✗ failed)
- Czas wykonania
- Pokrycie kodu (jeśli skonfigurowane)

**Przykład sukcesu:**

```
✓ src/lib/services/auth.service.test.ts (5 tests) 234ms
✓ src/lib/repositories/expense.repository.test.ts (8 tests) 156ms
✓ src/lib/validation/expense-form.validation.test.ts (12 tests) 89ms

Test Files  3 passed (3)
     Tests  25 passed (25)
  Start at  21:30:00
  Duration  1.2s
```

### 3.3. Debugowanie nieprzeszłych testów

**Jeśli testy nie przechodzą:**

1. **Przeanalizuj komunikat błędu:**
   ```
   ✗ should validate expense form data
     Error: Expected "valid" but received "invalid"
   ```

2. **Uruchom tryb watch dla interaktywnego debugowania:**
   ```bash
   npm run test:watch
   ```

3. **Uruchom UI mode dla wizualnej analizy:**
   ```bash
   npm run test:ui
   ```

4. **Uruchom konkretny plik testowy:**
   ```bash
   npm run test:unit -- src/lib/services/auth.service.test.ts
   ```

### 3.4. Weryfikacja pokrycia kodu

```bash
npm run test:coverage
```

Generuje raport pokrycia w `coverage/`:
- `coverage/index.html` - interaktywny raport HTML
- Sprawdź czy krytyczne ścieżki są pokryte testami

**✅ Checkpoint:** Wszystkie testy jednostkowe przechodzą pomyślnie.

---

## 4. Testy integracyjne

### 4.1. Weryfikacja połączenia z bazą danych

**Upewnij się że:**
- Supabase jest dostępny
- Dane w `.env.test` są poprawne
- Użytkownik testowy istnieje

### 4.2. Uruchomienie testów integracyjnych

```bash
npm run test:integration
```

### 4.3. Interpretacja wyników

Testy integracyjne sprawdzają:
- Połączenie z bazą danych
- Polityki RLS (Row Level Security)
- Triggery i constrainty
- API endpoints z prawdziwą bazą danych

**Przykład sukcesu:**

```
✓ test/integration/database/smoke.test.ts (3 tests) 456ms
✓ test/integration/database/rls-policies.test.ts (12 tests) 892ms
✓ test/integration/api/expenses.create.test.ts (8 tests) 734ms

Test Files  8 passed (8)
     Tests  45 passed (45)
  Duration  5.4s
```

### 4.4. Debugowanie nieprzeszłych testów

**Typowe problemy:**

1. **Błąd połączenia z bazą:**
   ```
   Error: Failed to connect to Supabase
   ```
   **Rozwiązanie:** Sprawdź `SUPABASE_URL` i `SUPABASE_ANON_KEY` w `.env.test`

2. **RLS Policy Error:**
   ```
   Error: new row violates row-level security policy
   ```
   **Rozwiązanie:** Sprawdź czy polityki RLS są poprawnie skonfigurowane

3. **User not found:**
   ```
   Error: User with ID xxx not found
   ```
   **Rozwiązanie:** Utwórz użytkownika testowego (patrz sekcja 1.4)

### 4.5. Interaktywne debugowanie

```bash
# Watch mode
npm run test:integration:watch

# UI mode
npm run test:integration:ui
```

**✅ Checkpoint:** Wszystkie testy integracyjne przechodzą pomyślnie.

---

## 5. Testy E2E

### 5.1. Przygotowanie środowiska E2E

**Krok 1: Uruchom serwer deweloperski**

```bash
# W osobnym terminalu
npm run dev:e2e
```

Poczekaj aż zobaczysz:
```
✓ ready started server on 0.0.0.0:4321
```

**Krok 2: Weryfikacja dostępności**

Otwórz przeglądarkę i sprawdź:
- http://localhost:4321 - strona główna działa
- http://localhost:4321/login - strona logowania działa

### 5.2. Uruchomienie testów E2E

**W drugim terminalu:**

```bash
npm run test:e2e
```

### 5.3. Interpretacja wyników

Playwright uruchamia testy w przeglądarce:
- Symuluje rzeczywiste interakcje użytkownika
- Sprawdza przepływy biznesowe end-to-end
- Generuje screenshoty w przypadku błędów

**Przykład sukcesu:**

```
Running 24 tests using 4 workers

  ✓ e2e/auth.spec.ts:10:1 › User can login (2.3s)
  ✓ e2e/auth.spec.ts:25:1 › User can register (3.1s)
  ✓ e2e/expense.spec.ts:12:1 › User can create expense (4.2s)
  ✓ e2e/dashboard-analytics.spec.ts:8:1 › Dashboard shows analytics (1.8s)
  ✓ e2e/receipt-scanning.spec.ts:15:1 › User can scan receipt (5.6s)

  24 passed (45.2s)
```

### 5.4. Tryby uruchamiania testów E2E

**UI Mode (interaktywny):**
```bash
npm run test:e2e:ui
```
Otwiera interfejs Playwright do śledzenia testów w czasie rzeczywistym.

**Headed Mode (widzisz przeglądarkę):**
```bash
npm run test:e2e:headed
```
Testy uruchamiają się w widocznej przeglądarce.

**Debug Mode:**
```bash
npm run test:e2e:debug
```
Zatrzymuje testy na każdym kroku, pozwala na inspekcję.

**Tylko krytyczne testy:**
```bash
npm run test:e2e:critical
```
Uruchamia tylko testy skanowania paragonów i analityki dashboardu.

**Mobile (Android):**
```bash
npm run test:e2e:mobile
```
Testuje aplikację w trybie mobilnym (Android emulation).

### 5.5. Debugowanie nieprzeszłych testów E2E

**Typowe problemy:**

1. **Timeout during login:**
   ```
   TimeoutError: page.goto: Timeout 30000ms exceeded
   ```
   **Rozwiązanie:** 
   - Sprawdź czy `npm run dev:e2e` działa
   - Otwórz http://localhost:4321 w przeglądarce

2. **Invalid credentials:**
   ```
   Error: Nieprawidłowy email lub hasło
   ```
   **Rozwiązanie:**
   - Sprawdź `E2E_USERNAME` i `E2E_PASSWORD` w `.env.test`
   - Upewnij się że użytkownik istnieje w bazie

3. **Element not found:**
   ```
   Error: locator.click: Target closed
   ```
   **Rozwiązanie:**
   - Uruchom w headed mode: `npm run test:e2e:headed`
   - Zobacz co dzieje się na stronie

### 5.6. Przeglądanie raportu

```bash
npm run test:e2e:report
```

Otwiera HTML raport z:
- Szczegółami każdego testu
- Screenshotami błędów
- Timeline wykonania
- Trace viewer

**✅ Checkpoint:** Wszystkie testy E2E przechodzą pomyślnie.

---

## 6. Kompleksowa weryfikacja

### 6.1. Uruchomienie wszystkich testów naraz

```bash
npm run test:all
```

Ten skrypt uruchamia sekwencyjnie:
1. Testy jednostkowe
2. Testy integracyjne  
3. Testy E2E

**⚠️ UWAGA:** Przed uruchomieniem upewnij się że:
- Serwer dev działa w osobnym terminalu: `npm run dev:e2e`
- Wszystkie pliki `.env` są skonfigurowane
- Użytkownik testowy istnieje

### 6.2. Interpretacja wyników

Skrypt zatrzyma się na pierwszym nieprzeszłym etapie:
- Jeśli unit testy nie przejdą → nie uruchomi integration
- Jeśli integration nie przejdą → nie uruchomi E2E

**Przykład sukcesu:**

```
> npm run test:unit
  ✓ 25 tests passed

> npm run test:integration
  ✓ 45 tests passed

> npm run test:e2e
  ✓ 24 tests passed

All tests completed successfully! ✨
```

---

## 7. Checklist przed deploymentem

### 7.1. Środowisko

- [ ] Plik `.env` istnieje i jest poprawnie skonfigurowany
- [ ] Plik `.env.test` istnieje i jest poprawnie skonfigurowany
- [ ] Użytkownik testowy (`test@test.com`) istnieje w Supabase
- [ ] Wszystkie zmienne środowiskowe są ustawione
- [ ] Supabase jest dostępny i działa

### 7.2. Kod

- [ ] `npm run lint` - ✅ Brak błędów
- [ ] `npm run format` - ✅ Kod sformatowany
- [ ] `npm run test:unit` - ✅ Wszystkie testy przeszły
- [ ] `npm run test:integration` - ✅ Wszystkie testy przeszły
- [ ] `npm run test:e2e` - ✅ Wszystkie testy przeszły

### 7.3. Build

- [ ] `npm run build` - ✅ Build zakończony sukcesem
- [ ] Sprawdzono logi buildu pod kątem ostrzeżeń
- [ ] Sprawdzono rozmiar bundle'a

### 7.4. Dokumentacja

- [ ] README.md jest aktualny
- [ ] Changelog jest zaktualizowany (jeśli używany)
- [ ] Wszystkie braking changes są udokumentowane

### 7.5. Bezpieczeństwo

- [ ] Żadne sekrety nie są commitowane do repo
- [ ] `.env` jest w `.gitignore`
- [ ] Polityki RLS są prawidłowo skonfigurowane
- [ ] API endpoints są zabezpieczone

### 7.6. Migracje bazy danych

- [ ] Wszystkie migracje są zastosowane
- [ ] Migracje działają bez błędów
- [ ] Backup bazy został wykonany (produkcja)

---

## 8. Skróty i szybkie komendy

### Szybka weryfikacja (bez E2E)

```bash
npm run lint && npm run test:unit && npm run test:integration
```

### Tylko krytyczne testy

```bash
npm run lint && npm run test:unit && npm run test:e2e:critical
```

### Kompletna weryfikacja z coveragem

```bash
npm run lint && npm run test:coverage && npm run test:integration:coverage && npm run test:e2e
```

### Debug konkretnego problemu

```bash
# Unit test w watch mode
npm run test:watch -- nazwa-pliku.test.ts

# Integration test z UI
npm run test:integration:ui

# E2E test w debug mode
npm run test:e2e:debug
```

---

## 9. Troubleshooting

### Problem: Testy timeout

**Symptom:** Testy przekraczają limit czasu

**Rozwiązanie:**
1. Sprawdź połączenie z bazą danych
2. Zwiększ timeout w konfiguracji testów
3. Sprawdź czy serwer dev działa

### Problem: RLS Policy Errors

**Symptom:** `new row violates row-level security policy`

**Rozwiązanie:**
1. Sprawdź czy użytkownik testowy ma profil w tabeli `profiles`
2. Zweryfikuj polityki RLS w Supabase Dashboard
3. Uruchom migrację `20251212225400_backfill_missing_profiles.sql`

### Problem: Flaky E2E tests

**Symptom:** Testy przechodzą losowo

**Rozwiązanie:**
1. Dodaj eksplicytne `waitFor` przed interakcjami
2. Użyj `page.waitForLoadState('networkidle')`
3. Zwiększ timeout dla elementów

### Problem: Missing environment variables

**Symptom:** `Error: SUPABASE_URL is not defined`

**Rozwiązanie:**
1. Sprawdź czy `.env` i `.env.test` istnieją
2. Zrestartuj terminal
3. Sprawdź czy zmienne są poprawnie nazwane (bez spacji)

---

## 10. Podsumowanie

Ten dokument zapewnia kompleksową weryfikację aplikacji przed deploymentem. 

**Minimalna ścieżka weryfikacji:**
```bash
# Terminal 1: Uruchom serwer
npm run dev:e2e

# Terminal 2: Uruchom wszystkie testy
npm run lint && npm run test:all
```

**Jeśli wszystkie kroki przeszły pomyślnie:**
✅ Aplikacja jest gotowa do wdrożenia!

**W przypadku problemów:**
- Użyj sekcji Troubleshooting
- Uruchom testy w trybie debug
- Sprawdź logi dla szczegółów

---

*Ostatnia aktualizacja: 2025-12-14*