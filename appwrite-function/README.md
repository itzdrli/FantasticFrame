# ff-batch-render

Appwrite Function (Bun runtime) that renders a batch of FantasticFrame photos
with takumi (WASM backend — the native addon isn't available in the Functions
sandbox), zips the results, and uploads the zip to an Appwrite Storage bucket.

The client uploads a JSON "request file" to the `ff-batch-uploads` bucket and
calls this function with its fileId; the function reads it, renders, and
writes `<fileId>.zip` to `ff-batch-results`. The client polls the bucket.

`src/shared/` is copied from the repo root `shared/` at build time — edit the
root copies, not these.

## Build & deploy

```bash
cd appwrite-function
bun install
bun run build
zip -r ../function-bundle.zip dist   # or: appwrite push functions
```

Environment variables (Console → Function → Settings):

- `FF_UPLOADS_BUCKET_ID` — bucket holding request JSONs (default `ff-batch-uploads`)
- `FF_RESULTS_BUCKET_ID` — bucket holding result zips (default `ff-batch-results`)

Needs an API key scope: `storage.read` on uploads + `storage.write` on
results (set as the function's API key in the Console, or
`APPWRITE_API_KEY`).

Function settings: timeout 900s (WASM rendering is slower than native),
memory 2048 MB.
