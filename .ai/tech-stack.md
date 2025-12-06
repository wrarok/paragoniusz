# Stos Technologiczny Projektu "Paragoniusz"

## 1. Wprowadzenie

Celem tego dokumentu jest szczegółowe przedstawienie wybranego stosu technologicznego dla aplikacji **Paragoniusz**. Każdy element został dobrany tak, aby maksymalnie efektywnie realizować wymagania zdefiniowane w dokumencie **PRD**, ze szczególnym uwzględnieniem szybkości wdrożenia MVP, skalowalności i bezpieczeństwa. Poniższy opis ma służyć jako przewodnik dla deweloperów implementujących poszczególne funkcjonalności.

---

## 2. Architektura Ogólna

Aplikacja będzie działać w architekturze **JAMstack z elementami serverless**.

* **Frontend:** Zbudowany w **Astro**, będzie serwowany jako zbiór zoptymalizowanych, statycznych plików HTML, CSS i minimalnej ilości JavaScript. Interaktywne części interfejsu (tzw. "wyspy") będą renderowane za pomocą **React**.
* **Backend (BaaS):** Cała logika związana z danymi, uwierzytelnianiem i przechowywaniem plików będzie obsługiwana przez **Supabase**. Eliminuje to potrzebę tworzenia i utrzymywania tradycyjnego serwera aplikacyjnego.
* **Logika AI:** Kluczowa funkcja przetwarzania paragonów zostanie zrealizowana jako funkcja serverless (**Supabase Edge Function**), która będzie bezpiecznie komunikować się z zewnętrzną usługą **OpenRouter.ai**.
* **Infrastruktura:** Procesy CI/CD będą zarządzane przez **GitHub Actions**, a finalna aplikacja zostanie skonteneryzowana za pomocą **Dockera** i uruchomiona na serwerze **DigitalOcean**.



---

## 3. Szczegółowy Podział Technologii i Realizacja Funkcjonalności

### Frontend: Szybkość i Interaktywność

Frontend jest kluczowy dla zapewnienia responsywnego i "lekkiego" doświadczenia, zwłaszcza na urządzeniach mobilnych (zgodnie z założeniem *mobile-first* z **PRD 1.**).

| Technologia | Rola w Projekcie | Realizowane Wymagania (PRD) |
| :--- | :--- | :--- |
| **Astro 5** | Główny framework. Odpowiada za budowanie ultraszybkich, domyślnie statycznych stron. Idealny do renderowania **Panelu Głównego** (**3.2**) czy stron z ustawieniami. | `3.2`, `3.6` |
| **React 19** | Biblioteka do tworzenia interaktywnych "wysp" wewnątrz Astro. Będzie używany do budowy komponentów wymagających stanu, np. formularzy. | `3.3`, `3.4`, `US-009`, `US-010` |
| **TypeScript 5** | Zapewnia bezpieczeństwo typów, co ułatwia pracę z danymi z API i minimalizuje błędy na etapie dewelopmentu. | Całość projektu |
| **Tailwind CSS 4** | Framework CSS typu *utility-first* do szybkiego i spójnego stylowania komponentów. | Całość interfejsu użytkownika |
| **Shadcn/ui** | Zbiór gotowych, dostępnych i konfigurowalnych komponentów React (przyciski, formularze, modale), które drastycznie przyspieszą budowę UI. | `3.1`, `3.3`, `3.4`, `3.6` |

**Przykład implementacji:** **Panel Główny** (**PRD 3.2**) zostanie wyrenderowany przez Astro jako strona statyczna. Jednak lista wydatków i wykres kołowy będą komponentami React, które pobiorą dane po stronie klienta i umożliwią interakcje (np. przewijanie).

### Backend: Szybkość, Bezpieczeństwo i Prostota

Supabase to serce naszej aplikacji, które dostarcza gotowe bloki funkcjonalne, pozwalając nam skupić się na logice biznesowej.

