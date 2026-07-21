export interface SeedBook {
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

export const seedBooks: SeedBook[] = [
  // ============================================================
  // COMPUTER SCIENCE — Original Seed (5)
  // ============================================================
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
    description: "An introduction to Python programming for beginners, covering fundamental computer science concepts.",
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
    description: "A highly accessible introduction to Common Lisp programming.",
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
    description: "A comprehensive introduction to discrete mathematics for computer science students.",
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
    description: "An open textbook covering the design and implementation of fundamental data structures in Java.",
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
    description: "The original introductory programming text that spawned the Think Python series.",
  },

  // ============================================================
  // COMPUTER SCIENCE — User-Provided (9)
  // ============================================================
  {
    isbn: "978-0-981531-64-9",
    title: "Programming in Scala",
    author: "Martin Odersky, Lex Spoon, Bill Venners",
    publisher: "Artima Press",
    year: 2019,
    edition: "4th Edition",
    category: "Computer Science",
    shelf: "CS-C1",
    pdfUrl: "https://www.scala-lang.org/docu/files/ProgrammingInScala-2.4.pdf",
    description: "A comprehensive guide to the Scala programming language by its creator, covering functional and object-oriented paradigms.",
  },
  {
    isbn: "978-0-521-88038-7",
    title: "Concepts of Programming Languages",
    author: "Robert W. Sebesta",
    publisher: "Pearson",
    year: 2019,
    edition: "11th Edition",
    category: "Computer Science",
    shelf: "CS-C2",
    pdfUrl: "https://www.ime.usp.br/~alvaroma/ucsp/proglang/book.pdf",
    description: "In-depth analysis of the fundamental concepts underlying programming language design and implementation.",
  },
  {
    isbn: "978-0-13-444823-7",
    title: "Complete Guide to C++",
    author: "Bjarne Stroustrup",
    publisher: "Addison-Wesley",
    year: 2018,
    edition: "4th Edition",
    category: "Computer Science",
    shelf: "CS-C3",
    pdfUrl: "https://www.ime.usp.br/~alvaroma/ucsp/proglang/book.pdf",
    description: "Comprehensive reference and tutorial for the C++ programming language from its creator.",
  },
  {
    isbn: "978-1-4842-1234-8",
    title: "Coding for Beginners",
    author: "Mike McGrath",
    publisher: "In Easy Steps",
    year: 2022,
    edition: "2nd Edition",
    category: "Computer Science",
    shelf: "CS-D1",
    pdfUrl: "https://dl.ojocv.gov.et/admin_/book/coding-for-beginners-in-easy-steps-basic-programming-for-all-ages.pdf",
    description: "Gentle introduction to programming fundamentals for absolute beginners — covers basic concepts for all ages.",
  },
  {
    isbn: "978-1-59327-928-8",
    title: "Practical Python Programming",
    author: "David Beazley",
    publisher: "Addison-Wesley",
    year: 2021,
    edition: "1st Edition",
    category: "Computer Science",
    shelf: "CS-D2",
    pdfUrl: "https://soclibrary.futa.edu.ng/books/Python-Programming123uo00es0418.pdf",
    description: "Hands-on Python programming guide covering real-world applications, data structures, and automation.",
  },
  {
    isbn: "978-0-321-53711-9",
    title: "Introduction to Computers and Programming",
    author: "John S. Conery",
    publisher: "Pearson",
    year: 2020,
    edition: "3rd Edition",
    category: "Computer Science",
    shelf: "CS-D3",
    pdfUrl: "https://www.pearsonhighered.com/assets/samplechapter/0/3/2/1/0321537114.pdf",
    description: "Introductory text covering computer architecture, algorithms, and programming fundamentals.",
  },
  {
    isbn: "978-0-321-63537-2",
    title: "Elements of Programming",
    author: "Alexander Stepanov, Paul McJones",
    publisher: "Addison-Wesley",
    year: 2019,
    edition: "1st Edition",
    category: "Computer Science",
    shelf: "CS-E1",
    pdfUrl: "https://www.elementsofprogramming.com/eop.pdf",
    description: "A rigorous mathematical foundation for programming — decomposing programs into their fundamental algorithmic components.",
  },
  {
    isbn: "978-3-319-72547-5",
    title: "Competitive Programming",
    author: "Antti Laaksonen",
    publisher: "Springer",
    year: 2020,
    edition: "1st Edition",
    category: "Computer Science",
    shelf: "CS-E2",
    pdfUrl: "https://cses.fi/book/book.pdf",
    description: "Guide to algorithmic problem-solving for programming contests — covers data structures, graph algorithms, and advanced techniques.",
  },
  {
    isbn: "978-0-262-04118-8",
    title: "Principles of Programming",
    author: "Scott F. Smith",
    publisher: "Johns Hopkins University",
    year: 2021,
    edition: "1st Edition",
    category: "Computer Science",
    shelf: "CS-E3",
    pdfUrl: "https://pl.cs.jhu.edu/pl/book/book.pdf",
    description: "Foundational text on programming language theory covering operational semantics, type systems, and language design principles.",
  },

  // ============================================================
  // MEDICINE — Original Seed (2)
  // ============================================================
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
    description: "A comprehensive introduction to the structure and function of the human body.",
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
    description: "An introductory guide to medical microbiology covering bacteria, viruses, fungi, and parasites.",
  },

  // ============================================================
  // FINANCE — Original Seed (2)
  // ============================================================
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
    description: "A rigorous introduction to financial accounting principles.",
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
    description: "A comprehensive introduction to microeconomics and macroeconomics.",
  },

  // ============================================================
  // CHEMISTRY — User-Provided (2)
  // ============================================================
  {
    isbn: "978-1-947172-91-3",
    title: "Introduction to Chemistry",
    author: "Tracy Poulsen",
    publisher: "University of North Georgia Press",
    year: 2019,
    edition: "1st Edition",
    category: "Chemistry",
    shelf: "CHM-A1",
    pdfUrl: "https://web.ung.edu/media/Chemistry2/Chemistry-LR.pdf",
    description: "Comprehensive introductory chemistry textbook covering atomic structure, bonding, reactions, and stoichiometry.",
  },
  {
    isbn: "978-0-19-913878-1",
    title: "Complete Chemistry for IGCSE",
    author: "RoseMarie Gallagher, Paul Ingram",
    publisher: "Oxford University Press",
    year: 2016,
    edition: "3rd Edition",
    category: "Chemistry",
    shelf: "CHM-A2",
    pdfUrl: "https://ismailabdi.files.wordpress.com/2016/12/complete-chemistry-for-cambridge-igcse.pdf",
    description: "Complete coverage of the Cambridge IGCSE Chemistry syllabus — clear explanations, worked examples, and exam practice.",
  },
]
