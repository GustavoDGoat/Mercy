import { hashPassword } from "./auth"
import db from "./db"
import { generateRFIDTagId } from "./encryption"
import type { User, Member } from "@/types"

const COVER_PLACEHOLDER = "https://placehold.co/300x400/1a1f44/c89933?text=Book+Cover"

interface SeedBook {
  isbn: string
  title: string
  author: string
  publisher: string
  year: number
  edition: string
  category: string
  shelf: string
  pdfUrl: string
  description: string
}

const seedBooks: SeedBook[] = [
  {
    isbn: "978-1-491-93936-9",
    title: "Think Python",
    author: "Allen B. Downey",
    publisher: "O'Reilly Media",
    year: 2015,
    edition: "2nd Edition",
    category: "Computer Science",
    shelf: "CS-A1",
    pdfUrl: "https://greenteapress.com/thinkpython2/thinkpython2.pdf",
    description: "An introduction to Python programming for beginners, covering fundamental computer science concepts. This hands-on guide takes you through the language one step at a time, beginning with basic programming concepts before moving on to functions, recursion, data structures, and object-oriented design.",
  },
  {
    isbn: "978-0-486-49820-1",
    title: "Common Lisp: A Gentle Introduction to Symbolic Computation",
    author: "David S. Touretzky",
    publisher: "Dover Publications",
    year: 2013,
    edition: "Dover Edition",
    category: "Computer Science",
    shelf: "CS-A2",
    pdfUrl: "https://www.cs.cmu.edu/~dst/LispBook/book.pdf",
    description: "A highly accessible introduction to Common Lisp programming. Covers symbolic computation, recursion, data structures, and functional programming. Uses the 'dragon stories' approach to teach complex concepts through engaging narratives.",
  },
  {
    isbn: "978-0-9885024-0-6",
    title: "Mathematics for Computer Science",
    author: "Eric Lehman, F. Thomson Leighton, Albert R. Meyer",
    publisher: "MIT OpenCourseWare",
    year: 2018,
    edition: "Revised Edition",
    category: "Computer Science",
    shelf: "CS-A3",
    pdfUrl: "https://courses.csail.mit.edu/6.042/spring18/mcs.pdf",
    description: "A comprehensive introduction to discrete mathematics for computer science students. Covers proofs, number theory, graph theory, probability, and combinatorics, with applications to algorithms, data structures, and cryptography.",
  },
  {
    isbn: "978-1-927356-38-8",
    title: "Open Data Structures (Java Edition)",
    author: "Pat Morin",
    publisher: "AU Press",
    year: 2013,
    edition: "1st Edition",
    category: "Computer Science",
    shelf: "CS-B1",
    pdfUrl: "https://opendatastructures.org/ods-java.pdf",
    description: "An open textbook covering the design and implementation of fundamental data structures in Java. Topics include arrays, linked lists, hash tables, binary trees, heaps, graphs, and sorting algorithms, with detailed pseudocode and analysis.",
  },
  {
    isbn: "978-0-9716775-0-0",
    title: "How to Think Like a Computer Scientist: Learning with Python",
    author: "Allen B. Downey, Jeffrey Elkner, Chris Meyers",
    publisher: "Green Tea Press",
    year: 2002,
    edition: "1st Edition",
    category: "Computer Science",
    shelf: "CS-B2",
    pdfUrl: "https://greenteapress.com/thinkpython/thinkpython.pdf",
    description: "The original introductory programming text that spawned the Think Python series. Teaches computer science fundamentals and problem-solving skills through Python, emphasizing algorithmic thinking and program design.",
  },
  {
    isbn: "978-1-947172-04-3",
    title: "Anatomy and Physiology",
    author: "J. Gordon Betts, Kelly A. Young, James A. Wise",
    publisher: "OpenStax / Rice University",
    year: 2022,
    edition: "2nd Edition",
    category: "Medicine",
    shelf: "MED-A1",
    pdfUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/AnatomyandPhysiology-OP.pdf",
    description: "A comprehensive introduction to the structure and function of the human body. Covers all major body systems including integumentary, skeletal, muscular, nervous, endocrine, cardiovascular, respiratory, digestive, urinary, and reproductive systems.",
  },
  {
    isbn: "978-0-323-47731-5",
    title: "Basic Medical Microbiology",
    author: "Patrick R. Murray",
    publisher: "Elsevier",
    year: 2017,
    edition: "1st Edition",
    category: "Medicine",
    shelf: "MED-A2",
    pdfUrl: "https://www.ncbi.nlm.nih.gov/books/NBK571554/pdf/Bookshelf_NBK571554.pdf",
    description: "An introductory guide to medical microbiology covering bacteria, viruses, fungi, and parasites. Includes pathogenesis, clinical manifestations, laboratory diagnosis, antimicrobial therapy, and infection prevention strategies for healthcare professionals.",
  },
  {
    isbn: "978-1-947172-67-8",
    title: "Financial Accounting",
    author: "Mitchell Franklin, Patty Graybeal, Dixon Cooper",
    publisher: "OpenStax / Rice University",
    year: 2019,
    edition: "1st Edition",
    category: "Finance",
    shelf: "FIN-A1",
    pdfUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/FinancialAccounting-OP.pdf",
    description: "A rigorous introduction to financial accounting principles. Covers the accounting cycle, financial statements, assets, liabilities, equity, ratio analysis, and managerial decision-making, with real-world case studies and practice exercises.",
  },
  {
    isbn: "978-1-947172-36-4",
    title: "Principles of Economics",
    author: "Timothy Taylor, Steven A. Greenlaw, David Shapiro",
    publisher: "OpenStax / Rice University",
    year: 2017,
    edition: "3rd Edition",
    category: "Finance",
    shelf: "FIN-A2",
    pdfUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/PrinciplesofEconomics-OP.pdf",
    description: "A comprehensive introduction to microeconomics and macroeconomics. Covers supply and demand, market structures, fiscal and monetary policy, international trade, economic growth, and contemporary economic issues.",
  },
]

