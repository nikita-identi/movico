import express, { Router as ExpressRouter, NextFunction, Request, Response } from 'express';
import { RouterInit, ViewMap } from './types';
import Controller from './Controller';
import { CoreController } from './CoreController';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { createElement } from 'react';
import { Server } from 'http';

export default class AppRouter {
    private expressRouter: ExpressRouter;

    private coreController: CoreController;
    private controllers: Controller[];
    private viewMap: ViewMap;

    private template: string = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Movico App</title></head><body><div id="root"></div><script type="module" src="/main.js"></script></body></html>`;

    constructor(init: RouterInit) {
        this.expressRouter = express.Router();
        this.coreController = new CoreController(
            this.expressRouter,
            this.template,
            init.customVDSConfig
        );

        this.controllers = init.controllers;
        this.viewMap = init.viewMap;
    }

    /**
     * Returns the underlying Express Router instance.
     */
    public getRouter(): ExpressRouter { return this.expressRouter }

    /**
     * Registers CoreController for production or development serving.
     */
    private async registerServing() {
        try { await this.coreController.register() }
        catch (error) { console.error('[Router]: Failed to register CoreController:', error) }
    }

    /**
     * Registers API controllers and their routes.
     */
    private async registerControllers() {
        try {
            for (const controller of this.controllers) {
                await controller.register();
                console.log(`[Router]: Registered API controller`);
            }
        }

        catch (error) { console.error('[Router]: Failed to register controllers:', error) }
    }

    /**
     * Registers React components for view rendering based on the View Map.
     */
    private registerViews() {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[Router]: Skipping view rendering in development mode (Vite handles it).`);
            return;
        }
    
        for (const [path, Component] of Object.entries(this.viewMap)) {
            console.log(`[Router]: Registering view for path: ${path}`);
            this.expressRouter.get(path, (req: Request, res: Response, next: NextFunction) => {
                try {
                    const HTML = ReactDOMServer.renderToString(
                        createElement(StaticRouter, { location: req.url }, createElement(Component))
                    );
                    const page = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Movico App</title></head><body><div id="root">${HTML}</div><script type="module" src="/main.js"></script></body></html>`;
                    res.status(200).send(page);
                } catch (error) {
                    console.error(`[Router]: Error rendering view for path ${path}:`, error);
                    next(error);
                }
            });
        }
    }

    /**
     * Registers a fallback route for unmatched paths.
     */
    private registerFallback() {
        this.expressRouter.use((req: Request, res: Response) => {
            res.status(404).send(`<!DOCTYPE html><html lang="en"><head><title>404 - Not Found</title></head><body><h1>404 - Page Not Found</h1></body></html>`);
        });
    }

    /**
     * Initializes all routes: API routes, CoreController, views, and fallback.
     */
    public async initialize() {
        console.log('[AppRouter]: Initializing controllers and views...');
        await this.registerControllers();
        console.log('[AppRouter]: Controllers registered.');
        await this.registerServing();
        console.log('[AppRouter]: CoreController registered.');
        this.registerViews();
        console.log('[AppRouter]: Views registered.');
        this.registerFallback();
        console.log('[AppRouter]: Fallback registered.');
    }

    private shuttingDown = false;

    public async handleShutdown(server: Server) {
        return async () => {
            if (this.shuttingDown) {
                console.log(`[Router]: Shutdown already in progress.`);
                return;
            }
            this.shuttingDown = true;

            console.log(`[Router]: Shutdown handler triggered.`);
            server.close(async (error) => {
                if (error) {
                    console.error(`[Router]: Error during server shutdown: ${error.message}`);
                    process.exit(1);
                }

                try {
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`[Router]: Shutting down VDS...`);
                        await this.coreController.getVDS().shutdownVDS();
                    }
                    console.log(`[Router]: Server shut down gracefully.`);
                    process.exit(0);
                } catch (shutdownError) {
                    console.error(`[Router]: Error shutting down ViteDevServer:`, shutdownError);
                    process.exit(1);
                }
            });
        };
    }

}
