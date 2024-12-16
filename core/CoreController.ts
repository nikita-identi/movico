import serveStatic from "serve-static";
import Controller from "./Controller";
import { InlineConfig } from "vite";
import { Router } from "express";
import { Route } from "./types";
import VDS from "./VDS";
import path from "path";

export class CoreController extends Controller {
    private template: string = '[NULL]';
    private customVDSConfig?: InlineConfig;
    private VDS: VDS;
    private routesInternal: Route[];

    constructor(router: Router, template: string, customVDSConfig?: InlineConfig) {
        super({ router });

        this.customVDSConfig = customVDSConfig;
        this.template = template;
        this.VDS = new VDS(this.template, this.customVDSConfig);

        this.routesInternal = [
            {
                handlers: [serveStatic(this.productionDist)],
                envScope: 'production',
                method: 'get',
                path: '*',
                errorFn: (error) => console.error('[Core]: Error serving in production: ', error),
                endpointFn: (_, res, next) => {
                    res.sendFile(this.productionEntryFile, (error) => {
                        if (error) {
                            console.error(`[Core]: Failed to serve index.html in production: ${error.message}`);
                            next(error);
                        }
                    });
                },
            },
            {
                handlers: [
                    async (req, _, next) => { console.log(`[CoreController]: Development Middleware: Serving ${req.url}`); next() },
                    this.VDS.getMiddleware()
                ],
                envScope: 'development',
                method: 'get',
                path: '*',
                endpointFn: async (req, res, next) => {
                    const { originalUrl: targetURL } = req;
                    try {
                        console.log(`[CoreController]: Transforming template for ${targetURL}`);
                        const template = await this.VDS.transformTemplate(targetURL);
                        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
                    } catch (error) {
                        console.error(`[CoreController]: Error serving development template:`, error);
                        next(error);
                    }
                },
            }
        ];
    }

    get routes(): Route[] { return this.routesInternal }

    private readonly productionDist: string = path.resolve(process.cwd(), 'dist');
    private readonly productionEntryFile: string = path.resolve(this.productionDist, 'index.html');

    public getVDS() { return this.VDS }
}
