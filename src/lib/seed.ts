import { hashPassword } from "./auth"
import { sql, querySingle, execute } from "./db"
import { generateRFIDTagId } from "./encryption"

const COVER_PLACEHOLDER = "https://placehold.co/300x400/1a1f44/c89933?text=Book+Cover"

export async function seedDatabase(): Promise<void> {
  const lock = await querySingle<{ locked: boolean }>`
    SELECT pg_try_advisory_lock(987654322) as locked
  `
  if (!lock?.locked) {
    await new Promise((r) => setTimeout(r, 2000))
    return
  }

  try {
    const existing = await querySingle<{ cnt: string }>`SELECT COUNT(*) as cnt FROM users`
    if (existing && parseInt(existing.cnt) > 0) return

  const adminId = crypto.randomUUID()
  const now = new Date().toISOString()

  const adminHash = await hashPassword("admin123")
  await execute`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, fingerprint_hash, created_at, updated_at)
    VALUES (${adminId}, ${"admin@lautech.edu.ng"}, ${adminHash}, ${"Admin"}, ${"User"}, ${"admin"}, ${await hashPassword(`fingerprint:${adminId}`)}, ${now}, ${now})
  `

  const copies = 5

  const seedBooks = [
    { isbn: "978-1-491-93936-9", title: "Think Python", author: "Allen B. Downey", publisher: "O'Reilly Media", year: 2015, edition: "2nd Edition", category: "Computer Science", shelf: "CS-A1", pdfUrl: "https://greenteapress.com/thinkpython2/thinkpython2.pdf", description: "An introduction to Python programming for beginners, covering fundamental computer science concepts." },
    { isbn: "978-0-486-49820-1", title: "Common Lisp: A Gentle Introduction to Symbolic Computation", author: "David S. Touretzky", publisher: "Dover Publications", year: 2013, edition: "Dover Edition", category: "Computer Science", shelf: "CS-A2", pdfUrl: "https://www.cs.cmu.edu/~dst/LispBook/book.pdf", description: "A highly accessible introduction to Common Lisp programming." },
    { isbn: "978-0-9885024-0-6", title: "Mathematics for Computer Science", author: "Eric Lehman, F. Thomson Leighton, Albert R. Meyer", publisher: "MIT OpenCourseWare", year: 2018, edition: "Revised Edition", category: "Computer Science", shelf: "CS-A3", pdfUrl: "https://courses.csail.mit.edu/6.042/spring18/mcs.pdf", description: "A comprehensive introduction to discrete mathematics for computer science students." },
    { isbn: "978-1-927356-38-8", title: "Open Data Structures (Java Edition)", author: "Pat Morin", publisher: "AU Press", year: 2013, edition: "1st Edition", category: "Computer Science", shelf: "CS-B1", pdfUrl: "https://opendatastructures.org/ods-java.pdf", description: "An open textbook covering the design and implementation of fundamental data structures in Java." },
    { isbn: "978-0-9716775-0-0", title: "How to Think Like a Computer Scientist: Learning with Python", author: "Allen B. Downey, Jeffrey Elkner, Chris Meyers", publisher: "Green Tea Press", year: 2002, edition: "1st Edition", category: "Computer Science", shelf: "CS-B2", pdfUrl: "https://greenteapress.com/thinkpython/thinkpython.pdf", description: "The original introductory programming text that spawned the Think Python series." },
    { isbn: "978-1-947172-04-3", title: "Anatomy and Physiology", author: "J. Gordon Betts, Kelly A. Young, James A. Wise", publisher: "OpenStax / Rice University", year: 2022, edition: "2nd Edition", category: "Medicine", shelf: "MED-A1", pdfUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/AnatomyandPhysiology-OP.pdf", description: "A comprehensive introduction to the structure and function of the human body." },
    { isbn: "978-0-323-47731-5", title: "Basic Medical Microbiology", author: "Patrick R. Murray", publisher: "Elsevier", year: 2017, edition: "1st Edition", category: "Medicine", shelf: "MED-A2", pdfUrl: "https://www.ncbi.nlm.nih.gov/books/NBK571554/pdf/Bookshelf_NBK571554.pdf", description: "An introductory guide to medical microbiology covering bacteria, viruses, fungi, and parasites." },
    { isbn: "978-1-947172-67-8", title: "Financial Accounting", author: "Mitchell Franklin, Patty Graybeal, Dixon Cooper", publisher: "OpenStax / Rice University", year: 2019, edition: "1st Edition", category: "Finance", shelf: "FIN-A1", pdfUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/FinancialAccounting-OP.pdf", description: "A rigorous introduction to financial accounting principles." },
    { isbn: "978-1-947172-36-4", title: "Principles of Economics", author: "Timothy Taylor, Steven A. Greenlaw, David Shapiro", publisher: "OpenStax / Rice University", year: 2017, edition: "3rd Edition", category: "Finance", shelf: "FIN-A2", pdfUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/PrinciplesofEconomics-OP.pdf", description: "A comprehensive introduction to microeconomics and macroeconomics." },
  ]

  for (const book of seedBooks) {
    const bookId = crypto.randomUUID()
    const tagId = generateRFIDTagId()
    const rfidId = crypto.randomUUID()

    await execute`
      INSERT INTO books (id, isbn, title, author, publisher, year_published, edition, category, shelf_location, total_copies, available_copies, rfid_tag_id, pdf_url, cover_image, description, status, created_at, updated_at)
      VALUES (${bookId}, ${book.isbn}, ${book.title}, ${book.author}, ${book.publisher}, ${book.year}, ${book.edition}, ${book.category}, ${book.shelf}, ${copies}, ${copies}, ${tagId}, ${book.pdfUrl}, ${COVER_PLACEHOLDER}, ${book.description}, ${"available"}, ${now}, ${now})
    `

    await execute`
      INSERT INTO rfid_tags (id, tag_id, book_id, is_active, created_at)
      VALUES (${rfidId}, ${tagId}, ${bookId}, true, ${now})
    `
  }

  console.log(`[Seed] Database populated: 1 admin, ${seedBooks.length} books`)
  } finally {
    await execute`SELECT pg_advisory_unlock(987654322)`
  }
}
