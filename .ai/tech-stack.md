# Stos Technologiczny Projektu "Paragoniusz"

## 1. Wprowadzenie

Celem tego dokumentu jest szczegółowe przedstawienie wybranego stosu technologicznego dla aplikacji **Paragoniusz**. Każdy element został dobrany tak, aby maksymalnie efektywnie realizować wymagania zdefiniowane w dokumencie **PRD**, ze szczególnym uwzględnieniem szybkości wdrożenia MVP, skalowalności i bezpieczeństwa. Poniższy opis ma służyć jako przewodnik dla deweloperów implementujących poszczególne funkcjonalności.

---

## 2. Architektura Ogólna

Aplikacja będzie działać w architekturze **JAMstack z elementami serverless**.

- **Frontend:** Zbudowany w **Astro**, będzie serwowany jako zbiór zoptymalizowanych, statycznych plików HTML, CSS i minimalnej ilości JavaScript. Interaktywne części interfejsu (tzw. "wyspy") będą renderowane za pomocą **React**.
- **Backend (BaaS):** Cała logika związana z danymi, uwierzytelnianiem i przechowywaniem plików będzie obsługiwana przez **Supabase**. Eliminuje to potrzebę tworzenia i utrzymywania tradycyjnego serwera aplikacyjnego.
- **Logika AI:** Kluczowa funkcja przetwarzania paragonów zostanie zrealizowana jako funkcja serverless (**Supabase Edge Function**), która będzie bezpiecznie komunikować się z zewnętrzną usługą **OpenRouter.ai**.
- **Infrastruktura:** Procesy CI/CD będą zarządzane przez **GitHub Actions**, a finalna aplikacja zostanie skonteneryzowana za pomocą **Dockera** i uruchomiona na serwerze **DigitalOcean**.

---

## 3. Szczegółowy Podział Technologii i Realizacja Funkcjonalności

### Frontend: Szybkość i Interaktywność

Frontend jest kluczowy dla zapewnienia responsywnego i "lekkiego" doświadczenia, zwłaszcza na urządzeniach mobilnych (zgodnie z założeniem _mobile-first_ z **PRD 1.**).

| Technologia        | Rola w Projekcie                                                                                                                                                     | Realizowane Wymagania (PRD)      |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------- |
| **Astro 5**        | Główny framework. Odpowiada za budowanie ultraszybkich, domyślnie statycznych stron. Idealny do renderowania **Panelu Głównego** (**3.2**) czy stron z ustawieniami. | `3.2`, `3.6`                     |
| **React 19**       | Biblioteka do tworzenia interaktywnych "wysp" wewnątrz Astro. Będzie używany do budowy komponentów wymagających stanu, np. formularzy.                               | `3.3`, `3.4`, `US-009`, `US-010` |
| **TypeScript 5**   | Zapewnia bezpieczeństwo typów, co ułatwia pracę z danymi z API i minimalizuje błędy na etapie dewelopmentu.                                                          | Całość projektu                  |
| **Tailwind CSS 4** | Framework CSS typu _utility-first_ do szybkiego i spójnego stylowania komponentów.                                                                                   | Całość interfejsu użytkownika    |
| **Shadcn/ui**      | Zbiór gotowych, dostępnych i konfigurowalnych komponentów React (przyciski, formularze, modale), które drastycznie przyspieszą budowę UI.                            | `3.1`, `3.3`, `3.4`, `3.6`       |

**Przykład implementacji:** **Panel Główny** (**PRD 3.2**) zostanie wyrenderowany przez Astro jako strona statyczna. Jednak lista wydatków i wykres kołowy będą komponentami React, które pobiorą dane po stronie klienta i umożliwią interakcje (np. przewijanie).

### Backend: Szybkość, Bezpieczeństwo i Prostota

Supabase to serce naszej aplikacji, które dostarcza gotowe bloki funkcjonalne, pozwalając nam skupić się na logice biznesowej.

