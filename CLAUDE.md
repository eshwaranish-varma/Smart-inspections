# Claude Code Rules

## Scope of Work

**You are restricted to UI/UX improvements only.**

### Allowed
- Styling changes (CSS, Tailwind classes, inline styles)
- Layout and spacing adjustments
- Typography (font sizes, weights, line heights)
- Color palette and theming
- Component visual appearance (borders, shadows, rounded corners, etc.)
- Animations and transitions
- Responsive design improvements
- Accessibility improvements (ARIA labels, focus states, contrast ratios)
- Icon changes or additions
- Loading states, skeleton screens, empty states
- Toast/notification styling
- Modal and dialog appearance
- Form field styling and visual feedback
- Navigation and sidebar appearance

### Strictly Forbidden
- Changes to API calls or endpoints
- Changes to business logic or data processing
- Changes to routing or navigation flow
- Changes to authentication or authorization logic
- Changes to state management logic
- Changes to backend code
- Changes to database queries or schema
- Adding or removing features
- Changes to how data is fetched, transformed, or submitted
- Changes to environment config, Docker, CI/CD, or deployment files

### If in Doubt
Ask the user before making any change that could affect functionality, data flow, or application behavior. When uncertain whether a change is purely visual, err on the side of asking.

## Temporary Debug Scope

For fixing the Auto-fill Metadata failed fetch issue, the agent may inspect and edit:
- `src/gui/**`
- frontend API request code related to OCR/autofill metadata

Allowed change:
- update frontend OCR request URL from `/api/ocr` to `/api/ocr/`

Do not change backend logic, database code, auth, or unrelated UI behavior.

## Temporary OpenRouter Metadata Extraction Scope

For fixing Auto-fill Metadata, the agent may inspect and edit backend AI metadata extraction code.

Allowed files:
- backend/source files that define `/api/ai/extract-metadata`
- backend AI provider/client helper files
- environment variable documentation only if needed

Allowed change:
- replace Google/Gemini usage in metadata extraction with existing OpenRouter configuration
- keep OCR/PyTesseract behavior unchanged

Do not change database schema, auth, frontend UI, routing flow, or unrelated backend endpoints.