| Usługa Supabase | Rola w Projekcie | Realizowane Wymagania (PRD) |
| :--- | :--- | :--- |
| **Authentication** | Kompletne rozwiązanie do zarządzania użytkownikami. Obsłuży rejestrację, logowanie, zarządzanie sesją ("Zapamiętaj mnie") i usuwanie konta. | `3.1`, `US-001` do `US-006` |
| **Database (PostgreSQL)** | Przechowywanie danych o wydatkach i predefiniowanych kategoriach. Supabase automatycznie generuje REST API do operacji CRUD, co upraszcza dodawanie, edycję i usuwanie wydatków. **Row Level Security (RLS)** zapewni, że użytkownicy widzą tylko swoje dane. | `3.3`, `3.5`, `US-009`, `US-011`, `US-012` |
| **Storage** | Posłuży jako **tymczasowy magazyn** na zdjęcia paragonów przesyłane przez użytkowników. Pliki będą wgrywane tutaj przed wysłaniem do analizy AI. | `3.4` (zgodnie z wymogiem o nieprzechowywaniu zdjęć po przetworzeniu) |
| **Edge Functions** | Funkcje serverless (Deno). Stworzymy tu funkcję, która będzie **bezpiecznym pośrednikiem** między naszą aplikacją a OpenRouter. To tutaj będzie przechowywany klucz API, dzięki czemu nigdy nie zostanie on ujawniony w kodzie frontendu. | `3.4`, `6.2` |

### AI: Elastyczność i Optymalizacja Kosztów

Funkcja skanowania paragonów jest kluczowym wyróżnikiem produktu. Jej sukces zależy od jakości i kosztu ekstrakcji danych.

| Technologia | Rola w Projekcie | Realizowane Wymagania (PRD) |
| :--- | :--- | :--- |
| **OpenRouter.ai** | Brama (router) do wielu modeli LLM (OpenAI, Anthropic, Google). Pozwoli nam to na eksperymentowanie i wybór modelu, który najlepiej radzi sobie z odczytem polskich paragonów, oferując najlepszy stosunek jakości do ceny. Spełnienie celu **<20% wskaźnika korekt** (**6.2**) będzie możliwe dzięki tej elastyczności. | `3.4`, `6.2`, `US-010`, `US-013` |

---

## 4. Przykładowy Przepływ Danych: Dodawanie Wydatku ze Zdjęcia (`US-010`)

Aby zilustrować, jak te technologie współdziałają, przeanalizujmy krok po kroku proces dodawania wydatku ze zdjęcia:

1.  **Frontend (React/Astro):** Użytkownik w formularzu dodawania wydatku klika przycisk "Wypełnij ze zdjęcia" i wybiera plik.
2.  **Frontend -> Supabase Storage:** Aplikacja kliencka, używając SDK Supabase, bezpiecznie wgrywa zdjęcie paragonu do dedykowanego bucketa w Supabase Storage.
3.  **Frontend -> Supabase Edge Function:** Po pomyślnym wgraniu, frontend wywołuje naszą funkcję serverless (np. `process-receipt`), przekazując jej ścieżkę do wgranego pliku.
4.  **Edge Function -> OpenRouter.ai:** Funkcja, działając po stronie serwera, odczytuje z zmiennych środowiskowych **sekretny klucz API** do OpenRouter. Następnie wysyła zapytanie do AI, zawierające obrazek. Tutaj realizowany jest timeout 20 sekund (**PRD 3.4**).
5.  **OpenRouter.ai -> Edge Function:** Model AI przetwarza obraz, zwracając ustrukturyzowane dane (JSON) z pozycjami, sugerowanymi kategoriami i kwotami.
6.  **Edge Function -> Frontend & Supabase Storage:** Funkcja serverless:
    * Przekazuje otrzymany JSON z powrotem do aplikacji frontendowej.
    * **Usuwa plik zdjęcia** z Supabase Storage, realizując wymóg o nieprzechowywaniu paragonów.
7.  **Frontend (React):** Komponent formularza otrzymuje dane i wypełnia nimi pola, prezentując użytkownikowi zagregowane kwoty do weryfikacji.
8.  **Frontend -> Supabase Database:** Po zatwierdzeniu przez użytkownika, frontend wysyła standardowe zapytanie do API Supabase, tworząc nowe rekordy w tabeli `expenses` w bazie PostgreSQL. Dashboard jest aktualizowany.