export async function seedDatabase(): Promise<void> {
  if (Object.keys(db.users).length > 0) return

  const adminId = crypto.randomUUID()
  const librarianId = crypto.randomUUID()
  const studentId = crypto.randomUUID()

  const admin: User = {
    id: adminId,
    email: "admin@lautech.edu.ng",
    passwordHash: await hashPassword("admin123"),
    firstName: "Admin",
    lastName: "User",
    role: "admin",
    fingerprintHash: await hashPassword(`fingerprint:${adminId}`),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const librarian: User = {
    id: librarianId,
    email: "librarian@lautech.edu.ng",
    passwordHash: await hashPassword("library123"),
    firstName: "Grace",
    lastName: "Oluwaseun",
    role: "librarian",
    fingerprintHash: await hashPassword(`fingerprint:${librarianId}`),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const student: User = {
    id: studentId,
    email: "student@lautech.edu.ng",
    passwordHash: await hashPassword("student123"),
    firstName: "Oluwafemi",
    lastName: "Adebayo",
    role: "student",
    memberId: "SE-001",
    fingerprintHash: await hashPassword(`fingerprint:${studentId}`),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.users[adminId] = admin
  db.users[librarianId] = librarian
  db.users[studentId] = student

  const member: Member = {
    id: "SE-001",
    userId: studentId,
    firstName: "Oluwafemi",
    lastName: "Adebayo",
    email: "student@lautech.edu.ng",
    phone: "08012345678",
    matricNumber: "SE/2019/001",
    department: "Computer Science",
    faculty: "Engineering and Technology",
    level: "400L",
    maxBorrowLimit: 4,
    status: "active",
    registeredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.members["SE-001"] = member

  const copiesPerBook = 5

  seedBooks.forEach((book) => {
    const bookId = crypto.randomUUID()
    const tagId = generateRFIDTagId()

    db.books[bookId] = {
      id: bookId,
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      yearPublished: book.year,
      edition: book.edition,
      category: book.category,
      shelfLocation: book.shelf,
      totalCopies: copiesPerBook,
      availableCopies: copiesPerBook,
      rfidTagId: tagId,
      pdfUrl: book.pdfUrl,
      coverImage: COVER_PLACEHOLDER,
      description: book.description,
      status: "available",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    db.rfidTags[tagId] = {
      id: crypto.randomUUID(),
      tagId,
      bookId,
      isActive: true,
      createdAt: new Date().toISOString(),
    }
  })

  console.log(`[Seed] Database populated: ${Object.keys(db.users).length} users, ${Object.keys(db.books).length} books`)
}
