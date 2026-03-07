import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import MainLayout from "../layout/MainLayout.jsx";
import PageNotFound from "../pages/PageNotFound.jsx";
import AdminProtectedRoute from "./AdminProtectedRoute.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import ForgotPasswordPage from "../pages/ForgotPasswordPage.jsx";
import AdminHomePage from "../pages/AdminHomePage.jsx";
import UserHomePage from "../pages/UserHomePage.jsx";
import StaffHomePage from "../pages/StaffHomePage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      { index: true, element: <UserHomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      {
        path: "admin/login",
        element: <LoginPage isAdmin />,
      },
      {
        path: "admin",
        element: (
          <AdminProtectedRoute>
            <AdminHomePage />
          </AdminProtectedRoute>
        ),
      },
      {
        path: "user",
        element: <UserHomePage />,
      },
      {
        path: "staff",
        element: <StaffHomePage />,
      },
      { path: "*", element: <PageNotFound /> },
    ],
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