| Usługa Supabase           | Rola w Projekcie                                                                                                                                                                                                                                              | Realizowane Wymagania (PRD)                                           |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------- |
| **Authentication**        | Kompletne rozwiązanie do zarządzania użytkownikami. Obsłuży rejestrację, logowanie, zarządzanie sesją ("Zapamiętaj mnie") i usuwanie konta.                                                                                                                   | `3.1`, `US-001` do `US-006`                                           |
| **Database (PostgreSQL)** | Przechowywanie danych o wydatkach i predefiniowanych kategoriach. Supabase automatycznie generuje REST API do operacji CRUD, co upraszcza dodawanie, edycję i usuwanie wydatków. **Row Level Security (RLS)** zapewni, że użytkownicy widzą tylko swoje dane. | `3.3`, `3.5`, `US-009`, `US-011`, `US-012`                            |
| **Storage**               | Posłuży jako **tymczasowy magazyn** na zdjęcia paragonów przesyłane przez użytkowników. Pliki będą wgrywane tutaj przed wysłaniem do analizy AI.                                                                                                              | `3.4` (zgodnie z wymogiem o nieprzechowywaniu zdjęć po przetworzeniu) |
| **Edge Functions**        | Funkcje serverless (Deno). Stworzymy tu funkcję, która będzie **bezpiecznym pośrednikiem** między naszą aplikacją a OpenRouter. To tutaj będzie przechowywany klucz API, dzięki czemu nigdy nie zostanie on ujawniony w kodzie frontendu.                     | `3.4`, `6.2`                                                          |

### AI: Elastyczność i Optymalizacja Kosztów

Funkcja skanowania paragonów jest kluczowym wyróżnikiem produktu. Jej sukces zależy od jakości i kosztu ekstrakcji danych.

| Technologia       | Rola w Projekcie                                                                                                                                                                                                                                                                                                         | Realizowane Wymagania (PRD)      |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------- |
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
    - Przekazuje otrzymany JSON z powrotem do aplikacji frontendowej.
    - **Usuwa plik zdjęcia** z Supabase Storage, realizując wymóg o nieprzechowywaniu paragonów.
7.  **Frontend (React):** Komponent formularza otrzymuje dane i wypełnia nimi pola, prezentując użytkownikowi zagregowane kwoty do weryfikacji.
8.  **Frontend -> Supabase Database:** Po zatwierdzeniu przez użytkownika, frontend wysyła standardowe zapytanie do API Supabase, tworząc nowe rekordy w tabeli `expenses` w bazie PostgreSQL. Dashboard jest aktualizowany.

---

## 5. Testing: Jakość i Niezawodność

Testy są kluczowe dla zapewnienia stabilności aplikacji, szczególnie w kontekście krytycznych funkcji takich jak przetwarzanie paragonów AI i zarządzanie danymi finansowymi. Strategia testowania opiera się na modelu piramidy testów: 70% testów jednostkowych, 20% testów integracyjnych, 10% testów E2E.

### Testy Jednostkowe (Unit Tests)

| Technologia               | Rola w Projekcie                                                                                                                                                                                 | Realizowane Wymagania                                    |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------- |
| **Vitest**                | Główny framework do testów jednostkowych i integracyjnych. Natywna integracja z Vite (używanym przez Astro), znacznie szybszy niż Jest dzięki wykorzystaniu Vite's dev server.                   | Testy logiki biznesowej, walidacji, transformacji danych |
| **React Testing Library** | Framework do testowania komponentów React zgodnie z best practices. Skupia się na testowaniu z perspektywy użytkownika (co widzi i z czym wchodzi w interakcję), a nie szczegółów implementacji. | Testy komponentów UI, formularzy, interakcji użytkownika |
| **Happy-DOM**             | Lekka implementacja DOM dla środowiska testowego. Szybsza alternatywa dla jsdom, idealna do testów jednostkowych komponentów.                                                                    | Środowisko testowe dla komponentów React                 |

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
    environment: "happy-dom",
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
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

