# Extract Field

Form-generation workspace for turning DOCX templates into reviewed fill-in forms.

## Run locally

```bash
uv sync --directory backend
uv run --directory backend uvicorn app.main:app --reload --port 8000

npm install --prefix frontend
npm run dev --prefix frontend
```

The browser opens at `http://localhost:5173`; the API documentation is at
`http://localhost:8000/docs`.

## Current scope

This implementation covers DOCX ingestion, OOXML analysis,
marker/comment/blank/table-cell candidates, creator review, field
configuration, persistent reviewed form definitions, and filling reviewed
values back into the original DOCX.

## Test documents

Vite publishes the DOCX files already placed in `frontend/public/samples/`
at `/samples/` (and copies them into `frontend/dist/samples/` in a production
build). The landing page imports those original files through the same upload
endpoint used for a local DOCX; it does not generate replacement templates.
