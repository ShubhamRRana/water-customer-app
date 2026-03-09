# UI Redesign Spec — Dark & Refined Premium Look

**Status:** Approved — gold palette locked. **Progress:** Phase 1 ✅, Phase 2 ✅, Phase 3 ✅, Phase 4 ✅, Phase 5 ✅ — Complete.  
**Scope:** Full app restyle (colors, typography, components). Navigation unchanged (stack + drawer).  
**Palette:** Gold (dark & refined).  
**Constraints:** Use only existing app/codebase assets (Ionicons, existing font if present). Iterate directly in the app.

---

## 1. Overview & Goals

- **Look:** Dark and refined, premium feel.
- **Keep:** Current flow — stack navigator + side menu drawer; no new tabs or structural navigation changes.
- **Change:** Color palette, typography, spacing/shadows, and component styling so the app feels cohesive and premium.

---

## 2. What Stays the Same

- **Navigation:** Root stack (Auth | Customer). Customer stack: Home, Orders, Profile, Booking, OrderTracking, SavedAddresses, PastOrders. Side drawer for menu and logout. No bottom tabs, no new routes.
- **Features & flows:** All screens and actions remain; only visual treatment changes.
- **Icons:** Continue using Ionicons (`@expo/vector-icons`). No new icon sets.
- **Assets:** No new images or illustrations; only code-driven styling.

---

## 3. Color Palette — Gold (Dark & Refined)

**Chosen direction: gold.** Replace current cream/beige/blue palette with a dark theme and gold as the sole accent for primary actions, highlights, and active states.

Final tokens to define in `UI_CONFIG.colors`:

| Token | Hex | Usage |
|-------|-----|--------|
| **primary** | `#1a1d24` | Main app background (screens, scroll areas). |
| **surface** | `#252a33` | Cards, inputs, drawer panel, elevated surfaces. |
| **surfaceLight** | `#2f3540` | Hover/active states, subtle elevation (e.g. menu item active). |
| **background** | `#1a1d24` | Same as primary; alternate background where needed. |
| **text** | `#f0f2f5` | Primary text on dark. |
| **textSecondary** | `#9ca3af` | Secondary text, placeholders, captions. |
| **textLight** | `#ffffff` | Text on gold/primary buttons. |
| **accent** | `#d4af37` | **Gold** — primary buttons, CTAs, highlights, active states, key icons. |
| **accentMuted** | `#a08b4a` | Softer gold for secondary emphasis (outline buttons, subtle highlights). |
| **secondary** | `#3d4552` | Secondary buttons, borders, neutral surfaces. |
| **border** | `#3d4552` | Borders, dividers. |
| **borderLight** | `#4a5568` | Lighter dividers. |
| **success** | `#34d399` | Success states (delivered, completed). |
| **warning** | `#f59e0b` | Pending, caution. |
| **error** | `#ef4444` | Errors, destructive (logout, cancel). |
| **disabled** | `#6b7280` | Disabled controls. |
| **shadow** | `#000000` | Shadow color for elevation (use with opacity). |

**Note:** Primary actions use **accent** (gold). No separate `primaryAction` token — use `accent` for all primary buttons and main CTAs.

---

## 4. Typography

- **Current:** `UI_CONFIG.fonts.primary: 'System'`; `Typography` uses `UI_CONFIG.fontSize` and colors. One custom font is loaded in `App.tsx`: `PlayfairDisplay-Regular`.
- **Changes:**
  - **Font roles:** Use a single readable system stack for body and UI (e.g. keep System or use a clear sans if you add one). Use **PlayfairDisplay** only for a few premium touchpoints (e.g. app title on Home, Auth screen title, or drawer header “Menu”) so it doesn’t dominate.
  - **Sizes:** Keep or slightly tune `UI_CONFIG.fontSize` (xs–xxl) for hierarchy. Ensure body/caption have enough contrast on dark (use `text` / `textSecondary`).
  - **Weights:** Keep h1–h4 bold/semibold; body medium/regular; caption regular. Ensure contrast on dark backgrounds.
  - **Typography component:** All variants should use `UI_CONFIG.colors.text` / `colors.textSecondary` so switching to the new palette automatically updates type color.

---

## 5. Global / Theme Tokens