| Technologia    | Rola w Projekcie                                                                                                                                                                                                                                                            | Realizowane Wymagania                                       |
| :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| **Playwright** | Framework do testów E2E oficjalnie rekomendowany przez Astro. Wspiera testowanie w wielu przeglądarkach (Chromium, Firefox, WebKit), posiada wbudowane mechanizmy automatycznego oczekiwania (auto-waiting) redukujące niestabilne testy, oraz trace viewer do debugowania. | Testy pełnych przepływów użytkownika, cross-browser testing |

**Kluczowe scenariusze E2E:**

1. **Kompletny przepływ AI Receipt Scan**: Login → Upload zdjęcia → Weryfikacja danych AI → Edycja → Zapis → Weryfikacja na dashboardzie
2. **Registration to First Expense**: Rejestracja → Login → Pusty dashboard → Dodanie pierwszego wydatku → Weryfikacja
3. **Dashboard Analytics Flow**: Wielokrotne wydatki → Weryfikacja sum → Wykres kołowy → Filtrowanie dat

**Przykład konfiguracji (`playwright.config.ts`):**

```typescript
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Testy Funkcji Edge (Edge Functions Testing)

| Technologia   | Rola w Projekcie                                                                                                                                                                    | Realizowane Wymagania                                                                                |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
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

| Technologia        | Rola w Projekcie                                                                                                                                                                                                                                        | Realizowane Wymagania                  |
| :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------- |
| **Testcontainers** | Framework umożliwiający uruchomienie prawdziwej instancji PostgreSQL w kontenerze Docker dla testów integracyjnych. Pozwala na izolowane testowanie Row Level Security (RLS) policies, database constraints, triggers, oraz pełnej integracji Supabase. | Testy RLS, constraints, data integrity |

**Kluczowe testy:**

- **RLS Policies**: Użytkownik A nie widzi wydatków użytkownika B
- **Database Constraints**: Odrzucenie ujemnych kwot, przyszłych dat
- **Triggers**: Automatyczna aktualizacja `updated_at` timestamp
- **Foreign Keys**: Weryfikacja integralności referencyjnej kategorii

**Przykład użycia:**

```typescript
import { PostgreSqlContainer } from "testcontainers";

describe("Database Integration Tests", () => {
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    await runMigrations(container.getConnectionUri());
  });

  afterAll(async () => {
    await container.stop();
  });

  it("should enforce RLS - user A cannot see user B expenses", async () => {
    // Test implementation
  });
});
```

### Mockowanie i Dane Testowe

| Technologia                   | Rola w Projekcie                                                                                                                                                                                        | Realizowane Wymagania                         |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------- |
| **MSW (Mock Service Worker)** | Biblioteka do mockowania API na poziomie sieciowym. Używana do mockowania OpenRouter API w testach integracyjnych, aby uniknąć kosztów rzeczywistych wywołań AI i zapewnić przewidywalne wyniki testów. | Testy integracyjne bez kosztów API            |
| **@faker-js/faker**           | Generator realistycznych danych testowych (kwoty, daty, kategorie). Wspiera locale polski, co jest kluczowe dla testowania z polskimi nazwami kategorii.                                                | Factory pattern dla generowania test fixtures |

**Strategia mockowania:**

- **Unit Tests**: Pełne mockowanie Supabase client i OpenRouter
- **Integration Tests**: MSW dla OpenRouter, Testcontainers dla bazy danych
- **E2E Tests**: Prawdziwy Supabase test project, mockowanie tylko OpenRouter (opcjonalnie)

**Przykład MSW setup:**

```typescript
import { setupServer } from "msw/node";
import { rest } from "msw";

const server = setupServer(
  rest.post("https://openrouter.ai/api/v1/chat/completions", (req, res, ctx) => {
    return res(
      ctx.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [{ name: "Mleko", amount: 5.5, category: "żywność" }],
                total: 5.5,
                date: "2024-01-15",
              }),
            },
          },
        ],
      })
    );
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

## 6. Hosting i Wdrożenie: Analiza Środowiska Produkcyjnego

