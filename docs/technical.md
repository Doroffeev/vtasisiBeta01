# Техническая документация системы "Ветеринарный ассистент"

## 1. Архитектура системы

### 1.1 Общее описание
Система "Ветеринарный ассистент" представляет собой веб-приложение, построенное на основе React с использованием TypeScript. Приложение предназначено для управления животноводческим хозяйством и включает в себя модули для учета животных, ветеринарных операций, движения поголовья и других аспектов работы.

### 1.2 Технологический стек
- Frontend: React 18.3.1
- Язык программирования: TypeScript
- Стилизация: Tailwind CSS
- Маршрутизация: React Router 6
- Форматирование дат: date-fns
- Иконки: lucide-react
- База данных: Supabase
- PWA: vite-plugin-pwa

### 1.3 Структура проекта
```
src/
├── components/     # Компоненты React
├── contexts/      # Контексты для управления состоянием
├── pages/         # Страницы приложения
├── types/         # TypeScript типы
└── utils/         # Вспомогательные функции
```

## 2. Контексты приложения

### 2.1 UserContext
Управление пользователями и авторизацией.
```typescript
interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}
```

### 2.2 GroupsContext
Управление группами животных.
```typescript
interface Group {
  id: string;
  number: string;
  description: string;
}
```

### 2.3 MovementsContext
Управление движением поголовья.
```typescript
interface Movement {
  id: string;
  date: string;
  animals: { id: string; number: string; }[];
  fromGroup: string;
  toGroup: string;
  reason: string;
}
```

### 2.4 VetOperationsContext
Управление ветеринарными операциями.
```typescript
interface VetOperation {
  id: string;
  date: string;
  time: string;
  code: string;
  price: string;
  executorId: string;
  result: string;
  comments: string[];
  animalId: string;
  plannedOperations: PlannedOperation[];
  medications: MedicationUsage[];
}
```

### 2.5 MedicationsContext
Управление ветеринарными препаратами.
```typescript
interface Medication {
  id: string;
  nomenclatureId: string;
  quantity: number;
  unitPrice: number;
  invoiceNumber: string;
  remainingQuantity: number;
  receiptDate: string;
  expiryDate: string;
  batchNumber: string;
}
```

## 3. Основные компоненты

### 3.1 Layout
Основной макет приложения, включающий:
- Header: Верхняя панель с навигацией
- Sidebar: Боковое меню
- Main: Основной контент

### 3.2 SearchableSelect
Компонент выпадающего списка с поиском.
```typescript
interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}
```

## 4. Безопасность

### 4.1 Роли пользователей
- ADMIN: Полный доступ
- MANAGER: Управление всеми операциями
- VET: Ветеринарные операции
- ZOOTECHNICIAN: Управление животными
- CARETAKER: Отёлы
- INSEMINATOR: Осеменение

### 4.2 Права доступа
Реализованы через систему ролей и маршрутизацию:
```typescript
const roleAccessMap: Record<UserRole, string[]> = {
  ADMIN: ['/animals', '/vet-operations', '/monitoring', ...],
  MANAGER: ['/animals', '/vet-operations', '/monitoring', ...],
  VET: ['/animals', '/vet-operations', '/monitoring', ...],
  // ...
};
```

## 5. API и интеграции

### 5.1 Supabase
- Аутентификация пользователей
- Хранение данных
- Real-time обновления

### 5.2 PWA
Поддержка Progressive Web App:
- Оффлайн режим
- Установка на устройство
- Push-уведомления

## 6. Развертывание

### 6.1 Требования
- Node.js 18+
- npm или yarn
- Современный веб-браузер

### 6.2 Установка
```bash
# Клонирование репозитория
git clone [repository-url]

# Установка зависимостей
npm install

# Запуск development сервера
npm run dev

# Сборка для production
npm run build
```