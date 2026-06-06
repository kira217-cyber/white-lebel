import { createBrowserRouter, Navigate } from "react-router";

import RootLayout from "../RootLayout/RootLayout";
import Home from "../pages/Home/Home";
import Login from "../pages/Login/Login";
import Dashboard from "../pages/Dashboard/Dashboard";
import NotFoundPage from "../pages/NotFoundPage/NotFoundPage";

import PrivateRoute from "../PrivateRoute/PrivateRoute";
import Profile from "../pages/Profile/Profile";
import AddSite from "../pages/AddSite/AddSite";
import AllSite from "../pages/AllSite/AllSite";
import RBAddGame from "../pages/RBGameRelatedPages/RBAddGame";
import RBAddLiveGame from "../pages/RBGameRelatedPages/RBAddLiveGame";
import RBAddProvider from "../pages/RBGameRelatedPages/RBAddProvider";
import RBAddCategory from "../pages/RBGameRelatedPages/RBAddCategory";
import MyGpAddCategory from "../pages/MyGpGameRelatedPages/MyGpAddCategory";
import MyGpAddGame from "../pages/MyGpGameRelatedPages/MyGpAddGame";
import MyGpAddSports from "../pages/MyGpGameRelatedPages/MyGpAddSports";
import MyGpAddProvider from "../pages/MyGpGameRelatedPages/MyGpAddProvider";

export const routes = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
    errorElement: <NotFoundPage />,
  },
  {
    path: "/",
    element: <PrivateRoute />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "home",
            element: <Home />,
          },
          {
            path: "profile",
            element: <Profile />,
          },
          {
            path: "add-site",
            element: <AddSite />,
          },
          {
            path: "all-site",
            element: <AllSite />,
          },
          {
            path: "rb-add-game",
            element: <RBAddGame />,
          },
          {
            path: "rb-add-live-game",
            element: <RBAddLiveGame />,
          },
          {
            path: "rb-add-provider",
            element: <RBAddProvider />,
          },
          {
            path: "rb-add-category",
            element: <RBAddCategory />,
          },
          {
            path: "my-gp-add-category",
            element: <MyGpAddCategory />,
          },
          {
            path: "my-gp-add-provider",
            element: <MyGpAddProvider />,
          },
          {
            path: "my-gp-add-game",
            element: <MyGpAddGame />,
          },
          {
            path: "my-gp-add-sports",
            element: <MyGpAddSports />,
          },
        ],
      },
    ],
  },

  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