- **Spacing:** Keep `UI_CONFIG.spacing` (xs, sm, md, lg, xl). Optionally add one step (e.g. `xxl: 40`) for hero sections if needed.
- **Border radius:** Slightly increase for a softer premium feel (e.g. `md: 10`, `lg: 14`, `xl: 20`). Keep `sm` for chips/tags.
- **Shadows:** On dark, use dark shadow color with opacity (e.g. `shadowColor: #000`, `shadowOpacity: 0.3`–`0.5`, `shadowRadius` 8–16). Reduce or remove the current large offset if it looks heavy; prefer soft glow over hard drop.
- **StatusBar:** Set to light content (e.g. `StatusBar style="light"`) so icons/text are visible on dark backgrounds.

---

## 6. Component-Level Changes

### 6.1 Button (`src/components/common/Button.tsx`)

- **Primary:** Background = **accent** (gold). Text = textLight. Border same as background. Softer shadow.
- **Secondary:** Background = surface or surfaceLight; border = accent (gold); text = accent.
- **Outline:** Background transparent or surface; border = accent; text = accent.
- **Disabled:** Use `UI_CONFIG.colors.disabled` for background/border; text = textSecondary.
- **Sizes:** Keep padding scale; optionally increase touch targets (padding) for “large” for premium feel.

### 6.2 Card (`src/components/common/Card.tsx`)

- Background = `surface`; border = `border` (optional 1px for definition on dark).
- Shadow: dark shadow color, moderate opacity, no large offset.
- Border radius = `UI_CONFIG.borderRadius.lg` (updated value).

### 6.3 Input (`src/components/common/Input.tsx`)

- Background = `surface`; border = `border`; focus/hover border = `accent` (gold) or `borderLight`.
- Placeholder = `textSecondary`; text = `text`; label = `text`.
- Error state: border/error text = `error`.

### 6.4 Typography (`src/components/common/Typography.tsx`)

- No structural change. Ensure all variants use theme colors (`text`, `textSecondary`) so a single palette change in `config.ts` updates all type.

### 6.5 LoadingSpinner (`src/components/common/LoadingSpinner.tsx`)

- Spinner color = **accent** (gold) so it’s visible on dark.
- Optional text color = textSecondary.

### 6.6 MenuDrawer (`src/components/common/MenuDrawer.tsx`)

- Overlay: keep or darken (e.g. `rgba(0,0,0,0.6)`).
- Drawer panel: background = `surface`; border = `border`.
- Header: “Menu” in refined type (e.g. PlayfairDisplay for “Menu” only); text = `text`.
- Menu items: default text = `text`; active background = `surfaceLight`; active text/icon = `accent`; active indicator bar = `accent`.
- Divider = `border`.
- Logout: icon/text = `error`; keep destructive styling.

### 6.7 CustomerIcon (if used)

- Ensure any brand/logo treatment uses accent or text so it fits the dark theme.

### 6.8 ErrorBoundary / other common components

- Any inline colors should be replaced with `UI_CONFIG.colors` so they follow the new palette.

---

## 7. Screen-by-Screen Notes

### 7.1 Auth (Login, Register)

- Screen background = primary (dark).
- Card/container = surface; inputs and buttons per components above.
- Title: consider PlayfairDisplay for “Welcome” / “Sign in” / “Create account” only; rest system font.
- Links (e.g. “Sign up”, “Forgot password?”): use accent or textSecondary + underline/press state.

### 7.2 Customer Home

- Background = primary; content area uses same.
- Header: menu icon and title use `text` (and optional accent for logo/title).
- Cards for “Book tanker” / “Track order” / recent orders: Card + Button styling as above. Use accent for primary actions.
- Status chips/badges: use success/warning/error with dark-friendly contrast.
- Empty state (no orders): textSecondary for message; icon in textSecondary or accent.

### 7.3 Booking

- Same dark background; form on surface cards/inputs.
- Section headers: typography h3/h4 with `text`.
- Modals (tanker, agency, address): overlay dark; modal panel = surface; list items with borders; selected state = surfaceLight + accent.

### 7.4 Order History / Past Orders

- List background = primary; list items = Card (surface).
- Status colors = success/warning/error/primary as today, but from new palette.
- Search/filter bar: surface, border, textSecondary placeholder.

### 7.5 Order Tracking

- Map placeholder or simple layout: dark background; status steps with accent/success.
- Driver card: surface; buttons use Button component.
- Call / Navigate: accent or success for visibility.

### 7.6 Profile

- Header (gradient or image if any): keep or replace with a dark header (surface/surfaceLight) and accent for key info.
- List rows: surface or surfaceLight; borders; icons in accent or textSecondary.
- Logout: error color; same as drawer.

