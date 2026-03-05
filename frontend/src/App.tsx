import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./components/dashboard/DashboardPage";
import { DatasetDetailPage } from "./components/dataset/DatasetDetailPage";
import { DatasetListPage } from "./components/dataset/DatasetListPage";
import { JobDetailPage } from "./components/jobs/JobDetail";
import { JobsPage } from "./components/jobs/JobsPage";
import { NewJobPage } from "./components/jobs/NewJobPage";
import { MainLayout } from "./components/layout/MainLayout";
import { SettingsPage } from "./components/settings/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/datasets" element={<DatasetListPage />} />
          <Route path="/datasets/:name" element={<DatasetDetailPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/new" element={<NewJobPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
