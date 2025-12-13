# GitHub Workflows

Ten folder zawiera definicje GitHub Actions workflows dla projektu Paragoniusz.

## 📁 Struktura

```
.github/workflows/
├── master.yaml          # Main CI/CD pipeline
└── README.md           # Ten plik
```

## 🔄 Workflows

### `master.yaml` - Main CI/CD Pipeline

**Triggerowane przez:**
- Push do `master`/`main`
- Pull Request do `master`/`main`
- Manualne uruchomienie (workflow_dispatch)

**Jobs:**
1. 🔍 **Lint & Type Check** - Weryfikacja jakości kodu
2. 🧪 **Unit Tests** - Testy jednostkowe
3. 🔗 **Integration Tests** - Testy integracyjne z PostgreSQL
4. 🏗️ **Build** - Build produkcyjny
5. 📊 **Summary** - Podsumowanie pipeline

**Czas trwania:** ~9-10 minut

**Szczegółowa dokumentacja:** [`/.ai/ci-cd-setup.md`](../../.ai/ci-cd-setup.md)

## 🚀 Jak uruchomić manualne

1. Przejdź do zakładki **Actions** w GitHub
2. Wybierz workflow **CI/CD Pipeline**
3. Kliknij **Run workflow**
4. Wybierz branch (domyślnie: `main`)
5. Kliknij **Run workflow**

## 📊 Status Badge

Dodaj do README projektu:

```markdown
![CI/CD Pipeline](https://github.com/USERNAME/paragoniusz/actions/workflows/master.yaml/badge.svg)
```

## 🔧 Lokalne testowanie

Aby przetestować pipeline lokalnie przed push:

```bash
# Full pipeline simulation
npm run lint && npm run test:unit && npm run test:integration && npm run build
```

## 🔐 Wymagane Secrets

Upewnij się, że następujące secrets są skonfigurowane w GitHub:

- `SUPABASE_URL` - URL projektu Supabase
- `SUPABASE_ANON_KEY` - Anon key Supabase

**Konfiguracja:** `Settings` → `Secrets and variables` → `Actions`

**Uwaga:** Build job automatycznie mapuje te secrets na zmienne PUBLIC_* (client-side) i bez prefiksu (server-side) zgodnie z wymaganiami Astro SSR.

## 📝 Dodawanie nowego workflow

1. Utwórz plik `.github/workflows/nazwa-workflow.yaml`
2. Zdefiniuj triggery (`on:`)
3. Określ jobs i steps
4. Dodaj dokumentację do tego pliku

**Przykład:**

```yaml
name: My Workflow
on:
  push:
    branches: [develop]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

## 🐛 Debugowanie

### Sprawdź logi workflow:
1. Przejdź do **Actions**
2. Kliknij na uruchomienie workflow
3. Kliknij na konkretny job
4. Rozwiń step aby zobaczyć logi

### Re-run failed jobs:
1. Otwórz workflow run
2. Kliknij **Re-run jobs** → **Re-run failed jobs**

## 📚 Dokumentacja

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Actions Marketplace](https://github.com/marketplace?type=actions)

---

**Pytania?** Sprawdź [pełną dokumentację CI/CD](../../.ai/ci-cd-setup.md)