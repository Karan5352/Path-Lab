import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Arena } from "./pages/Arena";
import { Editor } from "./pages/Editor";
import { MazeEditor } from "./pages/MazeEditor";
import { Guide } from "./pages/Guide";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/arena" element={<Arena />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/maze-editor" element={<MazeEditor />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="*" element={<Landing />} />
      </Route>
    </Routes>
  );
}