### Model Operacyjny Frameworka

**Astro 5 w trybie Server-Side Rendering (SSR)** jest głównym frameworkiem aplikacji z konkretnymi wymaganiami operacyjnymi:

- **Środowisko Runtime**: Node.js zdolny do wykonywania kodu serwerowego dla każdego żądania HTTP
- **Renderowanie Dynamiczne**: Strony renderowane na żądanie z obsługą middleware (autoryzacja JWT przez Supabase)
- **Zarządzanie Sesją**: Obsługa ciasteczek i sesji dla autoryzacji użytkownika
- **Komunikacja z Bazą Danych**: Komunikacja w czasie rzeczywistym z PostgreSQL w Supabase
- **Model Wdrożenia**: Wymaga długo działających procesów Node.js lub konteneryzacji aplikacji

Ten model operacyjny bezpośrednio wpływa na wybór platformy hostingowej, ponieważ musi ona wspierać ciągłe procesy serwerowe lub orkiestrację kontenerów, w przeciwieństwie do statycznej generacji stron, która może być serwowana bezpośrednio z CDN.

---

### Rekomendowane Usługi Hostingowe (Natywne dla Astro)

#### 1. Cloudflare Pages ⭐ (Główna Rekomendacja)

**Typ Platformy:** Edge Computing / Serverless
**Oficjalne Wsparcie Astro:** Tak (przez adapter `@astrojs/cloudflare`)
**Ocena:** 9/10

**Mocne Strony:**
- Nielimitowana przepustowość i żądania w planie darmowym
- Globalna sieć edge (300+ lokalizacji) - najlepszy TTFB
- Zero ograniczeń komercyjnych w planie darmowym
- Automatyczne środowiska preview dla wszystkich PR
- Natywne wsparcie Astro SSR z minimalną konfiguracją
- Wbudowana analityka bez dodatkowych kosztów
- Automatyczne skalowanie bez dodatkowych kosztów

**Słabe Strony:**
- Runtime Workers to V8 isolate, nie pełny Node.js (rzadkie problemy z kompatybilnością)
- Limity czasu CPU (50ms na żądanie) mogą wpłynąć na złożone operacje w planie darmowym
- Wymaga testowania kompatybilności pakietów npm z runtime Workers

**Złożoność Wdrażania:** ⭐⭐⭐⭐⭐
Instalacja adaptera, konfiguracja `astro.config.mjs`, wdrożenie przez integrację GitHub. Jednolinienkowe wdrożenie z automatycznym wykrywaniem środowiska.

**Kompatybilność:** ⭐⭐⭐⭐
Supabase SDK w pełni kompatybilny. Większość pakietów npm działa, ale edge runtime może mieć ograniczenia dla API specyficznych dla Node.js.

**Środowiska Równoległe:** ⭐⭐⭐⭐⭐
Automatyczne preview PR, nielimitowane środowiska preview, oddzielne zmienne production/staging.

**Cennik:**
- **Darmowy:** Nielimitowane żądania/przepustowość, 500 buildów/miesiąc, ✅ użycie komercyjne dozwolone
- **Pro ($20/miesiąc):** 5,000 buildów/miesiąc, zaawansowana analityka

**Rekomendacja:** Najlepszy dla Paragoniusz ze względu na nielimitowany plan darmowy bez ograniczeń komercyjnych, umożliwiający przejście MVP-do-startupu bez migracji platformy.

---

#### 2. Vercel

**Typ Platformy:** Edge Computing / Serverless
**Oficjalne Wsparcie Astro:** Tak (przez adapter `@astrojs/vercel`)
**Ocena:** 8/10

**Mocne Strony:**
- Wdrożenie Astro bez konfiguracji
- Doskonałe developer experience i narzędzia
- Automatyczne HTTPS i domeny preview
- Zaawansowany monitoring i analityka
- Infrastruktura produkcyjna
- Bezproblemowa integracja z GitHub

