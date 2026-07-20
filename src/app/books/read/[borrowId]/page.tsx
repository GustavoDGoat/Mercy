import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getBorrowedBookData } from "./actions"

export default async function ReadBookPage({
  params,
}: {
  params: Promise<{ borrowId: string }>
}) {
  const { borrowId } = await params

  let data: { title: string; author: string; pdfUrl: string } | null = null
  let error: string | null = null

  try {
    data = await getBorrowedBookData(borrowId)
  } catch (e: unknown) {
    error = (e as Error).message
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto px-6">
          <p className="text-lg font-medium text-destructive">Book unavailable</p>
          <p className="text-muted-foreground">{error}</p>
          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center gap-4 px-6 py-4 border-b shrink-0">
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">{data.title}</h1>
          <p className="text-sm text-muted-foreground truncate">{data.author}</p>
        </div>
      </header>

      <div className="flex-1 min-h-0">
        <iframe
          src={data.pdfUrl}
          className="w-full h-full border-0"
          title={data.title}
        />
      </div>
    </div>
  )
}
