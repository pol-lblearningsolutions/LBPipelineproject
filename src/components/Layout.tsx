import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Inbox, Users, Briefcase, Settings, Bell, Sun, Moon, ShieldAlert, GripVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';
import { useState, useEffect } from 'react';

export default function Layout() {
  const location = useLocation();
  const { currentUser, setCurrentUser, users } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [navOrder, setNavOrder] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      // Poll for notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      
      // Load custom navigation order
      const savedOrder = localStorage.getItem(`sidebar-order-${currentUser.id}`);
      if (savedOrder) {
        setNavOrder(JSON.parse(savedOrder));
      } else {
        setNavOrder([]);
      }

      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications?user_id=${currentUser.id}`);
      const data = await res.json();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const markNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark notifications read', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const defaultNavigation = [
    { name: 'Overview Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Task Ledger', href: '/ledger', icon: CheckSquare },
    { name: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
    { name: 'Meeting Inbox', href: '/inbox', icon: Inbox },
    { name: 'Team View', href: '/team', icon: Users },
    { name: 'Projects', href: '/projects', icon: Briefcase },
  ];

  if (currentUser?.role?.toLowerCase() === 'admin') {
    defaultNavigation.push({ name: 'Audit Log', href: '/audit-log', icon: ShieldAlert });
  }

  const navigation = [...defaultNavigation].sort((a, b) => {
    const indexA = navOrder.indexOf(a.name);
    const indexB = navOrder.indexOf(b.name);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const handleDragStart = (e: React.DragEvent, name: string) => {
    setDraggedItem(name);
    e.dataTransfer.effectAllowed = 'move';
    // Make the drag image transparent or custom if desired
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetName) return;

    const currentOrder = navigation.map(n => n.name);
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(targetName);

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    setNavOrder(newOrder);
    if (currentUser) {
      localStorage.setItem(`sidebar-order-${currentUser.id}`, JSON.stringify(newOrder));
    }
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors duration-200">
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="font-bold text-lg tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
            <div className="w-6 h-6 bg-primary-600 rounded-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">L&B</span>
            </div>
            Pipeline Tracker
          </div>
          
          <div className="flex items-center gap-1">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && unreadCount > 0) {
                    markNotificationsRead();
                  }
                }}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 relative transition"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700 font-medium text-sm text-gray-900 dark:text-white">Notifications</div>
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">No notifications</div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {notifications.map(n => (
                        <div key={n.id} className={cn("p-3 text-sm", !n.read ? "bg-primary-50 dark:bg-primary-900/20" : "")}>
                          <p className="text-gray-900 dark:text-gray-100">{n.message}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const isDragging = draggedItem === item.name;
              
              return (
                <div
                  key={item.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.name)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.name)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center group relative rounded-md transition-all duration-200",
                    isDragging ? "opacity-50 scale-95" : "opacity-100 scale-100"
                  )}
                >
                  <div className="absolute left-0 top-0 bottom-0 flex items-center pl-1 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity">
                    <GripVertical className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors flex-1 ml-4",
                      isActive 
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" 
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive ? "text-primary-600 dark:text-primary-400" : "text-gray-400 dark:text-gray-500")} />
                    {item.name}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current User</label>
            <select 
              className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              value={currentUser?.id || ''}
              onChange={(e) => {
                const user = users.find(u => u.id === e.target.value);
                if (user) setCurrentUser(user);
              }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
