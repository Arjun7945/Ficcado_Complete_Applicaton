# Ficcado Item Images Guide

Each item in the Ficcado catalog has one dedicated folder inside this directory, named exactly with the item's lowercase slug.

## Directory Structure

```text
public/
  images/
    items/
      <item-slug>/
        image-1.webp      ← primary image (cards, listings, first in gallery)
        image-2.webp      ← secondary image / flat lay
        image-3.webp      ← additional detail angle (optional)
        ...
```

## How to Add an Item

1. **Add the row in Google Sheets**: Add the item details into the **Item Management** sheet tab (`id`, `item_name`, `type`, `price`, `sizes`, etc.).
2. **Create the folder**: Create a new folder inside `public/images/items/` named with the exact slug of `item_name` (e.g. `Colorado Heavyweight Tee` → `colorado-heavyweight-tee`).
3. **Add image files**: Name the files `image-1`, `image-2`, `image-3`, etc.
   - Allowed extensions: `.webp`, `.jpg`, `.jpeg`, `.png`, `.avif`.
   - Numbering must start at 1 and be continuous (no gaps).
   - `image-1` is always the primary display image.
4. **Commit and redeploy**: Images are committed into the repository and deployed with the site build.
5. **Renaming**: Renaming an item in the sheet requires renaming its folder here to match the new slug.

## File Specifications & Recommendations

- **Aspect Ratio**: Recommended **4:5** aspect ratio across all images for an item for seamless visual consistency without layout shift.
- **Resolution**: Recommended ≤ 1600 px on the longest edge.
- **File Size**: Ideally ≤ 250 KB per image. WebP format is recommended for optimal mobile loading speeds.