**Słabe Strony:**
- Plan darmowy zabrania użytku komercyjnego (❌ krytyczne dla ewolucji startupu)
- Ograniczenia Edge Runtime (nie pełny Node.js)
- Plan Pro wymagany od początku dla projektów komercyjnych ($20/miesiąc)
- Limity czasu wykonania: 10s (Hobby), 60s (Pro)

**Złożoność Wdrażania:** ⭐⭐⭐⭐⭐
Liderująca prostota w branży. Automatyczne wykrywanie i konfiguracja frameworka.

**Kompatybilność:** ⭐⭐⭐⭐
Pełne wsparcie Astro SSR. Edge Runtime może powodować problemy z bibliotekami specyficznymi dla Node.js.

**Środowiska Równoległe:** ⭐⭐⭐⭐⭐
Automatyczne preview dla każdego PR, dedykowane środowiska production/preview/development.

**Cennik:**
- **Hobby (Darmowy):** 100GB przepustowości/miesiąc, 6,000 minut buildów, ❌ bez użytku komercyjnego
- **Pro ($20/miesiąc):** 1TB przepustowości, nielimitowane buildy, użytek komercyjny dozwolony

**Rekomendacja:** Rozważ tylko jeśli budżet pozwala na $20/miesiąc od początku. Nie nadaje się do fazy darmowego MVP przechodzącego w użytek komercyjny.

---

#### 3. Netlify

**Typ Platformy:** Platforma JAMstack / Serverless
**Oficjalne Wsparcie Astro:** Tak (przez adapter `@astrojs/netlify`)
**Ocena:** 7/10

**Mocne Strony:**
- Dojrzała platforma z rozbudowaną dokumentacją
- Plan darmowy pozwala na użytek komercyjny (w ramach limitów)
- Branch deploys i PR previews
- Łatwe rollbacki
- Zmienne środowiskowe specyficzne dla kontekstu

**Słabe Strony:**
- Funkcje działają na AWS Lambda (1-2 sekundy cold start)
- Limity czasu wykonania: 10s (Starter), 26s (Pro)
- Wymagana konfiguracja adaptera
- Build plugin może kolidować z pipeline Astro
- Wolniejsze niż alternatywy edge-native (Cloudflare/Vercel)

**Złożoność Wdrażania:** ⭐⭐⭐⭐
Wymaga instalacji i konfiguracji adaptera. Ogólnie proste, ale bardziej skomplikowane niż Vercel/Cloudflare.

**Kompatybilność:** ⭐⭐⭐⭐
Astro SSR działa dobrze, ale routing może wymagać dodatkowej konfiguracji. Lambda runtime w pełni kompatybilny z Node.js.

**Środowiska Równoległe:** ⭐⭐⭐⭐⭐
Branch deploys, deploy previews, zmienne specyficzne dla kontekstu, łatwe rollbacki.

**Cennik:**
- **Starter (Darmowy):** 100GB przepustowości, 300 minut buildów, ✅ użytek komercyjny dozwolony
- **Pro ($19/miesiąc):** 1TB przepustowości, nielimitowane buildy

**Rekomendacja:** Nie pierwszy wybór dla Astro SSR ze względu na cold starty Lambda i limity czasu wykonania. Istnieją lepsze alternatywy (Cloudflare Pages).

---

### Platformy Alternatywne (Konteneryzacja)

#### 4. Railway ⭐ (Najlepsza Alternatywa Kontenerowa)

**Typ Platformy:** Platforma Kontenerowa (PaaS)
**Wsparcie Kontenerów:** Docker, Docker Compose, Nixpacks
**Ocena:** 8/10

**Mocne Strony:**
- **Automatyczne środowiska PR** (efemeryczne, auto-usuwanie)
- Pełne środowisko Node.js bez ograniczeń
- Intuicyjny interfejs webowy (najlepsze UX wśród platform kontenerowych)
- Natywne wsparcie Docker Compose
- Zero ograniczeń lub niespodzianek runtime
- Może hostować cały stack włącznie z self-managed Supabase
- Przewidywalne ceny oparte na użyciu

