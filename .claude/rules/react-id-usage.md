# React ID Usage

- **Hardcoded IDs**: only when element appears once per page with a stable, human-readable ID
- **`useId()`**: reusable/repeated components, lists, SSR-safe uniqueness

Accept optional `id` prop, fallback to `useId()`:

```tsx
const generatedId = useId();
const inputId = id ?? generatedId;
```

Use `data-testid` for testing selectors, not IDs.
