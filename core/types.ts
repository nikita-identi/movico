import { Application, NextFunction, Request, RequestHandler, Response, Router } from "express";
import Service from "./Service";
import Controller from "./Controller";
import { InlineConfig } from "vite";
import { ComponentType, ReactNode } from "react";

export interface MovicoApplication extends Application {
    response: Response;
    request: Request;
}

export type RequestMethod = ('get' | 'post' | 'put' | 'patch' | 'delete' | 'options') & keyof Router;
export type Environment = 'development' | 'production';

export type EndpointFunction = (request: Request, response: Response, next: NextFunction) => void | Promise<void>;

export interface Route {
    method: RequestMethod;
    path: string;

    errorFn?: (error: unknown, request: Request, response: Response, next: NextFunction) => void | Promise<void>;
    validationFn?: (req: Request) => void | Promise<void>;
    shouldRegister?: () => boolean | Promise<boolean>;
    endpointFn: EndpointFunction;

    handlers?: (RequestHandler | Promise<RequestHandler>)[];

    envScope?: Environment;
}

export interface ControllerInit<TargetService extends Service> {
    service?: TargetService;
    router: Router;
}

export interface RouterInit {
    customVDSConfig?: InlineConfig;
    controllers: Controller[];
    viewMap: ViewMap;
}

export type ViewMap = Record<string, ComponentType>;