import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any) {
  if (!date) return "N/A";
  
  let d: Date;
  if (date && typeof date.toDate === 'function') {
    d = date.toDate();
  } else {
    d = new Date(date);
  }

  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
}

const CHURCH_BUILDINGS = [
  "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1548625361-195fe5772df9?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1545659564-2c15bc21f7a0?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1544923246-77307dd654ca?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1541339907198-e08756eaa589?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1523050335456-c6e749c7dd31?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&q=80&w=1200",
  "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=1200"
];

export function getChurchPlaceholder(id: string) {
  if (!id) return CHURCH_BUILDINGS[0];
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CHURCH_BUILDINGS[Math.abs(hash) % CHURCH_BUILDINGS.length];
}

export function getChurchImage(images: string[] | undefined, id: string) {
  const firstImage = images?.[0];
  if (!firstImage || firstImage.includes('picsum.photos')) {
    return getChurchPlaceholder(id);
  }
  return firstImage;
}