**Słabe Strony:**
- Plan darmowy niewystarczający dla produkcji 24/7 (~15-20 dni uptime)
- Wymaga Dockerfile (lub używa auto-wykrywania Nixpacks)
- Może być droższy niż Fly.io przy większej skali
- Produkcja wymaga płatności od początku (~$10-20/miesiąc)

**Złożoność Wdrażania:** ⭐⭐⭐⭐⭐
Najprostsza platforma kontenerowa. Automatyczne wykrywanie Dockerfile, integracja GitHub, intuicyjny dashboard.

**Kompatybilność:** ⭐⭐⭐⭐⭐
Pełny Node.js bez żadnych ograniczeń. Wszystkie pakiety npm działają. Idealny dla aplikacji z konkretnymi wymaganiami runtime.

**Środowiska Równoległe:** ⭐⭐⭐⭐⭐
Najlepsze wśród platform kontenerowych. Automatyczne środowiska PR z auto-czyszczeniem, dedykowane staging/production.

**Cennik:**
- **Hobby (Darmowy):** $5 kredytu/miesiąc (~100 godzin compute, 512MB RAM, 1 vCPU)
- **Developer ($5/miesiąc):** Dodatkowe $5 kredytu, 5GB RAM, priorytetowe wsparcie
- **Oparte na użyciu:** $0.000231/GB RAM/minuta (~$10/GB RAM/miesiąc)

**Rekomendacja:** Najlepsza opcja konteneryzacji jeśli runtime Cloudflare Workers powoduje problemy. Doskonały dla zespołów chcących pełnej kontroli bez złożoności. Oczekuj $10-20/miesiąc dla małej aplikacji produkcyjnej.

---

#### 5. Fly.io

**Typ Platformy:** Platforma Kontenerowa (Firecracker VMs)
**Wsparcie Kontenerów:** Docker (wymagany Dockerfile)
**Ocena:** 7.5/10

**Mocne Strony:**
- Prawdziwe kontenery Linux (100% kompatybilność Node.js)
- Globalne wdrożenie w wielu regionach
- Może uruchomić Supabase lokalnie (ultra-niska latencja)
- Maksymalna elastyczność i kontrola
- Doskonałe ceny dla większych aplikacji
- Brak ograniczeń komercyjnych w planie darmowym

**Słabe Strony:**
- Stroma krzywa uczenia (potężne CLI)
- Wymaga Dockerfile i konfiguracji `fly.toml`
- Brak natywnych środowisk preview PR (wymaga własnych GitHub Actions)
- Plan darmowy niewystarczający dla produkcji 24/7
- Wymagana większa wiedza DevOps

**Złożoność Wdrażania:** ⭐⭐⭐
Wymaga Dockerfile, fly.toml i znajomości CLI. Więcej konfiguracji niż platformy serverless.

**Kompatybilność:** ⭐⭐⭐⭐⭐
Idealna kompatybilność. Pełny kontener Linux z kompletnym środowiskiem Node.js.

**Środowiska Równoległe:** ⭐⭐⭐
Wymaga ręcznej konfiguracji wielu aplikacji. Brak automatycznych preview PR bez własnej automatyzacji.

**Cennik:**
- **Hobby (Darmowy):** $5 kredytu/miesiąc (~1 shared-cpu VM 24/7 + 3GB storage)
- **Pay-as-you-go:** ~$6/miesiąc za małą VM, $0.01/GB RAM/miesiąc

**Rekomendacja:** Najlepszy dla zespołów z doświadczeniem DevOps potrzebujących konkretnych konfiguracji lub maksymalnej kontroli. Wysoka złożoność nieuzasadniona dla typowej aplikacji Astro.

---

### Krytyczna Analiza: Słabości Platform

#### Złożoność Procesu Wdrażania
- **Cloudflare Pages:** Minimalna - pojedyncza instalacja adaptera
- **Vercel:** Minimalna - zero konfiguracji
- **Railway:** Niska - auto-wykrywanie Dockerfile lub buildpacks
- **Fly.io:** **Wysoka** - wymaga Dockerfile, fly.toml, ekspertyzy CLI
- **Netlify:** **Umiarkowana** - konfiguracja adaptera może kolidować z build pipeline

