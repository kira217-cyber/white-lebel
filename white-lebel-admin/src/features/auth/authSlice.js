import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../../api/axios";

const savedToken = localStorage.getItem("masterToken");
const savedAdmin = localStorage.getItem("masterAdmin");

const initialState = {
  admin: savedAdmin ? JSON.parse(savedAdmin) : null,
  token: savedToken || null,
  isAuthenticated: Boolean(savedToken),
  loading: false,
  error: null,
};

export const loginMasterAdmin = createAsyncThunk(
  "auth/loginMasterAdmin",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post("/api/master/auth/login", {
        email,
        password,
      });

      return res.data?.data;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || "Login failed");
    }
  },
);

export const fetchMasterProfile = createAsyncThunk(
  "auth/fetchMasterProfile",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/api/master/auth/me");
      return res.data?.data?.admin;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to fetch profile",
      );
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logoutMasterAdmin: (state) => {
      state.admin = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;

      localStorage.removeItem("masterToken");
      localStorage.removeItem("masterAdmin");
    },

    clearAuthError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loginMasterAdmin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginMasterAdmin.fulfilled, (state, action) => {
        const { admin, token } = action.payload || {};

        state.loading = false;
        state.admin = admin;
        state.token = token;
        state.isAuthenticated = true;
        state.error = null;

        localStorage.setItem("masterToken", token);
        localStorage.setItem("masterAdmin", JSON.stringify(admin));
      })
      .addCase(loginMasterAdmin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed";
        state.isAuthenticated = false;
      })

      .addCase(fetchMasterProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMasterProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.admin = action.payload;
        state.isAuthenticated = true;

        localStorage.setItem("masterAdmin", JSON.stringify(action.payload));
      })
      .addCase(fetchMasterProfile.rejected, (state) => {
        state.loading = false;
        state.admin = null;
        state.token = null;
        state.isAuthenticated = false;

        localStorage.removeItem("masterToken");
        localStorage.removeItem("masterAdmin");
      });
  },
});

export const { logoutMasterAdmin, clearAuthError } = authSlice.actions;

export default authSlice.reducer;
