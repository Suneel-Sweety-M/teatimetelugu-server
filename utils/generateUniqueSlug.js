export async function generateUniqueSlug(Model, title, excludeId = null) {
  let baseSlug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')       // Remove special chars
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/-+/g, '-')            // Replace multiple - with single -
    .trim();                        // Trim - from start/end

  let slug = baseSlug;
  let counter = 1;
  
  // Check if slug exists in database
  while (true) {
    const existing = await Model.findOne({ 
      newsId: slug,
      ...(excludeId && { _id: { $ne: excludeId } })
    });
    
    if (!existing) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
