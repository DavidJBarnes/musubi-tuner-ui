import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ConfigPage } from "./components/config/ConfigPage";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { DatasetPage } from "./components/dataset/DatasetPage";
import { JobDetailPage } from "./components/jobs/JobDetail";
import { JobsPage } from "./components/jobs/JobsPage";
import { MainLayout } from "./components/layout/MainLayout";
import { SettingsPage } from "./components/settings/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/datasets" element={<DatasetPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
