import { Connect, createServer, InlineConfig, ViteDevServer } from "vite";

/**
 * Vite Development Server (VDS) Class
 *
 * This class is designed to manage the lifecycle of the Vite development server 
 * in middleware mode. It supports transforming dynamic HTML templates, providing 
 * middleware for integration with an Express server, and ensuring proper cleanup 
 * during application shutdown.
 *
 * Features:
 * - Dynamically transforms HTML templates for development mode.
 * - Provides Connect-compatible middleware for seamless server integration.
 * - Ensures a single ViteDevServer instance is created and shared across operations.
 * - Includes lifecycle management for proper startup and shutdown.
 *
 * Usage:
 * 1. Pass an HTML template string and optional custom Vite configuration to the constructor.
 * 2. Use `getMiddleware()` for integrating with an Express server.
 * 3. Use `transformTemplate(targetURL)` to dynamically transform the HTML for a given URL.
 * 4. Shutdown gracefully using `shutdownVDS()`.
 *
 * Example:
 * ```typescript
 * import VDS from './VDS';
 *
 * const htmlTemplate = `
 * <!DOCTYPE html>
 * <html>
 *   <head><title>Vite App</title></head>
 *   <body><div id="root"></div></body>
 * </html>
 * `;
 *
 * const vds = new VDS(htmlTemplate);
 * const middleware = await vds.getMiddleware();
 * app.use(middleware); // Integrate with Express
 * ```
 */
export default class VDS {
    private promiseVDS: Promise<ViteDevServer> | null = null;
    private instanceVDS: ViteDevServer | null = null;

    private readonly configVDS: InlineConfig;

    /**
     * Constructor to initialize the VDS instance.
     *
     * @param template - The dynamic HTML template as a string.
     * @param customConfig - Optional custom Vite configuration.
     */
    constructor(private template: string, customConfig: InlineConfig = {}) {
        this.configVDS = {
            ...customConfig,
            root: customConfig.root || process.cwd(),
            server: {
                middlewareMode: true,
                ...customConfig.server,
            },
        };

        process.on("exit", () => this.shutdownVDS().catch(() => { }));
        process.on("SIGINT", () => this.shutdownVDS().catch(() => process.exit(1)));
    }

    /**
     * Ensures a single instance of ViteDevServer is created.
     *
     * @returns A Promise resolving to the ViteDevServer instance.
     */
    private async getVDS(): Promise<ViteDevServer> {
        if (this.instanceVDS) return this.instanceVDS;

        if (this.promiseVDS) {
            console.log("ViteDevServer is being initialized. Awaiting existing promise.");
            return this.promiseVDS;
        }

        console.log("Creating new ViteDevServer instance.");

        this.promiseVDS = createServer(this.configVDS)

            .then((server) => {
                this.instanceVDS = server;
                return server;
            })

            .catch((error) => {
                this.instanceVDS = null;
                console.error(`Failed to create ViteDevServer: ${(error as Error).message}`);
                throw error;
            });

        return this.promiseVDS;
    }

    /**
     * Transforms the provided HTML template using ViteDevServer.
     *
     * @param targetURL - The target URL for transforming the template.
     * @returns A Promise resolving to the transformed HTML template.
     */
    public async transformTemplate(targetURL: string): Promise<string> { return (await this.getVDS()).transformIndexHtml(targetURL, this.template) }

    /**
     * Returns the Vite middleware for integration with an Express server.
     *
     * @returns A Promise resolving to the Connect-compatible middleware.
     */
    public async getMiddleware(): Promise<Connect.Server> { return (await this.getVDS()).middlewares }

    /**
     * Fixes stack traces for SSR errors in development mode.
     *
     * @param error - The error to fix the stack trace for.
     */
    public async errorVDS(error: Error): Promise<void> { (await this.getVDS()).ssrFixStacktrace(error) }

    /**
     * Gracefully shuts down the ViteDevServer instance.
     */
    public async shutdownVDS(): Promise<void> {
        console.log(`[VDS]: Attempting to shut down ViteDevServer...`);
        if (!this.instanceVDS) {
            console.log(`[VDS]: ViteDevServer is already shut down.`);
            return;
        }

        try {
            await this.instanceVDS.close();
            console.log(`[VDS]: ViteDevServer has been shut down successfully.`);
        } catch (error) {
            console.error(`[VDS]: Error shutting down ViteDevServer:`, error);
        } finally {
            this.instanceVDS = null;
            this.promiseVDS = null;
        }
    }
}
