## Appendix A. The Mark (exact, from `frontend/src/ui.tsx`)

```tsx
<svg width={size} height={size} viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="14.8" stroke="currentColor" strokeWidth="1" strokeDasharray="1.2 2.4" opacity=".5" />
  <circle cx="16" cy="16" r="10.4" stroke="currentColor" strokeWidth="1.2" opacity=".78" />
  <circle cx="16" cy="16" r="6" stroke="currentColor" strokeWidth="1.7" />
  <circle cx="16" cy="16" r="4.4" fill="var(--accent)" opacity=".2" />
  <circle cx="16" cy="16" r="2.2" fill="var(--accent)" />
</svg>
```
`currentColor` is ink (#f2f1ed) on graphite; accent is #f01a49 (dark theme). Do not redraw or alter the geometry.
