/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activationAdmin from "../activationAdmin.js";
import type * as auth from "../auth.js";
import type * as bookings from "../bookings.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as lib_authz from "../lib/authz.js";
import type * as onboarding from "../onboarding.js";
import type * as organizations from "../organizations.js";
import type * as platform from "../platform.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activationAdmin: typeof activationAdmin;
  auth: typeof auth;
  bookings: typeof bookings;
  http: typeof http;
  identity: typeof identity;
  "lib/authz": typeof lib_authz;
  onboarding: typeof onboarding;
  organizations: typeof organizations;
  platform: typeof platform;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
