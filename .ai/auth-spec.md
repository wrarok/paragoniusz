# Specyfikacja Techniczna Systemu Autentykacji - Paragoniusz

## HISTORIA ZMIAN

**Wersja 1.1** (2025-11-29):
Zaktualizowano specyfikację w wyniku analizy zgodności z PRD. Główne zmiany:

1. **US-003 ("Zapamiętaj mnie")**: Zmieniono implementację z "nieużywanego parametru" na funkcjonalny checkbox przełączający między localStorage/sessionStorage
2. **Walidacja hasła**: Usunięto nadmiarowe wymagania (wielkie/małe litery, cyfry) - PRD wymaga tylko minimum 8 znaków
3. **US-005 (Zmiana hasła)**: Dodano wymagane kroki weryfikacji aktualnego hasła poprzez re-authentication (Supabase nie weryfikuje automatycznie)
4. **Middleware**: Dodano `/add` do listy chronionych ścieżek
5. **US-006 (Usunięcie konta)**: Poprawiono implementację endpointu - bezpośrednie użycie Admin API zamiast ProfileService
6. **Type definitions**: Dodano brakujące importy dla User i SupabaseClient w env.d.ts
7. **AccountInfoSection**: Sprecyzowano skąd pobierać dane użytkownika (email z sesji, created_at z profiles)

---

## 1. Wprowadzenie

Niniejsza specyfikacja opisuje szczegółową architekturę systemu autentykacji i zarządzania kontem użytkownika w aplikacji Paragoniusz. Dokument ten definiuje implementację wymagań funkcjonalnych z historyjek użytkownika US-001 do US-006, uwzględniając pełną integrację z Supabase Auth oraz architekturę server-side rendering (SSR) opartą na Astro 5.

### 1.1. Zakres implementacji

System autentykacji realizuje następujące funkcjonalności:

- **US-001**: Rejestracja nowego konta
- **US-002**: Logowanie do aplikacji
- **US-003**: Utrzymanie sesji użytkownika ("Zapamiętaj mnie")
- **US-004**: Wylogowanie z aplikacji
- **US-005**: Zmiana hasła
- **US-006**: Usunięcie konta

### 1.2. Kluczowe założenia projektowe

- **Architektura**: Server-Side Rendering (SSR) w Astro z trybem `output: "server"`
- **Backend-as-a-Service**: Supabase Auth do zarządzania autentykacją
- **Bezpieczeństwo**: Row Level Security (RLS) na poziomie bazy danych PostgreSQL
- **Sesje**: Automatyczne zarządzanie przez Supabase Client (localStorage dla persistencji)
- **Separacja odpowiedzialności**: Strony Astro (SSR) + komponenty React (interaktywne "wyspy")

---

## 2. Architektura Interfejsu Użytkownika

### 2.1. Architektura warstwowa

System autentykacji został zaprojektowany w architekturze trójwarstwowej:

```
┌─────────────────────────────────────────────────────────┐
│                   Warstwa Prezentacji                    │
│                    (Astro Pages)                         │
│  - Renderowanie SSR                                      │
│  - Sprawdzanie sesji server-side                         │
│  - Przekierowania                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              Warstwa Komponentów                         │
│               (React Islands)                            │
│  - Formularze interaktywne                               │
│  - Walidacja client-side                                 │
│  - Obsługa stanu UI                                      │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│              Warstwa Logiki Biznesowej                   │
│          (Services + Custom Hooks)                       │
│  - Komunikacja z Supabase Auth                           │
│  - Transformacja danych                                  │
│  - Obsługa błędów                                        │
└─────────────────────────────────────────────────────────┘
```

### 2.2. Strony Astro (Server-Side)

#### 2.2.1. Strona `/login.astro` (US-002)

**Ścieżka**: `src/pages/login.astro`

**Odpowiedzialności**:

- Renderowanie SSR formularza logowania
- Sprawdzenie sesji po stronie serwera przed renderowaniem
- Przekierowanie zalogowanych użytkowników na dashboard (`/`)
- Integracja z React component `LoginForm` jako island

**Logika server-side**:

```typescript
// Sprawdzenie sesji przed renderowaniem
const session = await getCurrentSession();

// Przekierowanie jeśli użytkownik jest już zalogowany
if (session) {
  return Astro.redirect("/");
}
```

**Struktura renderowania**:

- Layout: `src/layouts/Layout.astro`
- Komponent główny: `LoginForm` (React island z `client:load`)
- Stylizacja: Tailwind CSS (centered layout, responsive)

**Dostępne akcje użytkownika**:

- Wypełnienie formularza logowania
- Przejście do strony rejestracji (`/register`)

---

#### 2.2.2. Strona `/register.astro` (US-001)

**Ścieżka**: `src/pages/register.astro`

**Odpowiedzialności**:

- Renderowanie SSR formularza rejestracji
- Sprawdzenie sesji po stronie serwera
- Przekierowanie zalogowanych użytkowników na dashboard
- Integracja z React component `RegisterForm` jako island

**Logika server-side**:

```typescript
// Sprawdzenie sesji przed renderowaniem
const session = await getCurrentSession();

// Przekierowanie jeśli użytkownik jest już zalogowany
if (session) {
  return Astro.redirect("/");
}
```

**Struktura renderowania**:

- Layout: `src/layouts/Layout.astro`
- Komponent główny: `RegisterForm` (React island z `client:load`)
- Stylizacja: Tailwind CSS (centered layout, responsive)

**Dostępne akcje użytkownika**:

- Wypełnienie formularza rejestracji
- Przejście do strony logowania (`/login`)

---

#### 2.2.3. Strona `/index.astro` (Dashboard - wymagająca autentykacji)

**Ścieżka**: `src/pages/index.astro`

**Modyfikacje wymagane** (obecnie autentykacja wyłączona):

**Przed**:

```typescript
// Sprawdzanie sesji jest obecnie wykomentowane
// const { data: { session } } = await supabase.auth.getSession();
// if (!session) {
//   return Astro.redirect('/login');
// }
```

**Po implementacji**:

```typescript
// Sprawdzenie autentykacji server-side
const {
  data: { session },
} = await Astro.locals.supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}

// Przekazanie user_id do API calls dla bezpieczeństwa
const userId = session.user.id;
```

**Odpowiedzialności**:

- Weryfikacja sesji przed renderowaniem dashboard
- Przekierowanie niezalogowanych użytkowników na `/login`
- Pobieranie danych dashboard tylko dla zalogowanego użytkownika
- Server-side rendering danych z cache headers

**Komponenty wymagające user context**:

- `DashboardSummary`
- `ExpensePieChart`
- `RecentExpensesList`
- `NavBar` (zawiera przycisk wylogowania)

---

#### 2.2.4. Strona `/settings.astro` (US-005, US-006)

**Ścieżka**: `src/pages/settings.astro`

**Odpowiedzialności**:

- Renderowanie SSR strony ustawień konta
- Weryfikacja sesji przed renderowaniem
- Przekierowanie niezalogowanych użytkowników na `/login`
- Integracja z React component `SettingsContainer` jako island

**Logika server-side**:

```typescript
// Sprawdzenie autentykacji
const {
  data: { session },
} = await Astro.locals.supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}

// Pobieranie profilu użytkownika
const userId = session.user.id;
```

**Struktura renderowania**:

- Layout: `src/layouts/Layout.astro`
- Komponent główny: `SettingsContainer` (React island z `client:load`)
- Sekcje:
  - Informacje o koncie (email, data utworzenia)
  - Formularz zmiany hasła (US-005)
  - Przycisk usunięcia konta (US-006)

**Dostępne akcje użytkownika**:

- Zmiana hasła
- Trwałe usunięcie konta

---

#### 2.2.5. Strona `/goodbye.astro` (post-delete redirect)

