# Image Optimization Scripts

## optimize-images.js

A one-time optimization script that processes all images stored as base64 data URLs in the TrespassTracker database.

### What it does:
- Fetches all records with images from the `trespass_records` table
- Converts images to WebP format at 75% quality
- Resizes all images to 400×400px with 'top' cropping (keeps faces/eyes visible)
- Updates the database with optimized images

### Results from last run (Oct 9, 2025):
- ✅ **23 images optimized**
- 💾 **736.7KB → 141.8KB** (594.9KB saved)
- 💰 **80.8% average file size reduction**
- 🎯 Individual savings ranged from 11.8% to 97.7%

### Usage:

```bash
npm run optimize-images
```

### Requirements:
- Node.js installed
- Supabase credentials in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Dependencies: `sharp`, `dotenv`, `@supabase/supabase-js`

### How it works:

1. **Connects to Supabase** using service role key (full access)
2. **Fetches records** with `photo_url` that are base64 data URLs
3. **For each image:**
   - Decodes base64 → Buffer
   - Resizes to 400×400px with top cropping
   - Converts to WebP @ 75% quality
   - Re-encodes to base64 data URL
   - Updates record in database
4. **Displays summary** with total savings and statistics

### Notes:
- Only processes base64 data URLs (skips regular URLs)
- Non-destructive: Creates optimized versions, doesn't delete originals
- Safe to run multiple times (will re-optimize images)
- Uses 'top' cropping to ensure faces/eyes remain visible

### Future Enhancement (Phase 2):
Create a Supabase Edge Function to automatically optimize images on upload, so new images are optimized without running this script manually.
