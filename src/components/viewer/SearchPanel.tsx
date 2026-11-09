import React, { useState } from 'react'
import { Search, Loader2, ArrowRight, FileText } from 'lucide-react'
import { useDocumentStore } from '@/stores/useDocumentStore'
import { useNavigate } from 'react-router-dom'

interface SearchMatch {
  id: string
  pageNumber: number
  snippet: string
}

export const SearchPanel: React.FC = () => {
  const navigate = useNavigate()
  const { pdfDoc, numPages, setCurrentPage, currentPage } = useDocumentStore()
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchMatch[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!pdfDoc || !query.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    const matches: SearchMatch[] = []
    const lowerQuery = query.toLowerCase().trim()

    try {
      for (let p = 1; p <= numPages; p++) {
        const page = await pdfDoc.getPage(p)
        const textContent = await page.getTextContent()
        const fullText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')

        const lowerFull = fullText.toLowerCase()
        let startIndex = 0

        while (startIndex < lowerFull.length) {
          const foundIdx = lowerFull.indexOf(lowerQuery, startIndex)
          if (foundIdx === -1) break

          // Extract surrounding snippet (40 chars before and after)
          const snippetStart = Math.max(0, foundIdx - 40)
          const snippetEnd = Math.min(fullText.length, foundIdx + lowerQuery.length + 40)
          const snippet =
            (snippetStart > 0 ? '...' : '') +
            fullText.slice(snippetStart, snippetEnd).trim() +
            (snippetEnd < fullText.length ? '...' : '')

          matches.push({
            id: `${p}_${foundIdx}`,
            pageNumber: p,
            snippet,
          })

          startIndex = foundIdx + lowerQuery.length
        }
      }

      setResults(matches)
    } catch (err) {
      console.error('Search failed', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleJumpToPage = (pageNum: number) => {
    setCurrentPage(pageNum)
    navigate('/viewer')
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          placeholder="Search text in document..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
        {isSearching && (
          <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin absolute right-2.5 top-2.5" />
        )}
      </form>

      {/* Results Header */}
      {hasSearched && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
          <span>
            {results.length} {results.length === 1 ? 'result' : 'results'} found
          </span>
          {results.length > 0 && <span>Click to jump</span>}
        </div>
      )}

      {/* Results List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {results.map((res) => {
          const isCurrent = currentPage === res.pageNumber
          return (
            <div
              key={res.id}
              onClick={() => handleJumpToPage(res.pageNumber)}
              className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all text-xs group ${
                isCurrent
                  ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/40'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-1.5 py-0.5 rounded">
                  Page {res.pageNumber}
                </span>
                <ArrowRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {res.snippet}
              </p>
            </div>
          )
        })}

        {hasSearched && results.length === 0 && !isSearching && (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No Matches Found
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              No matches found for "{query}". Try another keyword.
            </p>
          </div>
        )}

        {!hasSearched && (
          <div className="text-center py-8 text-slate-400 text-xs">
            <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="font-medium text-slate-500">Document Search</p>
            <p className="text-[11px] mt-1">
              Type a word or phrase above to search across all {numPages} pages.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
