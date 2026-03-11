import { useState } from "react"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContextHook"
import { Bell, ChevronDown, ChevronRight, Globe, Home, LayoutGrid, Menu, Moon, Search, Sun, X, LogOut } from "lucide-react"

function IconBtn({ children, className = "", badge = false, onClick, title = "" }) {
     return (
          <button
               onClick={onClick}
               title={title}
               className={`relative p-1 rounded hover:bg-slate-200/50 dark:hover:bg-white/10 ${className}`}>
               {children}
               {badge && <span
                    className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#1a1f2e]" />}
          </button>
     )
}

export default function Navbar({ setCollapsed }) {
     const { dark, setDark } = useTheme()
     const { user, logout } = useAuth()
     const [showMenu, setShowMenu] = useState(false)

     return (
          <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-6 py-3 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200/60 dark:border-white/5">
               <div className="flex items-center gap-4">
                    <IconBtn onClick={() => setCollapsed(c => !c)} title="toggle sidebar" className="hover:bg-slate-100 dark:hover:bg-slate-800">
                         <Menu size={20} />
                    </IconBtn>

                    {/* ... rest of left side ... */}
               </div>

               <div className="flex items-center gap-1.5 ml-auto">
                    {/* ... theme and other buttons ... */}
                    <IconBtn onClick={() => setDark(dark === "light" ? "dark" : "light")} title="toggle theme">
                         {dark === "dark" ? <Sun size={20} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
                    </IconBtn>

                    <IconBtn title="Language" className="hidden sm:flex">
                         <Globe size={19} className="text-slate-600 dark:text-slate-400" />
                    </IconBtn>

                    <IconBtn badge title="Notifications">
                         <Bell size={19} className="text-slate-600 dark:text-slate-400" />
                    </IconBtn>

                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-2" />

                    <div className="relative">
                         <button 
                              onClick={() => setShowMenu(!showMenu)}
                              className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                         >
                              <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] text-white font-bold shadow-sm uppercase">
                                   {user?.name?.slice(0, 2) || "SK"}
                              </div>
                              <div className="text-left hidden lg:block">
                                   <p className="text-xs font-bold dark:text-slate-200">{user?.name || "Saad Kabir"}</p>
                                   <p className="text-[10px] text-slate-500 font-medium capitalize">{user?.role || "System Admin"}</p>
                              </div>
                              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                         </button>

                         {showMenu && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                   <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 mb-2">
                                        <p className="text-xs font-bold dark:text-white truncate">{user?.email}</p>
                                   </div>
                                   <button 
                                        onClick={logout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                   >
                                        <LogOut size={16} />
                                        <span>Logout</span>
                                   </button>
                              </div>
                         )}
                    </div>
               </div>
          </header>
     )
}