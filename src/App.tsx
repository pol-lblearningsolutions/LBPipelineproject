import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TodayLedger from './pages/TodayLedger';
import TeamView from './pages/TeamView';
import MyTasks from './pages/MyTasks';
import MeetingInbox from './pages/MeetingInbox';
import Projects from './pages/Projects';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="ledger" element={<TodayLedger />} />
            <Route path="team" element={<TeamView />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="inbox" element={<MeetingInbox />} />
            <Route path="projects" element={<Projects />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