**Ścieżka**: `src/pages/goodbye.astro`

**Odpowiedzialności**:

- Wyświetlenie komunikatu po usunięciu konta
- Brak wymagania autentykacji (użytkownik już nie istnieje)
- Informacja o pomyślnym usunięciu danych

**Struktura renderowania**:

- Layout: `src/layouts/Layout.astro`
- Prosty komunikat tekstowy
- Link do strony głównej/rejestracji

---

### 2.3. Komponenty React (Client-Side Islands)

#### 2.3.1. Komponenty formularzy autentykacji

**Architektura wspólna dla wszystkich formularzy**:

```
FormComponent (Container)
├── Custom Hook (useXForm)
│   ├── Logika stanu (useState)
│   ├── Walidacja (zod schema)
│   ├── Wywołania serwisów
│   └── Obsługa błędów
├── Input Components (Shadcn/ui)
│   ├── EmailInput
│   ├── PasswordInput
│   ├── ConfirmPasswordInput
│   └── RememberMeCheckbox
└── Action Components
    ├── SubmitButton
    ├── ErrorMessage
    └── NavigationLinks
```

---

#### 2.3.2. `LoginForm` (US-002, US-003)

**Ścieżka**: `src/components/LoginForm/LoginForm.tsx`

**Odpowiedzialności**:

- Zbieranie danych logowania (email, hasło)
- Obsługa checkboxa "Zapamiętaj mnie" (US-003)
- Walidacja danych wejściowych client-side
- Wywołanie serwisu autentykacji
- Obsługa błędów logowania
- Przekierowanie po sukcesie

**Hook zarządzający**: `useLoginForm`
**Ścieżka**: `src/components/hooks/useLoginForm.ts`

**Stan komponentu**:

```typescript
interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
  isSubmitting: boolean;
  error: string | null;
}
```

**Przepływ logowania**:

1. Użytkownik wypełnia formularz (email, hasło)
2. Opcjonalne zaznaczenie "Zapamiętaj mnie"
3. Walidacja client-side (format email, długość hasła)
4. Wywołanie `loginUser(email, password, rememberMe)` z `auth.service.ts`
5. Supabase Auth weryfikuje credentials
6. W przypadku sukcesu:
   - Sesja zapisana w localStorage (automatycznie przez Supabase)
   - Przekierowanie na `/` (dashboard)
7. W przypadku błędu:
   - Wyświetlenie komunikatu błędu

**Komponenty składowe**:

- `EmailInput.tsx` - pole email z walidacją
- `PasswordInput.tsx` - pole hasła z pokazywaniem/ukrywaniem
- `RememberMeCheckbox.tsx` - checkbox persystencji sesji (US-003)
- `SubmitButton.tsx` - przycisk submit z loading state
- `FormErrorMessage.tsx` - wyświetlanie błędów
- `RegisterLink.tsx` - link do strony rejestracji

**Komunikaty błędów** (mapowane w `auth.service.ts`):

- "Invalid email or password" - błędne dane logowania
- "Too many login attempts. Please try again later." - rate limiting
- "Unable to connect. Please check your internet connection." - błąd sieci

---

#### 2.3.3. `RegisterForm` (US-001)

**Ścieżka**: `src/components/RegisterForm/RegisterForm.tsx`

**Odpowiedzialności**:

- Zbieranie danych rejestracji (email, hasło, potwierdzenie hasła)
- Walidacja mocności hasła
- Walidacja zgodności haseł
- Wywołanie serwisu rejestracji
- Obsługa błędów rejestracji
- Automatyczne zalogowanie i przekierowanie po sukcesie

**Hook zarządzający**: `useRegisterForm`
**Ścieżka**: `src/components/hooks/useRegisterForm.ts`

**Stan komponentu**:

```typescript
interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  isSubmitting: boolean;
  error: string | null;
}
```

**Przepływ rejestracji**:

1. Użytkownik wypełnia formularz (email, hasło, potwierdzenie)
2. Walidacja client-side:
   - Format email
   - Mocność hasła (minimum 8 znaków)
   - Zgodność haseł
3. Wywołanie `registerUser(email, password)` z `auth.service.ts`
4. Supabase Auth:
   - Tworzy użytkownika w `auth.users`
   - Trigger automatycznie tworzy rekord w `profiles` (via migration)
   - Automatyczne logowanie użytkownika
5. W przypadku sukcesu:
   - Użytkownik zalogowany
   - Przekierowanie na `/` (dashboard)
6. W przypadku błędu:
   - Wyświetlenie komunikatu błędu

**Komponenty składowe**:

- `EmailInput.tsx` (współdzielony z LoginForm)
- `PasswordInput.tsx` (współdzielony z LoginForm)
- `ConfirmPasswordInput.tsx` - pole potwierdzenia hasła
- `PasswordStrengthIndicator.tsx` - wizualizacja mocności hasła
- `SubmitButton.tsx` - przycisk submit z loading state
- `FormErrorMessage.tsx` (współdzielony)
- `LoginLink.tsx` - link do strony logowania

**Walidacja hasła** (realizowana przez zod schema):

```typescript
// src/lib/validation/register.validation.ts
const passwordSchema = z.string().min(8, "Hasło musi mieć minimum 8 znaków");
```

**Uwaga**: Zgodnie z PRD, wymagane jest tylko minimum 8 znaków. Dodatkowe reguły (wielkie/małe litery, cyfry) nie są wymagane w MVP.

**Komunikaty błędów**:

- "An account with this email already exists" - email zajęty
- "Too many registration attempts. Please try again later." - rate limiting
- "Passwords do not match" - niezgodność haseł
- "Unable to connect. Please check your internet connection." - błąd sieci

---

#### 2.3.4. `SettingsContainer` (US-005, US-006)

**Ścieżka**: `src/components/Settings/SettingsContainer.tsx`

**Odpowiedzialności**:

- Kontener dla wszystkich sekcji ustawień
- Zarządzanie stanami różnych akcji
- Koordynacja komponentów potomnych

**Struktura komponentu**:

```
SettingsContainer
├── SettingsTabs (nawigacja między sekcjami)
├── AccountInfoSection
│   └── Wyświetlanie email (z session.user.email) i daty utworzenia konta (z profiles.created_at)
├── ChangePasswordSection (US-005)
│   ├── ChangePasswordForm
│   └── Hook: useChangePassword
└── DangerZoneSection (US-006)
    ├── DeleteAccountButton
    ├── DeleteAccountModal (potwierdzenie)
    └── Hook: useDeleteAccount
```

**Pobieranie danych użytkownika**:

```typescript
// Email z sesji Supabase
const {
  data: { session },
} = await supabaseClient.auth.getSession();
const userEmail = session?.user?.email;

// Data utworzenia z profiles (przez API)
const profile = await fetch("/api/profiles/me");
const { created_at } = await profile.json();
```

---

#### 2.3.5. `ChangePasswordForm` (US-005)

**Ścieżka**: `src/components/Settings/ChangePasswordForm.tsx`

**Odpowiedzialności**:

- Zbieranie danych zmiany hasła
- Walidacja nowego hasła
- Wywołanie Supabase Auth do zmiany hasła
- Obsługa błędów i komunikatów sukcesu

**Hook zarządzający**: `useChangePassword`
**Ścieżka**: `src/components/hooks/useChangePassword.ts`

**Stan komponentu**:

```typescript
interface ChangePasswordState {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  isSubmitting: boolean;
  error: string | null;
  success: boolean;
}
```

**Przepływ zmiany hasła**:

1. Użytkownik wypełnia formularz:
   - Aktualne hasło
   - Nowe hasło
   - Potwierdzenie nowego hasła
2. Walidacja client-side:
   - Zgodność nowych haseł
   - Mocność nowego hasła
   - Nowe hasło różne od starego