---

## 5. Testing: Jakość i Niezawodność

Testy są kluczowe dla zapewnienia stabilności aplikacji, szczególnie w kontekście krytycznych funkcji takich jak przetwarzanie paragonów AI i zarządzanie danymi finansowymi. Strategia testowania opiera się na modelu piramidy testów: 70% testów jednostkowych, 20% testów integracyjnych, 10% testów E2E.

### Testy Jednostkowe (Unit Tests)

| Technologia | Rola w Projekcie | Realizowane Wymagania |
| :--- | :--- | :--- |
| **Vitest** | Główny framework do testów jednostkowych i integracyjnych. Natywna integracja z Vite (używanym przez Astro), znacznie szybszy niż Jest dzięki wykorzystaniu Vite's dev server. | Testy logiki biznesowej, walidacji, transformacji danych |
| **React Testing Library** | Framework do testowania komponentów React zgodnie z best practices. Skupia się na testowaniu z perspektywy użytkownika (co widzi i z czym wchodzi w interakcję), a nie szczegółów implementacji. | Testy komponentów UI, formularzy, interakcji użytkownika |
| **Happy-DOM** | Lekka implementacja DOM dla środowiska testowego. Szybsza alternatywa dla jsdom, idealna do testów jednostkowych komponentów. | Środowisko testowe dla komponentów React |

**Kluczowe obszary pokrycia testami jednostkowymi:**
- [`src/lib/validation/expense-form.validation.ts`](src/lib/validation/expense-form.validation.ts:1) - Walidacja kwot (precyzja 2 miejsc po przecinku, maksymalna wartość)
- [`src/lib/services/receipt.service.ts`](src/lib/services/receipt.service.ts:259-286) - Mapowanie kategorii AI na kategorie bazodanowe
- [`src/lib/services/auth.service.ts`](src/lib/services/auth.service.ts:1) - Logika uwierzytelniania, rate limiting
- [`src/lib/services/expense.service.ts`](src/lib/services/expense.service.ts:18-42) - Walidacja kategorii, operacje CRUD

**Przykład konfiguracji (`vitest.config.ts`):**
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

### Testy End-to-End (E2E)

| Technologia | Rola w Projekcie | Realizowane Wymagania |
| :--- | :--- | :--- |
| **Playwright** | Framework do testów E2E oficjalnie rekomendowany przez Astro. Wspiera testowanie w wielu przeglądarkach (Chromium, Firefox, WebKit), posiada wbudowane mechanizmy automatycznego oczekiwania (auto-waiting) redukujące niestabilne testy, oraz trace viewer do debugowania. | Testy pełnych przepływów użytkownika, cross-browser testing |

**Kluczowe scenariusze E2E:**
1. **Kompletny przepływ AI Receipt Scan**: Login → Upload zdjęcia → Weryfikacja danych AI → Edycja → Zapis → Weryfikacja na dashboardzie
2. **Registration to First Expense**: Rejestracja → Login → Pusty dashboard → Dodanie pierwszego wydatku → Weryfikacja
3. **Dashboard Analytics Flow**: Wielokrotne wydatki → Weryfikacja sum → Wykres kołowy → Filtrowanie dat

