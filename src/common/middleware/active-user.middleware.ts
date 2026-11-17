import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../entities/users.entity';

const CACHE_MS = 30 * 1000;
export const INACTIVE_USER_MESSAGE = 'Your account is inactive. Please contact the admin.';

// A CRM user set to Inactive is logged out on the next request, even with a token issued before.
// Tokens that are not CRM users (app / customer tokens) are left to the route's own checks.
@Injectable()
export class ActiveUserMiddleware implements NestMiddleware {
    private static cache = new Map<string, { active: boolean; at: number }>();

    constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) { }

    // called when a user's status changes so it applies at once instead of after the cache time
    static forget(userId: string) {
        ActiveUserMiddleware.cache.delete(String(userId));
    }

    public async use(req: Request, res: Response, next: Function) {
        const authHeader = req.headers['authorization'];
        const token = typeof authHeader === 'string' ? authHeader.split(' ')[1] : '';
        if (!token) return next();
        let userId = '';
        try {
            const payload: any = jwt.verify(token, process.env.JWT_SECRET);
            userId = payload?._id ? String(payload._id) : '';
        } catch {
            return next(); // invalid token: LoginMiddleware answers
        }
        if (!userId || !Types.ObjectId.isValid(userId)) return next();

        const cached = ActiveUserMiddleware.cache.get(userId);
        let active: boolean | null = cached && Date.now() - cached.at < CACHE_MS ? cached.active : null;
        if (active === null) {
            const user = await this.userModel.findById(userId, { active: 1 }).lean();
            if (!user) return next(); // not a CRM user
            active = (user as any).active === true;
            ActiveUserMiddleware.cache.set(userId, { active, at: Date.now() });
        }
        if (!active) throw new UnauthorizedException({ isError: true, message: INACTIVE_USER_MESSAGE });
        next();
    }
}
