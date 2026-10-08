import { Route, Routes } from "react-router-dom";
import { routes } from "@/config/routes";
import { AppOpening } from "@/components/app-motion";

export default function App() {
  return (
    <>
      <AppOpening />
      <Routes>
        {routes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
      </Routes>
    </>
  );
}
