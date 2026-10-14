// Keep the requested unique ID AND the access scope; neither may overwrite the other.
export function scopedWhere(req, id) {
  const where = req.access?.where ?? {};
  return Object.keys(where).length ? { id, AND: [where] } : { id };
}
