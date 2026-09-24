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
import CxGameCategory from "../pages/CxGameRelatedPages/CxGameCategory";
import CxGameProvider from "../pages/CxGameRelatedPages/CxGameProvider";
import CxGame from "../pages/CxGameRelatedPages/CxGame";
import CxPopularGame from "../pages/CxGameRelatedPages/CxPopularGame";
import CxSpotsGame from "../pages/CxGameRelatedPages/CxSpotsGame";
import CxHotGame from "../pages/CxGameRelatedPages/CxHotGame";

import BcGameCategory from "../pages/BcGameRelatedPages/BcGameCategory";
import BcGameProvider from "../pages/BcGameRelatedPages/BcGameProvider";
import BcGame from "../pages/BcGameRelatedPages/BcGame";
import BcSpotsGame from "../pages/BcGameRelatedPages/BcSpotsGame";
import BcFeaturedGame from "../pages/BcGameRelatedPages/BcFeaturedGame";

import TbGameCategory from "../pages/TbGameRelatedPages/TbGameCategory";
import TbGameProvider from "../pages/TbGameRelatedPages/TbGameProvider";
import TbGame from "../pages/TbGameRelatedPages/TbGame";
import TbHotGame from "../pages/TbGameRelatedPages/TbHotGame";

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

          {
            path: "cx-add-category",
            element: <CxGameCategory />,
          },
          {
            path: "cx-add-provider",
            element: <CxGameProvider />,
          },
          {
            path: "cx-add-game",
            element: <CxGame />,
          },
          {
            path: "cx-add-popular-game",
            element: <CxPopularGame />,
          },
          {
            path: "cx-add-sports",
            element: <CxSpotsGame />,
          },
          {
            path: "cx-add-hot-game",
            element: <CxHotGame />,
          },

          // ── BetChokkor ──
          {
            path: "bc-add-category",
            element: <BcGameCategory />,
          },
          {
            path: "bc-add-provider",
            element: <BcGameProvider />,
          },
          {
            path: "bc-add-game",
            element: <BcGame />,
          },
          {
            path: "bc-add-sports",
            element: <BcSpotsGame />,
          },
          {
            path: "bc-add-featured-game",
            element: <BcFeaturedGame />,
          },
          {
            path: "tb-add-category",
            element: <TbGameCategory />,
          },
          {
            path: "tb-add-provider",
            element: <TbGameProvider />,
          },
          {
            path: "tb-add-game",
            element: <TbGame />,
          },
          {
            path: "tb-hot-games",
            element: <TbHotGame key="hot" list="hot" />,
          },
          {
            path: "tb-favorite-games",
            element: <TbHotGame key="favorite" list="favorite" />,
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
