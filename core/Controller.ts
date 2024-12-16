import { Router } from "express";
import Service from "./Service.js";
import { ControllerInit, RequestMethod, Route } from "./types.js";

/**
 * Abstract `Controller` class
 *
 * The `Controller` class provides a structured way to manage routes and their handlers
 * in an Express application. It integrates with a `Service` instance to separate business
 * logic from HTTP handling and supports dynamic route registration with features like
 * middleware, environment scoping, validation, and error handling.
 *
 * Key Features:
 * - Dynamic route registration from a `routes` array.
 * - Middleware support for handlers, validation, and custom error handling.
 * - Environment scoping to conditionally register routes based on `NODE_ENV`.
 * - Lifecycle hook `onRegister` for custom logic during route registration.
 *
 * Usage:
 * Extend this abstract class to create specific controllers for your application.
 * Define the `routes` array in the subclass to configure the controller's routes.
 *
 * @template TargetService - The specific type of `Service` associated with this controller.
 */
export default abstract class Controller<TargetService extends Service = Service> {
    /**
     * The service instance associated with this controller.
     */
    protected service?: TargetService;

    /**
     * The Express router instance used to register routes for this controller.
     */
    protected router: Router;

    /**
     * Initializes the `Controller` instance.
     *
     * @param init - The initialization object containing the service and router.
     */
    constructor(init: ControllerInit<TargetService>) {
        const { service, router } = init;
        this.service = service;
        this.router = router;
    }

    /**
     * The array of routes to be registered by this controller.
     * Subclasses must define this property to specify the controller's routes.
     */
    abstract routes: Route[];

    /**
     * Determines if a given string is a valid HTTP request method.
     *
     * @param method - The string to check.
     * @returns `true` if the string is a valid HTTP method, otherwise `false`.
     */
    private isRequestMethod(method: string): method is RequestMethod {
        return ["get", "post", "put", "patch", "delete", "options"].includes(method) && method in Router;
    }

    /**
     * Registers all routes defined in the `routes` array with the associated router.
     *
     * - Applies validation middleware if `validationFn` is defined.
     * - Supports asynchronous handlers and middleware.
     * - Skips routes that do not match the current environment or fail the `shouldRegister` check.
     * - Logs registered routes for debugging purposes.
     *
     * @throws If an invalid HTTP method is used for a route.
     */
    public async register() {
        this.onRegister?.(); // Lifecycle hook for subclasses

        for (const route of this.routes) {
            const { endpointFn, handlers, validationFn, errorFn, method, path, envScope, shouldRegister } = route;

            // Skip route registration based on custom logic
            if (shouldRegister && !(await shouldRegister())) {
                console.log(`[Controller]: Skipping route: ${method.toUpperCase()} ${path}`);
                continue;
            }

            // Skip route registration if the environment does not match
            if (envScope && envScope !== process.env.NODE_ENV) continue;

            // Validate HTTP method
            if (!this.isRequestMethod(method)) {
                throw new Error(`[Controller]: Method: ${method} is not recognized as an HTTP method`);
            }

            // Await and collect middleware
            const awaitedHandlers = await Promise.all(handlers ?? []);

            // Apply validation middleware
            if (validationFn) {
                awaitedHandlers.unshift(async (req, res, next) => {
                    try {
                        await validationFn(req);
                        next();
                    } catch (error) {
                        next(error);
                    }
                });
            }

            // Log route registration
            console.log(`[Controller]: Registering route: ${method.toUpperCase()} ${path} (Env: ${envScope ?? "all"})`);

            // Register the route with the router
            this.router[method](path, ...awaitedHandlers, async (req, res, next) => {
                try {
                    await endpointFn(req, res, next);
                } catch (error) {
                    if (errorFn) await errorFn(error, req, res, next);
                    next(error);
                }
            });
        }
    }

    /**
     * Lifecycle hook executed before routes are registered.
     * Subclasses can override this method to implement custom logic during registration.
     */
    protected onRegister?(): void;
}
