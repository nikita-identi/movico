import app, { RequestHandler } from 'express';
import { Environment, MovicoApplication, ViewMap } from "./types";
import Controller from './Controller';
import AppRouter from './AppRouter';
import { InlineConfig } from 'vite';
import { testView } from '@views/test';


export default class Application {
    private application: MovicoApplication = app();

    private controllers: Controller[] = [];
    private viewMap: ViewMap = testView;

    private router: AppRouter;

    constructor(handlers: RequestHandler[] = [], customVDSConfig?: InlineConfig) {
        this.router = new AppRouter({ viewMap: this.viewMap, controllers: this.controllers, customVDSConfig });
        for (const handler of handlers) this.application.use(handler);
    }

    private getEnv(): Environment {
        return (process.env.NODE_ENV ?? 'development') as Environment;
    }

    public async start(applicationPort: number = 3000) {
        await this.router.initialize();
        this.application.use(this.router.getRouter());
        console.log(`[Application]: Running in ${this.getEnv()} mode`);

        const port = process.env.PORT ?? applicationPort;

        const server = this.application.listen(port, () => console.log(`Server is running on http://localhost:${port}`));

        const shutdownHandler = await this.router.handleShutdown(server);
        process.on('SIGINT', shutdownHandler);
        process.on('SIGTERM', shutdownHandler);
    }
}