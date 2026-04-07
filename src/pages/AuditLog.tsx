import { useState, useEffect } from 'react';
import { ShieldAlert, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useUser } from '../context/UserContext';

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string | null;
  created_at: string;
  user: {
    full_name: string;
  } | null;
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useUser();

  useEffect(() => {
    if (currentUser?.role?.toLowerCase() === 'admin') {
      fetchLogs();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs', {
        headers: {
          'x-user-id': currentUser?.id || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading audit logs...</div>;

  if (currentUser?.role?.toLowerCase() !== 'admin') {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400">You must be an administrator to view the audit log.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full h-full flex flex-col transition-colors duration-200">
      <div className="mb-8 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" />
          Audit Log
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Track significant user actions across the platform.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium w-48">
                  <div className="resize-x overflow-hidden min-w-[6rem]">Timestamp</div>
                </th>
                <th className="px-4 py-3 font-medium w-48">
                  <div className="resize-x overflow-hidden min-w-[6rem]">User</div>
                </th>
                <th className="px-4 py-3 font-medium w-48">
                  <div className="resize-x overflow-hidden min-w-[6rem]">Action</div>
                </th>
                <th className="px-4 py-3 font-medium w-32">
                  <div className="resize-x overflow-hidden min-w-[6rem]">Entity Type</div>
                </th>
                <th className="px-4 py-3 font-medium">
                  <div className="resize-x overflow-hidden min-w-[6rem]">Details</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {log.user?.full_name || 'System / Unknown'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      log.action.includes('DELETE') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                      log.action.includes('CREATE') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      log.action.includes('ROLE') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {log.entity_type}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs truncate max-w-md" title={log.details || ''}>
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
