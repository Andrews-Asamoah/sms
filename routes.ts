/**
 * The default redirect path after logging in
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT = "/";

/**
 * An array of routes that are accessible to the public
 * These routes do not require authentication
 * @type {string[]}
 */
export const publicRoutes = [
  "/",
  "/new-verification",
  "/about",
  "/contact",
  "/admission",
];

/**
 * An array of routes that are accessible to students only
 * These routes require authentication
 * @type {string[]}
 */
export const studentRoutes = [
  "/",
  "/new-verification",
  "/about",
  "/contact",
  "/admission",
];

/**
 * An array of routes that are accessible to Admin only
 * These routes require authentication
 * @type {string[]}
 */
export const adminRoutes = [
  "/",
  "/new-verification",
  "/about",
  "/contact",
  "/admission",
];

/**
 * An array of routes that are accessible to Teachers only
 * These routes require authentication
 * @type {string[]}
 */
export const teacherRoutes = [
  "/",
  "/new-verification",
  "/about",
  "/contact",
  "/admission",
];

/**
 * An array of routes that are used for authentication
 * These routes will redirect logged in users to the home page
 * @type {string[]}
 */
export const authRoutes = [
  "/login",
  //   "/register",
  "/error",
  "/resetPass",
  "/new-password",
];

/**
 * The prefix for API authentication routes
 * Routes that start with this prefix are used for API
 * authentication purposes.
 * @type {string}
 */
export const apiAuthPrefix = "/api/auth";