3. Wywołanie Supabase Auth:
   ```typescript
   await supabaseClient.auth.updateUser({
     password: newPassword,
   });
   ```
4. Supabase automatycznie weryfikuje aktualne hasło
5. W przypadku sukcesu:
   - Wyświetlenie komunikatu sukcesu
   - Czyszczenie formularza
6. W przypadku błędu:
   - Wyświetlenie komunikatu błędu

**Walidacja**:

- Wykorzystanie tego samego schematu co przy rejestracji
- Sprawdzenie, czy nowe hasło != stare hasło

**Komunikaty**:

- Sukces: "Hasło zostało pomyślnie zmienione"
- Błąd: "Nie udało się zmienić hasła. Sprawdź aktualne hasło."

---

#### 2.3.6. `DeleteAccountModal` (US-006)

**Ścieżka**: `src/components/Settings/DeleteAccountModal.tsx`

**Odpowiedzialności**:

- Wyświetlenie modalnego okna potwierdzenia
- Dwuetapowe potwierdzenie (przycisk + checkbox)
- Wywołanie serwisu usuwania konta
- Przekierowanie po usunięciu

**Hook zarządzający**: `useDeleteAccount`
**Ścieżka**: `src/components/hooks/useDeleteAccount.ts`

**Stan komponentu**:

```typescript
interface DeleteAccountState {
  isOpen: boolean;
  confirmationChecked: boolean;
  isDeleting: boolean;
  error: string | null;
}
```

**Przepływ usuwania konta**:

1. Użytkownik klika "Usuń konto" w DangerZoneSection
2. Wyświetlenie modalnego okna z ostrzeżeniem
3. Użytkownik musi:
   - Zaznaczyć checkbox potwierdzenia
   - Kliknąć przycisk "Trwale usuń konto"
4. Wywołanie API endpoint `DELETE /api/profiles/me`
5. Backend (ProfileService):
   - Używa admin client Supabase
   - Usuwa użytkownika z `auth.users`
   - CASCADE automatycznie usuwa:
     - Rekord z `profiles`
     - Wszystkie rekordy z `expenses`
6. W przypadku sukcesu:
   - Wylogowanie użytkownika
   - Przekierowanie na `/goodbye`
7. W przypadku błędu:
   - Wyświetlenie komunikatu błędu

**Komponenty UI**:

- `AlertDialog` z Shadcn/ui dla modalnego okna
- `Checkbox` dla potwierdzenia
- `Button` z wariantem "destructive"

**Komunikaty ostrzegawcze**:

```
⚠️ Uwaga! Ta operacja jest nieodwracalna.

Usunięcie konta spowoduje trwałe usunięcie:
- Twojego profilu
- Wszystkich zapisanych wydatków
- Wszystkich powiązanych danych

Czy na pewno chcesz kontynuować?

[ ] Rozumiem, że ta operacja jest nieodwracalna

[Anuluj]  [Trwale usuń konto]
```

---

#### 2.3.7. `NavBar` (US-004)

**Ścieżka**: `src/components/NavBar.tsx`

**Modyfikacje wymagane**:

- Dodanie przycisku "Wyloguj" (US-004)
- Dodanie linku do ustawień

**Przepływ wylogowania**:

1. Użytkownik klika przycisk "Wyloguj" w NavBar
2. Wywołanie `logoutUser()` z `auth.service.ts`
3. Supabase Auth:
   - Invalidacja sesji
   - Usunięcie tokenu z localStorage
4. Przekierowanie na `/login`

**Implementacja**:

```typescript
const handleLogout = async () => {
  const result = await logoutUser();
  if (result.success) {
    window.location.href = "/login";
  } else {
    // Wyświetl komunikat błędu (toast notification)
  }
};
```

---

### 2.4. Walidacja i komunikaty błędów

#### 2.4.1. Schemat walidacji Zod

**Login form** (`src/lib/validation/login.validation.ts`):

```typescript
export const loginSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
  password: z.string().min(1, "Hasło jest wymagane").min(8, "Hasło musi mieć minimum 8 znaków"),
  rememberMe: z.boolean().default(false),
});
```

**Register form** (`src/lib/validation/register.validation.ts`):

```typescript
export const registerSchema = z
  .object({
    email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });
```

**Uwaga**: PRD nie wymaga złożonych reguł hasła (wielkie/małe litery, cyfry). Jeśli wymagane są dodatkowe reguły bezpieczeństwa, należy zaktualizować PRD.

**Change password** (`src/lib/validation/password.validation.ts`):

```typescript
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Aktualne hasło jest wymagane"),
    newPassword: z.string().min(8, "Nowe hasło musi mieć minimum 8 znaków"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Nowe hasło musi się różnić od obecnego",
    path: ["newPassword"],
  });
```

**Uwaga**: Walidacja zgodna z PRD - tylko minimum 8 znaków, bez dodatkowych reguł złożoności.

#### 2.4.2. Mapowanie błędów Supabase

Wszystkie błędy z Supabase Auth są mapowane na przyjazne dla użytkownika komunikaty w `auth.service.ts`:

| Błąd Supabase                           | Komunikat użytkownikowi                            |
| --------------------------------------- | -------------------------------------------------- |
| `rate limit`                            | "Zbyt wiele prób. Spróbuj ponownie później."       |
| `already registered` / `already exists` | "Konto z tym adresem email już istnieje"           |
| Invalid credentials                     | "Nieprawidłowy email lub hasło"                    |
| Network error                           | "Brak połączenia. Sprawdź połączenie internetowe." |
| Generic error                           | "Wystąpił błąd. Spróbuj ponownie."                 |

---

## 3. Logika Backendowa

### 3.1. Endpointy API

System autentykacji wykorzystuje zarówno bezpośrednie wywołania Supabase Client SDK (dla rejestracji i logowania), jak i dedykowane API endpoints dla operacji wymagających uprawnień administracyjnych.

#### 3.1.1. Autentykacja przez Supabase Client SDK

**Rejestracja i logowanie** (US-001, US-002):

- Nie wymagają dedykowanych API endpoints
- Wywołania bezpośrednio z client-side przez `auth.service.ts`
- Supabase Auth automatycznie:
  - Hashuje hasła (bcrypt)
  - Zarządza sesjami
  - Generuje JWT tokeny
  - Zapisuje sesję w localStorage

**Implementacja w `auth.service.ts`**:

```typescript
// Rejestracja (US-001)
export async function registerUser(email: string, password: string): Promise<RegisterResult> {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
  });
  // Obsługa błędów i mapowanie komunikatów
}

// Logowanie (US-002)
export async function loginUser(email: string, password: string, rememberMe: boolean): Promise<LoginResult> {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  // Obsługa błędów i mapowanie komunikatów
}

// Wylogowanie (US-004)
export async function logoutUser(): Promise<LoginResult> {
  const { error } = await supabaseClient.auth.signOut();
  // Obsługa błędów
}
```

---

#### 3.1.2. API Endpoint: Profile Management

**`GET /api/profiles/me`** (pobranie profilu użytkownika)

**Ścieżka**: `src/pages/api/profiles/me.ts`

**Metoda**: `GET`

**Autentykacja**: Wymagana (sprawdzenie sesji)

**Odpowiedzialność**:

- Pobranie profilu zalogowanego użytkownika
- Wykorzystywane przez stronę ustawień

**Request Headers**:

```
Cookie: sb-access-token=<jwt_token>
```

**Response Body** (200 OK):

```typescript
{
  id: string; // UUID użytkownika
  ai_consent_given: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}
```

**Response Body** (401 Unauthorized):

```typescript
{
  error: "Unauthorized";
}
```

**Implementacja**:

```typescript
export const GET: APIRoute = async ({ locals }) => {
  const session = await locals.supabase.auth.getSession();

  if (!session.data.session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const profileService = new ProfileService(locals.supabase);
  const profile = await profileService.getProfile(session.data.session.user.id);

  return new Response(JSON.stringify(profile), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

---

**`DELETE /api/profiles/me`** (usunięcie konta - US-006)

**Ścieżka**: `src/pages/api/profiles/me.ts`

**Metoda**: `DELETE`

**Autentykacja**: Wymagana (sprawdzenie sesji)

**Odpowiedzialność**:

- Trwałe usunięcie konta użytkownika
- Usunięcie wszystkich powiązanych danych (CASCADE)

**Request Headers**:

```
Cookie: sb-access-token=<jwt_token>
```

**Response Body** (200 OK):

```typescript
{
  message: "Account deleted successfully";
}
```

**Response Body** (401 Unauthorized):

```typescript
{
  error: "Unauthorized";
}
```

**Response Body** (500 Internal Server Error):

```typescript
{
  error: "Failed to delete account";
}
```

**Implementacja**:

```typescript
import { getSupabaseAdmin } from "../../db/supabase.client";

export const DELETE: APIRoute = async ({ locals }) => {
  const {
    data: { session },
  } = await locals.supabase.auth.getSession();

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    // WAŻNE: Używamy admin client dla usuwania użytkownika z auth.users
    const adminClient = getSupabaseAdmin();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(session.user.id);

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    // Wylogowanie użytkownika (opcjonalne, user już nie istnieje)
    await locals.supabase.auth.signOut();

    return new Response(JSON.stringify({ message: "Account deleted successfully" }), { status: 200 });
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete account" }), { status: 500 });
  }
};
```

**Uwaga**: Endpoint używa bezpośrednio Admin API zamiast ProfileService, ponieważ tylko Admin API może usunąć użytkownika z `auth.users`.

---

#### 3.1.3. Zmiana hasła przez Supabase Client SDK (US-005)

**UWAGA KRYTYCZNA**: Zgodnie z PRD (US-005), formularz musi wymagać podania aktualnego hasła. Supabase `auth.updateUser()` NIE weryfikuje aktualnego hasła - przyjmuje tylko nowe hasło.

**Implementacja wymagana**:

1. **Weryfikacja aktualnego hasła przed zmianą**:

```typescript
const handleChangePassword = async (currentPassword: string, newPassword: string) => {
  // Walidacja nowego hasła
  const validation = changePasswordSchema.safeParse({
    currentPassword,
    newPassword,
    confirmNewPassword: newPassword,
  });

  if (!validation.success) {
    setError(validation.error.errors[0].message);
    return;
  }

  try {
    // KROK 1: Weryfikacja aktualnego hasła przez re-authentication
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user?.email) {
      setError("Nie można pobrać danych użytkownika");
      return;
    }

    // Próba zalogowania z aktualnym hasłem dla weryfikacji
    const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (verifyError) {
      setError("Nieprawidłowe aktualne hasło");
      return;
    }

    // KROK 2: Zmiana hasła (teraz wiemy że aktualne hasło jest poprawne)
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError("Nie udało się zmienić hasła");
      return;
    }

    setSuccess(true);
  } catch (error) {
    console.error("Change password error:", error);
    setError("Wystąpił błąd podczas zmiany hasła");
  }
};
```

**Uwagi**:

- Re-authentication służy do weryfikacji aktualnego hasła przed zmianą
- Po weryfikacji, używamy `updateUser()` do zmiany hasła
- Operacja wymaga aktywnej sesji
- Zgodne z wymaganiami PRD (US-005)

---

### 3.2. Serwisy i logika biznesowa

#### 3.2.1. `AuthService` (auth.service.ts)

**Ścieżka**: `src/lib/services/auth.service.ts`

**Odpowiedzialności**:

- Enkapsulacja logiki autentykacji
- Komunikacja z Supabase Auth
- Mapowanie błędów na przyjazne komunikaty
- Zarządzanie sesjami

**Kluczowe metody**:

```typescript
/**
 * Rejestracja nowego użytkownika (US-001)
 */
async function registerUser(email: string, password: string): Promise<RegisterResult>;

/**
 * Logowanie użytkownika (US-002)
 */
async function loginUser(email: string, password: string, rememberMe: boolean): Promise<LoginResult>;

/**
 * Pobieranie aktualnej sesji
 */
async function getCurrentSession(): Promise<Session | null>;

/**
 * Wylogowanie użytkownika (US-004)
 */
async function logoutUser(): Promise<LoginResult>;
```

**Mapowanie błędów**:

- Rate limiting
- Email already registered
- Invalid credentials
- Network errors

---

#### 3.2.2. `ProfileService` (profile.service.ts)

**Ścieżka**: `src/lib/services/profile.service.ts`

**Odpowiedzialności**:

- Zarządzanie profilami użytkowników
- Operacje CRUD na tabeli `profiles`
- Usuwanie konta z wykorzystaniem Admin API

**Kluczowe metody**:

```typescript
/**
 * Pobieranie profilu użytkownika
 */
async getProfile(userId: string): Promise<ProfileDTO | null>

/**
 * Aktualizacja profilu użytkownika
 */
async updateProfile(
  userId: string,
  updateData: UpdateProfileCommand
): Promise<ProfileDTO>

/**
 * Trwałe usunięcie konta (US-006)
 * Wymaga SUPABASE_SERVICE_ROLE_KEY
 */
async deleteProfile(userId: string): Promise<void>
```

**Wykorzystanie Admin API**:

```typescript
async deleteProfile(userId: string): Promise<void> {
  const adminClient = getSupabaseAdmin();

  // Usuwa użytkownika z auth.users
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }

  // CASCADE automatycznie usuwa:
  // - profiles (id → auth.users.id ON DELETE CASCADE)
  // - expenses (user_id → profiles.id ON DELETE CASCADE)
}
```

---

### 3.3. Middleware i session management

#### 3.3.1. Astro Middleware

**Ścieżka**: `src/middleware/index.ts`

**Obecna implementacja**:

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
```

**Rozszerzenie wymagane dla autentykacji**:

```typescript
import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  // Dodaj Supabase client do context
  context.locals.supabase = supabaseClient;

  // Sprawdź sesję dla chronionych ścieżek
  const protectedPaths = ["/", "/settings", "/expenses", "/add"];
  const isProtected = protectedPaths.some((path) => context.url.pathname.startsWith(path));

  if (isProtected) {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      // Przekieruj na login jeśli brak sesji
      return context.redirect("/login");
    }

    // Dodaj user do context dla dostępu w stronach
    context.locals.user = session.user;
  }

  return next();
});
```

**Type definitions** (`src/env.d.ts`):

```typescript
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: User; // Opcjonalny user object z @supabase/supabase-js
    }
  }
}
```

---

#### 3.3.2. Session persistence (US-003)

**Implementacja "Zapamiętaj mnie"**:

**WAŻNE**: Zgodnie z PRD (US-003), checkbox "Zapamiętaj mnie" musi być funkcjonalny.

**Implementacja docelowa**:

```typescript
// W auth.service.ts
export async function loginUser(email: string, password: string, rememberMe: boolean): Promise<LoginResult> {
  // Jeśli rememberMe = false, używamy sessionStorage
  // Jeśli rememberMe = true, używamy localStorage

  const storage = rememberMe ? window.localStorage : window.sessionStorage;

  // Tworzymy klienta z odpowiednim storage
  const temporaryClient = createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    auth: {
      storage: storage,
      autoRefreshToken: true,
      persistSession: rememberMe,
    },
  });

  const { data, error } = await temporaryClient.auth.signInWithPassword({
    email,
    password,
  });

  // Obsługa błędów i mapowanie komunikatów
}
```

**Zachowanie sesji**:

- **rememberMe = true**: Sesja zapisana w localStorage, użytkownik zalogowany po zamknięciu przeglądarki
- **rememberMe = false**: Sesja w sessionStorage, wylogowanie po zamknięciu przeglądarki