#### Problemy Kompatybilności ze Stosem
- **Cloudflare Pages:** **Ograniczenia V8 isolate** - niektóre API Node.js niedostępne
- **Vercel:** **Restrykcje Edge Runtime** - podobne do Cloudflare
- **Netlify:** **Cold starty Lambda** (1-2s) - suboptymalne dla SSR
- **Railway/Fly.io:** ✅ Zero problemów z kompatybilnością (pełny Node.js)

#### Konfiguracja Środowisk Równoległych
- **Cloudflare Pages:** ✅ Automatyczne preview PR, nielimitowane środowiska
- **Vercel:** ✅ Automatyczne preview PR, dedykowane środowiska
- **Railway:** ✅ **Automatyczne środowiska PR z auto-czyszczeniem** (najlepsze dla kontenerów)
- **Netlify:** ✅ Branch deploys, deploy previews
- **Fly.io:** ❌ **Brak natywnych preview PR** - wymaga własnych GitHub Actions

#### Plany Subskrypcji i Komercyjna Żywotność
- **Cloudflare Pages:** ✅ **Nielimitowane darmowe użycie komercyjne** (tylko limit 500 buildów/miesiąc)
- **Vercel:** ❌ **Plan darmowy zabrania użytku komercyjnego** - wymaga Pro ($20/miesiąc)
- **Railway:** ⚠️ Plan darmowy niewystarczający dla produkcji 24/7 (oczekuj $10-20/miesiąc)
- **Netlify:** ✅ Plan darmowy pozwala na użytek komercyjny (limit 100GB przepustowości)
- **Fly.io:** ⚠️ Darmowy kredyt nie pokrywa produkcji 24/7 (oczekuj $6-12/miesiąc)

---

### Oceny Platform i Finalne Rekomendacje

| Platforma | Ocena | Wdrożenie | Kompatybilność | Środowiska | Darmowy Tier Komercyjny | Koszt Produkcji |
|-----------|-------|-----------|----------------|------------|------------------------|-----------------|
| **Cloudflare Pages** | **9/10** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Tak (nielimitowany) | $0/miesiąc |
| **Railway** | **8/10** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⚠️ Ograniczony | $10-20/miesiąc |
| **Vercel** | **8/10** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ Nie | $20/miesiąc |
| **Fly.io** | **7.5/10** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⚠️ Ograniczony | $6-12/miesiąc |
| **Netlify** | **7/10** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Tak (ograniczony) | $0-19/miesiąc |

#### Uzasadnienie Ocen

**Cloudflare Pages (9/10):** Nielimitowany plan darmowy z użytkiem komercyjnym, globalna sieć edge, doskonałe wsparcie Astro, automatyczne preview PR. Jedyne ograniczenie: runtime V8 isolate (rzadko problematyczny). Idealny do przejścia MVP-do-startupu bez migracji.

**Railway (8/10):** Najlepsza platforma kontenerowa z automatycznymi środowiskami PR, pełna kompatybilność Node.js, prosty UX. Plan darmowy wystarczy na development, ale produkcja wymaga $10-20/miesiąc. Idealny backup jeśli runtime Cloudflare powoduje problemy.

**Vercel (8/10):** Premium developer experience z wdrożeniem zero-config, ale plan darmowy zabrania użytku komercyjnego. Wymaga zobowiązania $20/miesiąc od początku, co czyni go nieodpowiednim dla fazy darmowego MVP.

**Fly.io (7.5/10):** Maksymalna kontrola z prawdziwymi kontenerami Linux i idealną kompatybilnością, ale wyższa złożoność i ręczna konfiguracja środowisk. Najlepszy dla ekspertów DevOps z konkretnymi potrzebami infrastrukturalnymi.

