import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Request, Response } from 'express';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../entities/users.entity';
import { getAuthUserInfo } from '../utils/jwt.helper';

// App (customer) and CRM tokens are signed with the same secret, so LoginMiddleware alone lets a
// mechanic's app token through. This allows only tokens that belong to a CRM user.
@Injectable()
export class CrmUserMiddleware implements NestMiddleware {
    constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) { }

    public async use(req: Request, res: Response, next: Function) {
        const authInfo = await getAuthUserInfo(req.headers);
        const userId = authInfo?._id ? String(authInfo._id) : '';
        if (!userId || !Types.ObjectId.isValid(userId) || !(await this.userModel.exists({ _id: userId }))) {
            throw new ForbiddenException({ isError: true, message: 'Only CRM users can access this' });
        }
        next();
    }
}
