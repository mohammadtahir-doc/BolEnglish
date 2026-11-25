# Web Best Practices: Fix Recipes

Concrete before-and-after patterns for fixing common frontend and accessibility defects.

---

## 1. Native `<dialog>` with `showModal()` and Overscroll Containment

Custom modal overlays frequently fail accessibility: focus escapes to background elements, Escape key does not close, and background content scrolls behind the modal.

### ❌ Wrong Example
```jsx
// Custom div overlay with broken accessibility & scroll leaking
function BadModal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg">
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

### ✅ Right Example
```jsx
import { useEffect, useRef } from 'react';

export function GoodModal({ isOpen, onClose, title, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal(); // Built-in focus trap, top-layer, & Escape handling
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="dialog-title"
      className="p-6 rounded-lg backdrop:bg-neutral-900/50 overscroll-contain"
      style={{ overscrollBehavior: 'contain' }}
    >
      <h2 id="dialog-title" className="text-xl font-bold mb-4">{title}</h2>
      <div>{children}</div>
      <button type="button" onClick={onClose} className="mt-4 px-4 py-2">Close</button>
    </dialog>
  );
}
```

### How to Verify
1. Open the dialog. Press `Tab` repeatedly — focus must stay trapped inside the dialog.
2. Press `Escape` — the dialog must close and return focus to the trigger element.
3. Scroll inside the dialog — background page must NOT scroll (`overscrollBehavior: 'contain'`).

---

## 2. Accessible Button Instead of `<div onClick>` or `<a href="#">`

Divs with click handlers lack keyboard focus, cannot be triggered with Space or Enter, and are announced as plain text by screen readers. `<a href="#">` creates broken anchor jumps.

### ❌ Wrong Example
```html
<!-- Div acting as a button -->
<div class="submit-card" onclick="submitForm()">
  <span>Submit Application</span>
</div>

<!-- Dummy anchor acting as a button -->
<a href="#" onclick="deleteItem(id)">Delete</a>
```

### ✅ Right Example
```html
<!-- Native semantic button -->
<button type="button" class="submit-card" onclick="submitForm()">
  <span>Submit Application</span>
</button>

<button type="button" class="btn-delete" onclick="deleteItem(id)">
  Delete
</button>
```

### How to Verify
1. Put the mouse aside. Tab to the element. The `:focus-visible` outline must appear.
2. Press `Enter` and `Space`. Both must trigger the action.
3. Screen reader must announce element role as "button", not "link" or text.

---

## 3. Explicit Dimensions on `<img>` to Prevent CLS

Images without explicit width and height trigger layout shifts as the browser recalculates layout upon image download.

### ❌ Wrong Example
```html
<img src="/hero.webp" alt="Dashboard overview" class="w-full h-auto">
```

### ✅ Right Example
```html
<img
  src="/hero.webp"
  alt="Dashboard overview showing weekly analytics charts"
  width="1200"
  height="630"
  class="w-full h-auto"
  loading="eager"
  fetchpriority="high"
>
```

### How to Verify
1. Run Lighthouse in Chrome DevTools. Check Cumulative Layout Shift (CLS < 0.1).
2. Throttle network to Slow 3G in DevTools. The browser must reserve the aspect-ratio box before pixels load.
