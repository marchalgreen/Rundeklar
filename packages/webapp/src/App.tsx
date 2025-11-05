import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import PlayersPage from './routes/Players'
import CheckInPage from './routes/CheckIn'
import CoachPage from './routes/Coach'
import { SidebarItem } from './components/navigation/SidebarItem'
import { Search, UsersRound, Grid2x2 } from 'lucide-react'

const navItems = [
  { to: '/check-in', label: 'Check ind', icon: <Search size={18} /> },
  { to: '/coach', label: 'Kampprogram', icon: <Grid2x2 size={18} /> },
  { to: '/players', label: 'Spillere', icon: <UsersRound size={18} /> }
]

const Header = () => {
  const location = useLocation()
  return (
    <header className="relative flex items-center ring-1 ring-[hsl(var(--line)/.12)] bg-[hsl(var(--surface)/.7)] px-6 py-4 backdrop-blur shadow-[inset_0_-1px_0_hsl(var(--line)/.08)]">
      <div className="flex items-center gap-3 flex-shrink-0 w-[180px]">
        <img src="/logo.jpeg" alt="Herlev/Hjorten" className="h-11 w-11 rounded-full ring-1 ring-[hsl(var(--line)/.2)] object-cover" />
        <p className="text-base font-semibold uppercase tracking-wide text-[hsl(var(--foreground))] whitespace-nowrap">Herlev/Hjorten</p>
      </div>
      <nav aria-label="Primær navigation" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3">
        <SidebarItem to="/check-in" icon={<Search />} label="Check ind" />
        <SidebarItem to="/coach" icon={<Grid2x2 />} label="Kampprogram" />
        <SidebarItem to="/players" icon={<UsersRound />} label="Spillere" />
      </nav>
      <div className="flex-shrink-0 w-[180px]" aria-hidden="true">
        {/* Spacer to balance the left side */}
      </div>
    </header>
  )
}

const App = () => {
  return (
    <HashRouter>
      <div className="flex min-h-screen flex-col text-[hsl(var(--foreground))]">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="flex w-full flex-col gap-6 px-6 pb-10 pt-6 md:px-8 lg:px-12">
            <Routes>
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/check-in" element={<CheckInPage />} />
              <Route path="/coach" element={<CoachPage />} />
              <Route path="*" element={<Navigate to="/check-in" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  )
}

export default App
