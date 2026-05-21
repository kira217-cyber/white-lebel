export const selectAuth = (state) => state.auth;

export const selectMasterAdmin = (state) => state.auth.admin;

export const selectMasterToken = (state) => state.auth.token;

export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

export const selectAuthLoading = (state) => state.auth.loading;

export const selectAuthError = (state) => state.auth.error;
