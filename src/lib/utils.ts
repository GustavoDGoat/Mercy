import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInCalendarDays } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateFine(dueDate: string, returnDate?: string): number {
  const FINE_PER_DAY = 50
  const due = new Date(dueDate)
  const returned = returnDate ? new Date(returnDate) : new Date()
  const days = differenceInCalendarDays(returned, due)
  return days > 0 ? days * FINE_PER_DAY : 0
}
