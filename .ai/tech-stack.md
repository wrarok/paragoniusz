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