**Przykład konfiguracji (`playwright.config.ts`):**
```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Testy Funkcji Edge (Edge Functions Testing)

| Technologia | Rola w Projekcie | Realizowane Wymagania |
| :--- | :--- | :--- |
| **Deno Test** | Natywny test runner dla Deno, w którym działają Supabase Edge Functions. Umożliwia testowanie logiki serverless, rate limitera, konwersji base64, oraz integracji z OpenRouter API. | Testy [`supabase/functions/process-receipt/index.ts`](supabase/functions/process-receipt/index.ts:1) |

**Kluczowe testy:**
- Rate limiter (10 req/min per user)
- Konwersja ArrayBuffer → Base64
- Walidacja ścieżki pliku (security - path traversal)
- Obsługa timeout (20s limit)
- Obsługa błędów OpenRouter API (429, network errors)

**Uruchomienie:**
```bash
deno test --allow-env --allow-net supabase/functions/
```

### Testy Integracyjne Bazy Danych

| Technologia | Rola w Projekcie | Realizowane Wymagania |
| :--- | :--- | :--- |
| **Testcontainers** | Framework umożliwiający uruchomienie prawdziwej instancji PostgreSQL w kontenerze Docker dla testów integracyjnych. Pozwala na izolowane testowanie Row Level Security (RLS) policies, database constraints, triggers, oraz pełnej integracji Supabase. | Testy RLS, constraints, data integrity |

**Kluczowe testy:**
- **RLS Policies**: Użytkownik A nie widzi wydatków użytkownika B
- **Database Constraints**: Odrzucenie ujemnych kwot, przyszłych dat
- **Triggers**: Automatyczna aktualizacja `updated_at` timestamp
- **Foreign Keys**: Weryfikacja integralności referencyjnej kategorii

**Przykład użycia:**
```typescript
import { PostgreSqlContainer } from 'testcontainers';

describe('Database Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  
  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    await runMigrations(container.getConnectionUri());
  });

  afterAll(async () => {
    await container.stop();
  });

  it('should enforce RLS - user A cannot see user B expenses', async () => {
    // Test implementation
  });
});
```

### Mockowanie i Dane Testowe

| Technologia | Rola w Projekcie | Realizowane Wymagania |
| :--- | :--- | :--- |
| **MSW (Mock Service Worker)** | Biblioteka do mockowania API na poziomie sieciowym. Używana do mockowania OpenRouter API w testach integracyjnych, aby uniknąć kosztów rzeczywistych wywołań AI i zapewnić przewidywalne wyniki testów. | Testy integracyjne bez kosztów API |
| **@faker-js/faker** | Generator realistycznych danych testowych (kwoty, daty, kategorie). Wspiera locale polski, co jest kluczowe dla testowania z polskimi nazwami kategorii. | Factory pattern dla generowania test fixtures |

**Strategia mockowania:**
- **Unit Tests**: Pełne mockowanie Supabase client i OpenRouter
- **Integration Tests**: MSW dla OpenRouter, Testcontainers dla bazy danych
- **E2E Tests**: Prawdziwy Supabase test project, mockowanie tylko OpenRouter (opcjonalnie)

**Przykład MSW setup:**
```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post('https://openrouter.ai/api/v1/chat/completions', (req, res, ctx) => {
    return res(ctx.json({
      choices: [{
        message: {
          content: JSON.stringify({
            items: [
              { name: 'Mleko', amount: 5.50, category: 'żywność' },
            ],
            total: 5.50,
            date: '2024-01-15',
          }),
        },
      }],
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Metryki i Cele Jakości

**Coverage Thresholds:**
- Ogólne pokrycie: **70%** (lines, functions, branches, statements)
- Krytyczne ścieżki: **100%** (walidacje, security, financial data)

**Stabilność testów:**
- Wskaźnik flaky tests: **<5%**
- Auto-retry w CI: maksymalnie 2 próby

**Wydajność:**
- Unit tests: **<30 sekund**
- Integration tests: **<5 minut**
- E2E tests: **<15 minut**

**Cel jakości AI:**
- Dokładność AI: **>95%** (na zbiorze testowych paragonów)
- Wskaźnik edycji: **<20%** (zgodnie z PRD 6.2)

---

## 6. Podsumowanie Techniczne

Wybrany stos technologiczny dla projektu **Paragoniusz** został zoptymalizowany pod kątem:

1. **Szybkości wdrożenia MVP** - Astro + Supabase minimalizują boilerplate
2. **Skalowalności** - Serverless architecture + PostgreSQL
3. **Bezpieczeństwa** - RLS policies + Edge Functions dla kluczy API
4. **Jakości** - Kompleksowa strategia testowania (Vitest, Playwright, Testcontainers)
5. **Kosztów** - OpenRouter.ai jako brama do wielu modeli LLM
6. **Developer Experience** - TypeScript, hot reload, współczesne tooling

Wszystkie technologie są dobrze udokumentowane, mają aktywne społeczności, i są zgodne z najnowszymi standardami web development 2024/2025.