**Netlify (7/10):** Dojrzała platforma z komercyjnym planem darmowym, ale cold starty Lambda i limity czasu wykonania czynią ją suboptymalną dla Astro SSR. Istnieją lepsze alternatywy.

---

### Strategiczna Rekomendacja dla Paragoniusz

**Faza 1: Rozwój MVP (Darmowy Projekt Poboczny)**
- **Wdróż na Cloudflare Pages**
- Zero kosztów z nielimitowaną przepustowością
- Brak potrzeby migracji przy przejściu na użytek komercyjny
- Globalna wydajność edge od pierwszego dnia

**Faza 2: Rozwój Startupu (Produkt Komercyjny)**
- **Kontynuuj z Cloudflare Pages** (nielimitowany plan darmowy wspiera użytek komercyjny)
- Jeśli pojawią się problemy z kompatybilnością runtime (rzadkie): migruj do Railway
- Oczekiwane koszty: $0/miesiąc (Cloudflare) lub $10-20/miesiąc (Railway)

**Faza 3: Skalowanie (Duży Ruch)**
- Oceń konteneryzację dla zaawansowanych strategii cachowania
- Rozważ Fly.io dla wdrożenia multi-region z edge caching
- Oczekiwane koszty: $50-200/miesiąc w zależności od ruchu

**Mitygacja Ryzyka Migracji:**
1. Buduj z Docker od początku (nawet przy wdrożeniu na Cloudflare)
2. Trzymaj kod infrastruktury w repozytorium (`Dockerfile`, konfiguracje deployment)
3. Abstrakcja logiki specyficznej dla deploymentu (wykrywanie środowiska, sprawdzenia runtime)
4. Testuj lokalnie z Docker aby upewnić się, że konteneryzacja działa

**Dlaczego Unikać Niektórych Platform:**
- ❌ **Vercel:** Ograniczenie komercyjne w planie darmowym niekompatybilne ze strategią MVP-do-startupu
- ❌ **Netlify:** Cold starty Lambda tworzą suboptymalne UX dla Astro SSR; dostępne lepsze alternatywy
- ⚠️ **Fly.io:** Złożoność nieuzasadniona chyba że istnieją konkretne wymagania infrastrukturalne

---

## 7. Podsumowanie Techniczne

Wybrany stos technologiczny dla projektu **Paragoniusz** został zoptymalizowany pod kątem:

1. **Szybkości wdrożenia MVP** - Astro + Supabase minimalizują boilerplate
2. **Skalowalności** - Serverless architecture + PostgreSQL + Edge computing
3. **Bezpieczeństwa** - RLS policies + Edge Functions dla kluczy API
4. **Jakości** - Kompleksowa strategia testowania (Vitest, Playwright, Testcontainers)
5. **Kosztów** - OpenRouter.ai jako brama do wielu modeli LLM + Cloudflare Pages z nielimitowanym free tier
6. **Developer Experience** - TypeScript, hot reload, współczesne tooling
7. **Hostingu i Wdrożenia** - **Cloudflare Pages** jako główna rekomendacja dla:
   - Zero kosztów w fazie MVP z nielimitowaną przepustowością
   - Brak ograniczeń komercyjnych (płynne przejście do startupu)
   - Globalna sieć edge (300+ lokalizacji) dla optymalnej wydajności
   - Automatyczne środowiska preview dla każdego PR
   - **Railway** jako backup dla pełnej kompatybilności Node.js

Wszystkie technologie są dobrze udokumentowane, mają aktywne społeczności, i są zgodne z najnowszymi standardami web development 2024/2025.

**Strategia hostingowa** zapewnia zero kosztów operacyjnych w fazie MVP przy zachowaniu możliwości skalowania do produktu komercyjnego bez konieczności migracji infrastruktury. Wybór Cloudflare Pages eliminuje ryzyko finansowe w początkowej fazie rozwoju, a nielimitowany free tier z użytkiem komercyjnym umożliwia organiczny rozwój aplikacji bez nagłej potrzeby zmiany platformy lub ponoszenia kosztów infrastruktury.