### 7.7 Saved Addresses

- List = Card per address; actions (edit/delete) with accent/error.
- Empty state: textSecondary + icon.

### 7.8 Modals (Tanker, Agency, Saved Address)

- Overlay: dark (e.g. rgba(0,0,0,0.6)).
- Modal container: surface; header text = text; close button = text or accent (gold).
- Lists: alternating or bordered rows; selected = surfaceLight + accent indicator.

---

## 8. Implementation Order (Suggested)

1. **Phase 1 — Theme & tokens** ✅ *Complete*  
   - Update `UI_CONFIG.colors` (and optionally spacing/borderRadius/shadows) in `src/constants/config.ts`.  
   - Set `StatusBar` to light in `App.tsx`.

2. **Phase 2 — Shared components** ✅ *Complete*  
   - Button, Card, Input, Typography, LoadingSpinner, MenuDrawer.  
   - Replace any hardcoded colors in these with `UI_CONFIG` if not already.

3. **Phase 3 — Auth screens** ✅ *Complete*  
   - Login, Register: backgrounds, cards, typography (PlayfairDisplay for titles), Button component, accent links.

4. **Phase 4 — Customer screens** ✅ *Complete*  
   - Home, Booking, Order History, Past Orders, Order Tracking, Profile, Saved Addresses.  
   - Removed/replaced inline rgba with theme tokens; status colors use palette (accent for accepted, success/warning/error).

5. **Phase 5 — Modals & polish** ✅ *Complete*  
   - TankerSelectionModal, AgencySelectionModal, SavedAddressModal.  
   - Final pass: overlays, focus states, accessibility (contrast).

---

## 9. Files to Touch (Checklist)

- `src/constants/config.ts` — palette, optional spacing/radius/shadow tokens.
- `App.tsx` — StatusBar style.
- `src/components/common/Button.tsx`
- `src/components/common/Card.tsx`
- `src/components/common/Input.tsx`
- `src/components/common/Typography.tsx` (only if adding font family per variant).
- `src/components/common/LoadingSpinner.tsx`
- `src/components/common/MenuDrawer.tsx`
- `src/components/common/CustomerIcon.tsx` (if it has colors).
- `src/components/customer/TankerSelectionModal.tsx`
- `src/components/customer/AgencySelectionModal.tsx`
- `src/components/customer/SavedAddressModal.tsx`
- `src/components/customer/PriceBreakdown.tsx`, `DeliverySummary.tsx`, `DateTimeInput.tsx` (any local colors → theme).
- `src/screens/auth/LoginScreen.tsx`
- `src/screens/auth/RegisterScreen.tsx`
- `src/screens/customer/CustomerHomeScreen.tsx`
- `src/screens/customer/BookingScreen.tsx`
- `src/screens/customer/OrderHistoryScreen.tsx`
- `src/screens/customer/PastOrdersScreen.tsx`
- `src/screens/customer/OrderTrackingScreen.tsx`
- `src/screens/customer/ProfileScreen.tsx`
- `src/screens/customer/SavedAddressesScreen.tsx`

Any other screen or component that uses `UI_CONFIG` will pick up the new palette once config is updated; only components with hardcoded colors (e.g. `rgba(255,255,255,0.2)`) need explicit updates.

---

## 10. Out of Scope (By Your Choice)

- New navigation (tabs, new routes).
- New assets (icons, images, illustrations).
- New features or flows.
- Separate design mockups (iteration in app only).

---

## 11. Design Tokens Reference (Gold Palette)

Copy-paste reference for `UI_CONFIG.colors` in `src/constants/config.ts`:

```ts
colors: {
  primary: '#1a1d24',
  secondary: '#3d4552',
  accent: '#d4af37',
  background: '#1a1d24',
  surface: '#252a33',
  surfaceLight: '#2f3540',
  text: '#f0f2f5',
  textSecondary: '#9ca3af',
  textLight: '#ffffff',
  border: '#3d4552',
  borderLight: '#4a5568',
  success: '#34d399',
  warning: '#f59e0b',
  error: '#ef4444',
  disabled: '#6b7280',
  shadow: '#000000',
  // Optional: accentMuted: '#a08b4a',
},
```

Proceed with implementation in the order in §8, or adjust order per your preference.

---

*End of UI Redesign Spec. Gold palette locked; ready for implementation.*
