import { Suspense, lazy, type FC } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoadingFallback } from '@/components/ui/LoadingFallback'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// Lazy-loaded code-split page chunks for optimal performance
const HomePage = lazy(() =>
  import('@/pages/HomePage').then((m) => ({ default: m.HomePage }))
)
const ViewerPage = lazy(() =>
  import('@/pages/ViewerPage').then((m) => ({ default: m.ViewerPage }))
)
const OrganizePage = lazy(() =>
  import('@/pages/OrganizePage').then((m) => ({ default: m.OrganizePage }))
)
const EditPage = lazy(() =>
  import('@/pages/EditPage').then((m) => ({ default: m.EditPage }))
)
const StampPage = lazy(() =>
  import('@/pages/StampPage').then((m) => ({ default: m.StampPage }))
)
const ConvertPage = lazy(() =>
  import('@/pages/ConvertPage').then((m) => ({ default: m.ConvertPage }))
)
const FinishPage = lazy(() =>
  import('@/pages/FinishPage').then((m) => ({ default: m.FinishPage }))
)
const AdvancedPage = lazy(() =>
  import('@/pages/AdvancedPage').then((m) => ({ default: m.AdvancedPage }))
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
)

export const App: FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary fallbackTitle="Application Shell Error">
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route
              index
              element={
                <Suspense fallback={<LoadingFallback message="Loading Home Dashboard..." />}>
                  <HomePage />
                </Suspense>
              }
            />
            <Route
              path="viewer"
              element={
                <Suspense fallback={<LoadingFallback message="Initializing PDF Viewer..." />}>
                  <ViewerPage />
                </Suspense>
              }
            />
            <Route
              path="organize"
              element={
                <Suspense fallback={<LoadingFallback message="Loading Organize Tools..." />}>
                  <OrganizePage />
                </Suspense>
              }
            />
            <Route
              path="edit"
              element={
                <Suspense fallback={<LoadingFallback message="Loading Editor Canvas..." />}>
                  <EditPage />
                </Suspense>
              }
            />
            <Route
              path="stamp"
              element={
                <Suspense fallback={<LoadingFallback message="Loading Stamp & Watermark Studio..." />}>
                  <StampPage />
                </Suspense>
              }
            />
            <Route
              path="convert"
              element={
                <Suspense fallback={<LoadingFallback message="Loading Conversion Hub..." />}>
                  <ConvertPage />
                </Suspense>
              }
            />
            <Route
              path="finish"
              element={
                <Suspense fallback={<LoadingFallback message="Loading Optimization Suite..." />}>
                  <FinishPage />
                </Suspense>
              }
            />
            <Route
              path="advanced"
              element={
                <Suspense fallback={<LoadingFallback message="Loading Advanced Features..." />}>
                  <AdvancedPage />
                </Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <Suspense fallback={<LoadingFallback message="Loading Preferences..." />}>
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App
