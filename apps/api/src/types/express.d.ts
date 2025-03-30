import express from 'express';

declare module 'express' {
  export interface Router {
    get(path: string, ...handlers: express.RequestHandler[]): express.Router;
    post(path: string, ...handlers: express.RequestHandler[]): express.Router;
    put(path: string, ...handlers: express.RequestHandler[]): express.Router;
    delete(path: string, ...handlers: express.RequestHandler[]): express.Router;
  }
}