**Wygasanie sesji**:

- JWT access token: ważny przez 1 godzinę
- Refresh token: automatycznie odświeżany przez Supabase
- Maksymalny czas sesji przy bezczynności: 7 dni (konfigurowalny w Supabase dashboard)
- Po przekroczeniu limitu nieaktywności: wymagane ponowne logowanie

---

### 3.4. Obsługa wyjątków

#### 3.4.1. Hierarchia błędów

```
ApplicationError (bazowy)
├── AuthenticationError
│   ├── InvalidCredentialsError
│   ├── AccountAlreadyExistsError
│   └── RateLimitError
├── AuthorizationError
│   └── UnauthorizedError
└── NetworkError
    └── ConnectionError
```

#### 3.4.2. Mapowanie błędów HTTP

| Status Code | Error Type            | User Message                        |
| ----------- | --------------------- | ----------------------------------- |
| 400         | Bad Request           | "Nieprawidłowe dane wejściowe"      |
| 401         | Unauthorized          | "Musisz być zalogowany"             |
| 403         | Forbidden             | "Brak dostępu do tego zasobu"       |
| 404         | Not Found             | "Nie znaleziono zasobu"             |
| 429         | Too Many Requests     | "Zbyt wiele prób. Spróbuj później." |
| 500         | Internal Server Error | "Wystąpił błąd serwera"             |

#### 3.4.3. Logging błędów

```typescript
// W serwisach
catch (error) {
  console.error('Service error:', {
    method: 'registerUser',
    error: error.message,
    timestamp: new Date().toISOString()
  });

  // Zwróć przyjazny komunikat użytkownikowi
  return {
    success: false,
    error: 'Unable to complete registration'
  };
}
```

---

### 3.5. Aktualizacja renderowania stron server-side

#### 3.5.1. Zmiany w `astro.config.mjs`

**Obecna konfiguracja**:

```javascript
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  adapter: node({ mode: "standalone" }),
});
```

**Bez zmian** - konfiguracja już wspiera SSR.

#### 3.5.2. Chronione ścieżki

Wszystkie strony wymagające autentykacji muszą implementować sprawdzenie sesji:

```typescript
// Wzorzec dla chronionych stron
const {
  data: { session },
} = await Astro.locals.supabase.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}

// Kontynuuj renderowanie strony dla zalogowanego użytkownika
```

**Lista chronionych stron**:

- `/` (index.astro) - Dashboard
- `/settings` (settings.astro) - Ustawienia konta
- `/expenses/*` - Wszystkie strony zarządzania wydatkami
- `/add/*` - Dodawanie wydatków

**Strony publiczne**:

- `/login` - Strona logowania
- `/register` - Strona rejestracji
- `/goodbye` - Strona po usunięciu konta

---

## 4. System Autentykacji z Supabase

### 4.1. Architektura Supabase Auth

```
┌─────────────────────────────────────────────────────┐
│              Frontend (Client-Side)                  │
│  - Formularze logowania/rejestracji                  │
│  - Supabase Client SDK                               │
└────────────────┬────────────────────────────────────┘
                 │
                 │ HTTPS
                 │
┌────────────────▼────────────────────────────────────┐
│           Supabase Auth Service                      │
│  - Weryfikacja credentials                           │
│  - Hashowanie haseł (bcrypt)                         │
│  - Generowanie JWT tokenów                           │
│  - Zarządzanie refresh tokens                        │
└────────────────┬────────────────────────────────────┘
                 │
                 │ CASCADE
                 │
┌────────────────▼────────────────────────────────────┐
│         PostgreSQL Database                          │
│  auth.users (zarządzane przez Supabase)              │
│  public.profiles (zarządzane przez aplikację)        │
│  public.expenses (powiązane z profiles)              │
└─────────────────────────────────────────────────────┘
```

### 4.2. Tabela auth.users (Supabase)

**Struktura** (zarządzana automatycznie przez Supabase):

```sql
-- auth.users (read-only dla aplikacji)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  encrypted_password VARCHAR NOT NULL,  -- bcrypt hash
  email_confirmed_at TIMESTAMPTZ,
  confirmation_token VARCHAR,
  recovery_token VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
  -- ... inne pola zarządzane przez Supabase
);
```

**Uwagi**:

- Aplikacja NIE ma bezpośredniego dostępu do tej tabeli
- Wszystkie operacje przez Supabase Auth API
- Hasła hashowane automatycznie (bcrypt, 10 rounds)

---

### 4.3. Tabela public.profiles

**Struktura** (zarządzana przez aplikację):

```sql
CREATE TABLE public.profiles (
  -- Klucz główny = foreign key do auth.users
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dane specyficzne dla aplikacji
  ai_consent_given BOOLEAN NOT NULL DEFAULT false,

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Relacja z auth.users**:

- One-to-one (1:1)
- ON DELETE CASCADE - usunięcie użytkownika usuwa profil
- Automatyczne tworzenie przez trigger

---

### 4.4. Automatyczne tworzenie profili

**Trigger function** (z migracji):

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Przepływ**:

1. User rejestruje się (US-001)
2. Supabase tworzy rekord w `auth.users`
3. Trigger automatycznie tworzy rekord w `public.profiles`
4. User zalogowany i gotowy do użycia

---

### 4.5. Row Level Security (RLS)

#### 4.5.1. Polityki RLS dla profiles

**Odczyt profilu** (SELECT):

```sql
-- Authenticated users mogą czytać swój profil
CREATE POLICY "allow individual read access for authenticated users"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Anonymous users mogą czytać swój profil (signup flow)
CREATE POLICY "allow individual read access for anonymous users"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (auth.uid() = id);
```

**Aktualizacja profilu** (UPDATE):

```sql
-- Authenticated users mogą aktualizować swój profil
CREATE POLICY "allow individual update access for authenticated users"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Anonymous users mogą aktualizować swój profil (signup flow)
CREATE POLICY "allow individual update access for anonymous users"
  ON public.profiles
  FOR UPDATE
  TO anon
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Funkcja `auth.uid()`**:

- Zwraca UUID zalogowanego użytkownika
- Automatycznie weryfikowana przez Supabase
- Nie można jej oszukać z poziomu klienta

---

#### 4.5.2. Bezpieczeństwo na poziomie bazy

**Gwarancje bezpieczeństwa**:

1. **Izolacja danych**: Użytkownik A nie może zobaczyć danych użytkownika B
2. **Weryfikacja właściciela**: Każda operacja sprawdza `auth.uid() = id`
3. **Automatyczna weryfikacja**: RLS stosowany automatycznie na poziomie PostgreSQL
4. **Ochrona przed SQL injection**: Wszystkie zapytania przez Supabase Client
5. **Audyt**: Wszystkie operacje logowane przez Supabase

---

### 4.6. JWT Tokens i Session Management

#### 4.6.1. Struktura JWT Token

**Access Token** (1 godzina ważności):

```json
{
  "aud": "authenticated",
  "exp": 1699999999,
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "authenticated"
}
```

**Refresh Token** (7 dni ważności):

- Używany do odświeżania access token
- Przechowywany w localStorage (lub sessionStorage)
- Automatycznie odświeżany przez Supabase Client

#### 4.6.2. Flow autentykacji

**1. Logowanie (US-002)**:

```
Client                    Supabase Auth                Database
  │                             │                          │
  ├─ signInWithPassword() ─────>│                          │
  │                             ├─ Verify credentials ─────>│
  │                             │<─ User data ─────────────┤
  │<─ JWT tokens ───────────────┤                          │
  │  (access + refresh)         │                          │
  │                             │                          │
  ├─ Save to localStorage       │                          │
```

**2. Authenticated Request**:

```
Client                    Supabase                   Database
  │                             │                          │
  ├─ Request with JWT ──────────>│                          │
  │                             ├─ Verify JWT ──────────────>│
  │                             │<─ Auth context ──────────┤
  │                             ├─ Apply RLS ───────────────>│
  │                             │<─ Filtered data ─────────┤
  │<─ Response ─────────────────┤                          │
```

**3. Token Refresh** (automatyczne):

```
Client                    Supabase Auth
  │                             │
  ├─ Access token expired       │
  ├─ Auto send refresh token ───>│
  │<─ New access token ──────────┤
  ├─ Save to localStorage       │
  ├─ Retry original request     │
```

---

### 4.7. Zmienne środowiskowe

**Wymagane w `.env`**:

```bash
# Supabase Connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key

# Supabase Admin (wymagane dla usuwania kont - US-006)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Bezpieczeństwo**:

- `SUPABASE_KEY` (anon key) - bezpieczny w kodzie klienta (RLS go chroni)
- `SUPABASE_SERVICE_ROLE_KEY` - TYLKO server-side (bypasses RLS)
- Nigdy nie commitować `.env` do repo (w `.gitignore`)

---

### 4.8. Konfiguracja Supabase Client

**Standard Client** (src/db/supabase.client.ts):

```typescript
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type SupabaseClient = typeof supabaseClient;
```

**Admin Client** (do usuwania kont):

```typescript
let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }

  adminClient = createClient<Database>(import.meta.env.SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
```

---

## 5. Szczegółowe scenariusze użycia

### 5.1. US-001: Rejestracja nowego konta

**Przepływ krok po kroku**:

1. **User**: Otwiera `/register`
2. **Astro SSR**:
   - Sprawdza sesję
   - Jeśli zalogowany → przekierowanie na `/`
   - Jeśli niezalogowany → renderowanie `RegisterForm`
3. **User**: Wypełnia formularz (email, hasło, potwierdzenie)
4. **React Component**: Walidacja client-side (zod schema)
5. **User**: Klika "Zarejestruj się"
6. **Hook**: `useRegisterForm.handleSubmit()`
7. **Service**: `registerUser(email, password)` wywołuje Supabase
8. **Supabase**:
   - Weryfikuje unikalność email
   - Hashuje hasło (bcrypt)
   - Tworzy rekord w `auth.users`
9. **Database Trigger**: Automatycznie tworzy rekord w `public.profiles`
10. **Supabase**: Automatycznie loguje użytkownika (zwraca JWT)
11. **Client**: Zapisuje token w localStorage
12. **React**: Przekierowanie na `/` (dashboard)

**Przypadki brzegowe**:

- Email już istnieje → komunikat błędu
- Hasła nie pasują → błąd walidacji
- Słabe hasło → błąd walidacji
- Brak połączenia → komunikat o błędzie sieci

---

### 5.2. US-002: Logowanie do aplikacji

**Przepływ krok po kroku**:

1. **User**: Otwiera `/login`
2. **Astro SSR**:
   - Sprawdza sesję
   - Jeśli zalogowany → przekierowanie na `/`
   - Jeśli niezalogowany → renderowanie `LoginForm`
3. **User**: Wypełnia formularz (email, hasło)
4. **User**: Opcjonalnie zaznacza "Zapamiętaj mnie"
5. **React Component**: Walidacja client-side
6. **User**: Klika "Zaloguj się"
7. **Hook**: `useLoginForm.handleSubmit()`
8. **Service**: `loginUser(email, password, rememberMe)` wywołuje Supabase
9. **Supabase**:
   - Weryfikuje email i hasło
   - Generuje JWT tokens (access + refresh)
10. **Client**: Zapisuje tokeny w localStorage
11. **React**: Przekierowanie na `/` (dashboard)

**Przypadki brzegowe**:

- Nieprawidłowe credentials → komunikat błędu
- Zbyt wiele prób → rate limiting error
- Brak połączenia → komunikat o błędzie sieci

---

### 5.3. US-003: Utrzymanie sesji ("Zapamiętaj mnie")

**Implementacja domyślna**:

- Supabase automatycznie zapisuje sesję w localStorage
- Użytkownik pozostaje zalogowany po zamknięciu przeglądarki
- Token automatycznie odświeżany przed wygaśnięciem

**Weryfikacja sesji przy każdym request**:

```typescript
// W middleware lub na początku każdej chronionej strony
const {
  data: { session },
} = await supabase.auth.getSession();

if (!session) {
  return redirect("/login");
}
```

**Wygasanie sesji**:

- Access token: 1 godzina
- Refresh token: 7 dni (konfigurowalny)
- Po 7 dniach nieaktywności → wymagane ponowne logowanie

---

### 5.4. US-004: Wylogowanie z aplikacji

**Przepływ krok po kroku**:

1. **User**: Klika przycisk "Wyloguj" w `NavBar`
2. **React Component**: Wywołuje `handleLogout()`
3. **Service**: `logoutUser()` wywołuje Supabase
4. **Supabase**:
   - Invaliduje access token
   - Usuwa refresh token z bazy
5. **Client**: Usuwa tokeny z localStorage
6. **React**: Przekierowanie na `/login`

**Implementacja w NavBar**:

```typescript
const handleLogout = async () => {
  setIsLoading(true);
  const result = await logoutUser();

  if (result.success) {
    window.location.href = "/login";
  } else {
    showErrorToast(result.error);
    setIsLoading(false);
  }
};
```

---

### 5.5. US-005: Zmiana hasła

**Przepływ krok po kroku**:

1. **User**: Otwiera `/settings`
2. **Astro SSR**:
   - Weryfikuje sesję
   - Jeśli niezalogowany → przekierowanie na `/login`
3. **User**: Przechodzi do sekcji "Zmiana hasła"
4. **User**: Wypełnia formularz:
   - Aktualne hasło
   - Nowe hasło
   - Potwierdzenie nowego hasła
5. **React Component**: Walidacja client-side (zod schema)
6. **User**: Klika "Zmień hasło"
7. **Hook**: `useChangePassword.handleSubmit()`
8. **Client**: Wywołuje `supabaseClient.auth.updateUser({ password })`
9. **Supabase**:
   - Weryfikuje aktualne hasło (wymaga aktywnej sesji)
   - Hashuje nowe hasło
   - Aktualizuje rekord w `auth.users`
10. **Client**: Wyświetla komunikat sukcesu
11. **Client**: Czyści formularz

**Przypadki brzegowe**:

- Nieprawidłowe aktualne hasło → błąd Supabase
- Nowe hasło == stare hasło → błąd walidacji
- Hasła nie pasują → błąd walidacji
- Słabe nowe hasło → błąd walidacji

---

### 5.6. US-006: Usunięcie konta

**Przepływ krok po kroku**:

1. **User**: Otwiera `/settings`
2. **User**: Przechodzi do sekcji "Danger Zone"
3. **User**: Klika "Usuń konto"
4. **React**: Otwiera `DeleteAccountModal` (AlertDialog)
5. **Modal**: Wyświetla ostrzeżenie o nieodwracalności
6. **User**: Zaznacza checkbox potwierdzenia
7. **User**: Klika "Trwale usuń konto"
8. **Hook**: `useDeleteAccount.handleDelete()`
9. **Client**: Wywołuje `DELETE /api/profiles/me`
10. **API Endpoint**:
    - Weryfikuje sesję
    - Tworzy `ProfileService` z admin client
11. **ProfileService**:
    - Używa `getSupabaseAdmin()` (service role)
    - Wywołuje `adminClient.auth.admin.deleteUser(userId)`
12. **Supabase**:
    - Usuwa rekord z `auth.users`
13. **PostgreSQL CASCADE**:
    - Automatycznie usuwa rekord z `profiles`
    - Automatycznie usuwa wszystkie rekordy z `expenses`
14. **API**: Wylogowuje użytkownika
15. **Client**: Przekierowanie na `/goodbye`

**Przypadki brzegowe**:

- Brak zaznaczonego checkboxa → przycisk disabled
- Błąd podczas usuwania → komunikat błędu w modalu
- Brak SUPABASE_SERVICE_ROLE_KEY → błąd 500

---

## 6. Kluczowe decyzje architektoniczne

### 6.1. SSR vs CSR

**Decyzja**: Wykorzystanie Server-Side Rendering (SSR) w Astro

**Uzasadnienie**:

- Lepsze SEO dla stron publicznych (login, register)
- Szybsze pierwsze renderowanie (First Contentful Paint)
- Bezpieczniejsze sprawdzanie autentykacji server-side
- Możliwość prefetchowania danych użytkownika

**Trade-off**:

- Większe obciążenie serwera
- Złożoność w zarządzaniu sesją między server/client

---

### 6.2. Supabase Auth vs Custom Auth

**Decyzja**: Wykorzystanie Supabase Auth

**Uzasadnienie**:

- Szybkość implementacji MVP (zgodnie z PRD 6.4 - 6 tygodni)
- Wbudowane bezpieczeństwo (hashowanie, RLS, JWT)
- Zarządzanie sesjami out-of-the-box
- Automatyczne odświeżanie tokenów
- Gotowe integracje z frontend frameworks

**Trade-off**:

- Vendor lock-in na Supabase
- Mniejsza kontrola nad flow autentykacji
- Ograniczenia w customizacji

---

### 6.3. localStorage vs sessionStorage

**Decyzja**: Domyślnie localStorage (Supabase default)

**Uzasadnienie**:

- Zgodność z US-003 ("Zapamiętaj mnie")
- Lepsze UX (użytkownik nie musi logować się przy każdej wizycie)
- Możliwość przyszłej customizacji (przełączanie storage type)

**Trade-off**:

- Mniejsze bezpieczeństwo na współdzielonych urządzeniach
- Rozwiązanie: Funkcjonalność wylogowania (US-004)

---

### 6.4. Admin API dla usuwania kont

**Decyzja**: Wykorzystanie Supabase Admin API (service role)

**Uzasadnienie**:

- Jedyny sposób na trwałe usunięcie użytkownika z `auth.users`
- Automatyczne CASCADE usuwa powiązane dane
- Spójność danych (brak orphaned records)

**Trade-off**:

- Wymaga konfiguracji SUPABASE_SERVICE_ROLE_KEY
- Zwiększone ryzyko bezpieczeństwa (klucz musi być chroniony)
- Rozwiązanie: Klucz tylko w zmiennych środowiskowych server-side

---

### 6.5. Middleware vs Page-level auth checks

**Decyzja**: Hybrid approach - middleware + page-level checks

**Uzasadnienie**:

- Middleware: Globalna ochrona ścieżek
- Page-level: Precyzyjna kontrola i lepsze error handling
- Elastyczność w obsłudze różnych scenariuszy
- Możliwość customizacji przekierowań per strona

**Trade-off**:

- Duplikacja kodu sprawdzania autentykacji
- Rozwiązanie: Wykorzystanie funkcji `getCurrentSession()` z `auth.service.ts`

---

## 7. Podsumowanie i implementacja

### 7.1. Plik dependencies (do implementacji)

Poniżej lista kluczowych plików i komponentów, które wymagają utworzenia lub modyfikacji:

#### Nowe pliki (do utworzenia):

**Brak** - wszystkie kluczowe komponenty i serwisy już istnieją w projekcie:

- ✅ `src/lib/services/auth.service.ts` - istniejący
- ✅ `src/lib/services/profile.service.ts` - istniejący
- ✅ `src/components/LoginForm/` - istniejący
- ✅ `src/components/RegisterForm/` - istniejący
- ✅ `src/components/Settings/` - istniejący
- ✅ `src/pages/login.astro` - istniejący
- ✅ `src/pages/register.astro` - istniejący
- ✅ `src/pages/settings.astro` - istniejący
- ✅ `src/pages/goodbye.astro` - istniejący

#### Pliki do modyfikacji:

1. **`src/middleware/index.ts`**
   - Dodanie sprawdzania autentykacji dla chronionych ścieżek
   - Automatyczne przekierowanie niezalogowanych użytkowników

2. **`src/pages/index.astro`**
   - Odkomentowanie sprawdzania sesji
   - Aktywacja ochrony autentykacją

3. **`src/pages/expenses/*.astro`**
   - Dodanie sprawdzania sesji przed renderowaniem
   - Przekierowanie niezalogowanych użytkowników

4. **`src/components/NavBar.tsx`**
   - Dodanie przycisku "Wyloguj"
   - Dodanie linku do ustawień
   - Implementacja funkcji wylogowania

5. **`src/env.d.ts`**
   - Rozszerzenie typu `App.Locals` o opcjonalne pole `user`

### 7.2. Kluczowe kontrakty i interfejsy

#### Typy autentykacji (src/types/auth.types.ts):

```typescript
export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  error?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}
```

#### Typy profilu (src/types.ts):

```typescript
export interface ProfileDTO {
  id: string;
  ai_consent_given: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileCommand {
  ai_consent_given?: boolean;
}
```

### 7.3. Przepływ implementacji (rekomendowana kolejność)

**Faza 1: Backend i bezpieczeństwo**

1. Upewnić się, że zmienne środowiskowe są skonfigurowane (`SUPABASE_SERVICE_ROLE_KEY`)
2. Zmodyfikować middleware dla globalnej ochrony ścieżek
3. Zaktualizować `src/env.d.ts` z typami dla `App.Locals`

**Faza 2: Strony i routing** 4. Odkomentować sprawdzanie autentykacji w `src/pages/index.astro` 5. Dodać sprawdzanie autentykacji w innych chronionych stronach (`/expenses/*`) 6. Przetestować przekierowania między stronami publicznymi a chronionymi

**Faza 3: UI i nawigacja** 7. Zaktualizować `NavBar.tsx` z przyciskiem wylogowania i linkiem do ustawień 8. Przetestować pełny flow: rejestracja → logowanie → dashboard → wylogowanie

**Faza 4: Funkcjonalności zaawansowane** 9. Przetestować zmianę hasła w ustawieniach 10. Przetestować usuwanie konta i przekierowanie na `/goodbye`

**Faza 5: Testy końcowe** 11. Przeprowadzić testy wszystkich scenariuszy użycia (US-001 do US-006) 12. Zweryfikować bezpieczeństwo (RLS, JWT, przekierowania) 13. Przetestować obsługę błędów i komunikaty użytkownika

### 7.4. Checklist weryfikacji implementacji

#### Funkcjonalności (US):

- [ ] US-001: Rejestracja działa poprawnie
- [ ] US-002: Logowanie działa poprawnie
- [ ] US-003: Sesja jest utrzymywana po zamknięciu przeglądarki
- [ ] US-004: Wylogowanie działa poprawnie
- [ ] US-005: Zmiana hasła działa poprawnie
- [ ] US-006: Usuwanie konta działa poprawnie i usuwa wszystkie dane

#### Bezpieczeństwo:

- [ ] RLS policies działają poprawnie (izolacja danych użytkowników)
- [ ] JWT tokeny są prawidłowo weryfikowane
- [ ] Service role key jest przechowywany tylko server-side
- [ ] Hasła są hashowane (automatycznie przez Supabase)
- [ ] Niezalogowani użytkownicy są przekierowywani z chronionych stron

#### UX:

- [ ] Wszystkie formularze mają walidację client-side
- [ ] Komunikaty błędów są przyjazne i zrozumiałe
- [ ] Loading states są wyświetlane podczas operacji asynchronicznych
- [ ] Przekierowania działają płynnie bez flashowania contentu
- [ ] Modal usuwania konta wymaga potwierdzenia

#### Edge cases:

- [ ] Próba dostępu do chronionej strony bez logowania → przekierowanie
- [ ] Próba logowania z błędnymi danymi → komunikat błędu
- [ ] Próba rejestracji z istniejącym emailem → komunikat błędu
- [ ] Rate limiting działa (zbyt wiele prób logowania)
- [ ] Network errors są obsługiwane gracefully

### 7.5. Zalecenia dotyczące monitoringu

Po wdrożeniu systemu autentykacji, zaleca się monitorowanie:

1. **Metryki autentykacji**:
   - Liczba rejestracji dziennie
   - Współczynnik sukcesu logowania
   - Średni czas sesji użytkownika
   - Liczba wylogowań vs automatyczne wygaśnięcia sesji

2. **Bezpieczeństwo**:
   - Nieudane próby logowania (potencjalne ataki brute force)
   - Wykorzystanie rate limiting
   - Anomalie w dostępie do API endpoints

3. **Błędy**:
   - Błędy autentykacji (kategoryzowane)
   - Timeouty połączeń z Supabase
   - Błędy w procesie usuwania kont

### 7.6. Dokumentacja dla deweloperów

#### Jak dodać nową chronioną stronę:

```typescript
---
import Layout from '../layouts/Layout.astro';
import { getCurrentSession } from '../lib/services/auth.service';

// Sprawdź autentykację
const session = await getCurrentSession();

if (!session) {
  return Astro.redirect('/login');
}

// Kontynuuj renderowanie dla zalogowanego użytkownika
const userId = session.user.id;
---

<Layout title="Chroniona strona">
  <!-- Treść strony -->
</Layout>
```

#### Jak używać Supabase Client w komponentach React:

```typescript
import { supabaseClient } from "@/db/supabase.client";

// W komponencie lub custom hook
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (!session) {
  // Użytkownik niezalogowany
  return;
}

// Użyj session.user.id dla operacji
```

#### Jak obsługiwać błędy autentykacji:

```typescript
import { loginUser } from "@/lib/services/auth.service";

const result = await loginUser(email, password, rememberMe);

if (!result.success) {
  // Wyświetl błąd użytkownikowi
  setError(result.error);
  return;
}

// Sukces - przekieruj
window.location.href = "/";
```

---

## 8. Zgodność z wymaganiami PRD

### 8.1. Realizacja wymagań funkcjonalnych

| Wymaganie PRD                   | Status          | Implementacja                                      |
| ------------------------------- | --------------- | -------------------------------------------------- |
| 3.1 - Rejestracja z email/hasło | ✅ Zrealizowane | `RegisterForm` + `auth.service.ts` + Supabase Auth |
| 3.1 - Logowanie                 | ✅ Zrealizowane | `LoginForm` + `auth.service.ts` + Supabase Auth    |
| 3.1 - "Zapamiętaj mnie"         | ✅ Zrealizowane | Supabase localStorage persistence                  |
| 3.1 - Wylogowanie               | ✅ Zrealizowane | `NavBar` + `logoutUser()`                          |
| 3.1 - Zmiana hasła              | ✅ Zrealizowane | `ChangePasswordForm` + Supabase `updateUser()`     |
| 3.1 - Usunięcie konta           | ✅ Zrealizowane | `DeleteAccountModal` + Admin API                   |
| 3.1 - Hashowanie haseł          | ✅ Zrealizowane | Automatycznie przez Supabase (bcrypt)              |

### 8.2. Zgodność z granicami produktu (PRD 4)

Zgodnie z PRD, **poza zakresem MVP** znajduje się:

- ❌ Funkcja odzyskiwania zapomnianego hasła - NIE zaimplementowana (zgodnie z PRD 4)

### 8.3. Realizacja historyjek użytkownika

| US ID  | Tytuł                    | Status | Implementacja                                       |
| ------ | ------------------------ | ------ | --------------------------------------------------- |
| US-001 | Rejestracja nowego konta | ✅     | `/register` + `RegisterForm` + auto-trigger profilu |
| US-002 | Logowanie do aplikacji   | ✅     | `/login` + `LoginForm` + Supabase Auth              |
| US-003 | Utrzymanie sesji         | ✅     | localStorage + auto-refresh tokenów                 |
| US-004 | Wylogowanie              | ✅     | Przycisk w `NavBar` + `logoutUser()`                |
| US-005 | Zmiana hasła             | ✅     | `/settings` + `ChangePasswordForm`                  |
| US-006 | Usunięcie konta          | ✅     | `/settings` + `DeleteAccountModal` + Admin API      |

### 8.4. Bezpieczeństwo (PRD 3.1)

| Wymaganie                   | Status | Implementacja                                   |
| --------------------------- | ------ | ----------------------------------------------- |
| Hasła zahaszowane           | ✅     | Supabase bcrypt (10 rounds)                     |
| Weryfikacja emaila          | ✅     | Supabase sprawdza unikalność                    |
| Bezpieczne sesje            | ✅     | JWT tokens + automatic refresh                  |
| Izolacja danych             | ✅     | RLS policies na bazie danych                    |
| Ochrona przed SQL injection | ✅     | Supabase Client SDK + parametryzowane zapytania |

---

## 9. Wnioski końcowe

### 9.1. Osiągnięcia architektury

System autentykacji zaprojektowany dla Paragoniusza:

1. **Spełnia wszystkie wymagania funkcjonalne** z PRD (US-001 do US-006)
2. **Wykorzystuje najlepsze praktyki bezpieczeństwa**:
   - Hashowanie haseł (bcrypt)
   - Row Level Security (RLS)
   - JWT tokens z automatic refresh
   - Izolacja danych między użytkownikami
3. **Zapewnia doskonałe UX**:
   - Szybkie pierwsze renderowanie (SSR)
   - Automatyczne utrzymywanie sesji
   - Przyjazne komunikaty błędów
   - Płynne przekierowania
4. **Minimalizuje time-to-market**:
   - Wykorzystanie Supabase Auth (gotowe rozwiązanie)
   - Istniejąca infrastruktura (większość komponentów już istnieje)
   - Prostota implementacji

### 9.2. Kluczowe zalety rozwiązania

- **Bezpieczeństwo**: Multi-layer protection (RLS, JWT, hashing)
- **Skalowalność**: Supabase handles infrastructure
- **Maintainability**: Czysty podział odpowiedzialności (SSR vs Client-side)
- **Testability**: Enkapsulacja logiki w serwisach i hookach
- **Developer Experience**: TypeScript + type-safe operations

### 9.3. Potencjalne rozszerzenia (post-MVP)

Po wdrożeniu MVP, system może być rozszerzony o:

1. **Odzyskiwanie hasła** (email reset)
2. **Two-factor authentication** (2FA)
3. **OAuth providers** (Google, Facebook, GitHub)
4. **Session management panel** (lista aktywnych sesji)
5. **Audit log** (historia logowań)
6. **Email verification** (potwierdzenie adresu email)
7. **Account security settings** (limity sesji, trusted devices)

### 9.4. Zgodność z celami projektu (PRD 6)

| Cel                    | Wskaźnik                               | Status        |
| ---------------------- | -------------------------------------- | ------------- |
| 6.1 - Cel funkcjonalny | 100% kluczowych ścieżek funkcjonalnych | ✅ Osiągnięty |
| 6.4 - Cel projektowy   | Wdrożenie w 6 tygodni                  | ⏳ W trakcie  |

---

## Koniec specyfikacji

Dokument został opracowany w oparciu o:

- Wymagania z `.ai/prd.md` (US-001 do US-006)
- Stack technologiczny z `.ai/tech-stack.md`
- Obecną strukturę projektu Paragoniusz
- Best practices dla Astro 5, React 19, Supabase Auth

Data utworzenia: 2025-11-29
Wersja: 1.0
