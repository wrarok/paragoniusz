### 1. Tables

#### `profiles`

Stores user-specific application data, extending the built-in Supabase `auth.users` table.

| Column Name        | Data Type     | Constraints                                                  | Description                                                                    |
| :----------------- | :------------ | :----------------------------------------------------------- | :----------------------------------------------------------------------------- |
| `id`               | `uuid`        | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` | One-to-one relationship with the user's authentication record.                 |
| `ai_consent_given` | `boolean`     | `NOT NULL`, `DEFAULT false`                                  | Tracks if the user has consented to AI processing of their receipts (PRD 3.4). |
| `created_at`       | `timestamptz` | `NOT NULL`, `DEFAULT now()`                                  | Timestamp of when the profile was created.                                     |
| `updated_at`       | `timestamptz` | `NOT NULL`, `DEFAULT now()`                                  | Timestamp of the last profile update.                                          |

---

#### `categories`

A dictionary table for predefined expense categories.

| Column Name  | Data Type     | Constraints                                | Description                                                |
| :----------- | :------------ | :----------------------------------------- | :--------------------------------------------------------- |
| `id`         | `uuid`        | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique identifier for the category.                        |
| `name`       | `text`        | `NOT NULL`, `UNIQUE`                       | The name of the category (e.g., "Groceries", "Transport"). |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()`                | Timestamp of when the category was created.                |

---

#### `expenses`

The main transactional table storing all user expenses.

| Column Name                | Data Type        | Constraints                                             | Description                                                                          |
| :------------------------- | :--------------- | :------------------------------------------------------ | :----------------------------------------------------------------------------------- |
| `id`                       | `uuid`           | `PRIMARY KEY`, `DEFAULT gen_random_uuid()`              | Unique identifier for the expense record.                                            |
| `user_id`                  | `uuid`           | `NOT NULL`, `REFERENCES profiles(id) ON DELETE CASCADE` | Foreign key linking the expense to a user.                                           |
| `category_id`              | `uuid`           | `NOT NULL`, `REFERENCES categories(id)`                 | Foreign key linking the expense to a category.                                       |
| `amount`                   | `numeric(10, 2)` | `NOT NULL`                                              | The monetary value of the expense. `NUMERIC` is used to avoid floating-point errors. |
| `expense_date`             | `date`           | `NOT NULL`, `DEFAULT CURRENT_DATE`                      | The date the expense was incurred.                                                   |
| `currency`                 | `text`           | `NOT NULL`, `DEFAULT 'PLN'`                             | The currency of the expense (designed for future scalability).                       |
| `created_by_ai`            | `boolean`        | `NOT NULL`, `DEFAULT false`                             | Flag to measure AI feature adoption (PRD 6.3).                                       |
| `was_ai_suggestion_edited` | `boolean`        | `NOT NULL`, `DEFAULT false`                             | Flag to measure AI accuracy (PRD 6.2).                                               |
| `created_at`               | `timestamptz`    | `NOT NULL`, `DEFAULT now()`                             | Timestamp of when the expense record was created.                                    |
| `updated_at`               | `timestamptz`    | `NOT NULL`, `DEFAULT now()`                             | Timestamp of the last expense record update.                                         |

---

### 2. Relationships

- **`profiles` to `auth.users`**: A **one-to-one** relationship. Each user in `auth.users` has exactly one corresponding record in `profiles`. This is enforced by using the same `uuid` as the primary key.
- **`profiles` to `expenses`**: A **one-to-many** relationship. One user can have multiple expenses.
- **`categories` to `expenses`**: A **one-to-many** relationship. One category can be assigned to multiple expenses.

---

### 3. Indexes

- **`expenses_user_id_expense_date_idx`**: A composite index on the `expenses` table.
  - **Columns**: `(user_id, expense_date DESC)`
  - **Reasoning**: This index significantly speeds up the primary query for the user dashboard, which involves fetching a specific user's recent expenses sorted chronologically (PRD 3.2).

---

### 4. Row Level Security (RLS) Policies

RLS will be enabled on the `profiles` and `expenses` tables to ensure data privacy.

#### Policies for `profiles` table:

- **`Allow individual read access`**:
  - **Action**: `SELECT`
  - **Check**: `auth.uid() = id`
- **`Allow individual update access`**:
  - **Action**: `UPDATE`
  - **Check**: `auth.uid() = id`

#### Policies for `expenses` table:

- **`Allow individual read access`**:
  - **Action**: `SELECT`
  - **Check**: `auth.uid() = user_id`
- **`Allow individual insert access`**:
  - **Action**: `INSERT`
  - **Check**: `auth.uid() = user_id`
- **`Allow individual update access`**:
  - **Action**: `UPDATE`
  - **Check**: `auth.uid() = user_id`
- **`Allow individual delete access`**:
  - **Action**: `DELETE`
  - **Check**: `auth.uid() = user_id`

---

### 5. Design Notes

- **UUIDs as Primary Keys**: `uuid` is used for all primary keys to prevent enumeration attacks and to simplify integration in a distributed system.
- **Separation of Concerns**: The `profiles` table cleanly separates application-specific user data from authentication data managed by Supabase (`auth.users`), following recommended practices.
- **Data Integrity**: The `ON DELETE CASCADE` constraint on `profiles.id` and `expenses.user_id` ensures that when a user is deleted from the `auth.users` table, all their associated data (profile and expenses) is automatically and cleanly removed, fulfilling requirement `US-006`.
- **Metrics-Driven Design**: The columns `created_by_ai` and `was_ai_suggestion_edited` are explicitly included to enable the measurement of key success metrics defined in the PRD (6.2, 6.3) without requiring complex log analysis.
