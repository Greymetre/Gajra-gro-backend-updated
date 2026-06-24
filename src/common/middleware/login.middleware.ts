import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { json } from 'body-parser'
@Injectable()
export class LoginMiddleware implements NestMiddleware {
    public async use(req: Request, res: Response, next: Function) {

         // ✅ Public routes (no auth required)
    const publicRoutes = [
      '/api/user/products/all',
      '/api/user/products',
      '/api/user/city/getStateCities',
      '/api/user/customers/all',
      '/api/user/setting/youtube-shorts',
    ];

    if (publicRoutes.some(route => req.originalUrl.startsWith(route))) {
      return next(); // 👈 skip authentication
    }
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) throw new UnauthorizedException({ isError: true, message: 'Login required' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            throw new UnauthorizedException({ isError: true, message: 'Login required' });
        }
        next(); 
      });
  }
}